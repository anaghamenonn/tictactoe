/**
 * Server-authoritative Tic-Tac-Toe for Nakama.
 * - Validates moves (correct player, empty cell, game not over)
 * - Matchmaking creates matches via registerMatchmakerMatched
 */

function getSenderId(msg) {
  if (!msg || !msg.sender) return null;
  return msg.sender.userId || msg.sender.user_id || null;
}

function isBoardFull(board) {
  for (var i = 0; i < board.length; i++) {
    if (board[i] === "") return false;
  }
  return true;
}

function checkWinner(board) {
  var wins = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (var i = 0; i < wins.length; i++) {
    var line = wins[i];
    var a = line[0];
    var b = line[1];
    var c = line[2];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function symbolForUser(state, userId) {
  if (state.playerXId === userId) return "X";
  if (state.playerOId === userId) return "O";
  return null;
}

/** Nakama may pass match init params as a plain object or (in edge cases) a JSON string. */
function normalizeModeFromParams(params) {
  var raw = params;
  if (typeof raw === "string" && raw.length > 0) {
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      return "classic";
    }
  }
  if (!raw || typeof raw !== "object") return "classic";
  var m = raw.mode != null ? String(raw.mode) : "";
  return m === "timed" ? "timed" : "classic";
}

/**
 * How this match was created. Use string values only — Nakama matchCreate params are
 * typically map[string] string; booleans may not reach matchInit reliably.
 * @returns {"invite" | "matchmaker"}
 */
function normalizeInviteSourceFromParams(params) {
  var raw = params;
  if (typeof raw === "string" && raw.length > 0) {
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      return "matchmaker";
    }
  }
  if (!raw || typeof raw !== "object") return "matchmaker";
  var s = raw.inviteSource != null ? String(raw.inviteSource) : "";
  if (s === "invite") return "invite";
  return "matchmaker";
}

function parseRpcPayload(payload) {
  if (payload == null || payload === "") return {};
  if (typeof payload === "object") return payload;
  try {
    return JSON.parse(String(payload));
  } catch (e2) {
    return {};
  }
}

var matchInit = function (ctx, logger, nk, params) {
  var mode = normalizeModeFromParams(params);
  var inviteSource = normalizeInviteSourceFromParams(params);

  return {
    state: {
      board: ["", "", "", "", "", "", "", "", ""],
      playerXId: null,
      playerOId: null,
      turn: "X",
      winner: null,
      winnerUserId: null,
      endReason: null,
      phase: "waiting",
      mode: mode,
      inviteSource: inviteSource,
      secondsLeft: 0,
      statsWritten: false,
    },
    label: JSON.stringify({
      mode: mode,
      open: true,
      inviteSource: inviteSource
    }),
    tickRate: 1,
  };
};

var matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  if (presence.userId === state.playerXId || presence.userId === state.playerOId) {
    return { state: state, accept: true };
  }
  if (state.playerXId !== null && state.playerOId !== null) {
    return { state: state, accept: false, rejectMessage: "Match is full" };
  }
  return { state: state, accept: true };
};

var matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
  presences.forEach(function (p) {
    if (state.playerXId === null) {
      state.playerXId = p.userId;
    } else if (state.playerOId === null && p.userId !== state.playerXId) {
      state.playerOId = p.userId;
    }
  });

  if (state.playerXId && state.playerOId) {
    state.phase = "playing";
    if (state.mode === "timed") {
      // Always reset timer to 30s when both players are present and phase is playing
      state.secondsLeft = 30;
    }
  }

  dispatcher.broadcastMessage(1, JSON.stringify(state));
  return { state: state };
};

function decodeMatchData(data) {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data === "string") {
    return JSON.parse(data);
  }
  var bytes = new Uint8Array(data);
  var s = "";
  for (var i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return JSON.parse(s);
}

var matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
  var dirty = false;
  var movedThisTick = false;

  messages.forEach(function (msg) {
    var data = decodeMatchData(msg.data);
    if (!data || data.index === undefined || data.index === null) return;

    var senderId = getSenderId(msg);
    if (!senderId || state.phase !== "playing" || state.winner) return;

    var index = data.index | 0;
    if (index < 0 || index > 8) return;

    var mustBe = state.turn;
    var senderSymbol = symbolForUser(state, senderId);
    if (!senderSymbol || senderSymbol !== mustBe) return;

    if (state.board[index] !== "") return;

    state.board[index] = state.turn;
    state.turn = state.turn === "X" ? "O" : "X";

    var w = checkWinner(state.board);
    if (w) {
      state.winner = w;
      state.winnerUserId = w === "X" ? state.playerXId : state.playerOId;
      state.endReason = "line";
      state.phase = "finished";
    } else if (isBoardFull(state.board)) {
      state.winner = null;
      state.winnerUserId = null;
      state.endReason = "draw";
      state.phase = "finished";
    } else if (state.mode === "timed") {
      state.secondsLeft = 30;
    }

    movedThisTick = true;
    dirty = true;
  });

  if (
    state.mode === "timed" &&
    state.phase === "playing" &&
    !state.winner &&
    state.playerXId &&
    state.playerOId &&
    !movedThisTick
  ) {
    if (state.secondsLeft > 0) {
      state.secondsLeft -= 1;
    }
    if (state.secondsLeft <= 0) {
      state.winner = state.turn === "X" ? "O" : "X";
      state.winnerUserId = state.turn === "X" ? state.playerOId : state.playerXId;
      state.endReason = "timeout";
      state.phase = "finished";
    }
    dirty = true;
  }

  if (state.phase === "finished" && !state.statsWritten) {
    try {
      var players = [state.playerXId, state.playerOId];
      for (var pi = 0; pi < players.length; pi++) {
        var userId = players[pi];
        if (!userId) continue;

        var records = nk.storageRead([
          {
            collection: "stats",
            key: "user_stats",
            userId: userId,
          },
        ]);

        var stats =
          records.length > 0
            ? records[0].value
            : { wins: 0, losses: 0, streak: 0, bestStreak: 0 };

        var isWinner = userId === state.winnerUserId;

        if (state.endReason === "draw") {
          stats.streak = 0;
        } else if (isWinner) {
          stats.wins += 1;
          stats.streak += 1;
          stats.bestStreak =
            stats.bestStreak > stats.streak ? stats.bestStreak : stats.streak;
          nk.leaderboardRecordWrite("tictactoe_wins", userId, "", 1, 0, {});
        } else {
          stats.losses += 1;
          stats.streak = 0;
        }

        nk.storageWrite([
          {
            collection: "stats",
            key: "user_stats",
            userId: userId,
            value: stats,
          },
        ]);
      }

      state.statsWritten = true;
      dirty = true;
    } catch (e) {
      logger.error("stats write failed: %s", String(e));
    }
  }

  if (dirty) {
    dispatcher.broadcastMessage(1, JSON.stringify(state));
  }
  return { state: state };
};

var matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
  presences.forEach(function (p) {
    if (state.phase === "playing" && !state.winner) {
      if (p.userId === state.playerXId && state.playerOId) {
        state.winner = "O";
        state.winnerUserId = state.playerOId;
        state.endReason = "forfeit";
        state.phase = "finished";
      } else if (p.userId === state.playerOId && state.playerXId) {
        state.winner = "X";
        state.winnerUserId = state.playerXId;
        state.endReason = "forfeit";
        state.phase = "finished";
      }
    }
  }
  );

  dispatcher.broadcastMessage(1, JSON.stringify(state));
  return { state: state };
};

var matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  return { state: state };
};

var matchSignal = function (ctx, logger, nk, dispatcher, tick, state, data) {
  return { state: state, data: "" };
};

/**
 * Nakama passes one object per matched ticket: { presence, properties }.
 * `properties` merges string_properties + numeric_properties from the ticket (runtime_javascript.go).
 */
function modeFromMatchmakerEntries(entries) {
  if (!entries) return "classic";
  var len = entries.length;
  if (typeof len !== "number" || len < 1) return "classic";
  for (var i = 0; i < len; i++) {
    try {
      var e = entries[i];
      if (!e) continue;
      var props = e.properties;
      if (!props) continue;
      var raw = props.mode;
      if (raw == null || raw === "") continue;
      var m = String(raw).trim().toLowerCase();
      if (m === "timed") return "timed";
    } catch (e0) {
      /* ignore bad entries */
    }
  }
  return "classic";
}

var matchmakerMatched = function (ctx, logger, nk, matches) {
  var mode = modeFromMatchmakerEntries(matches);
  return nk.matchCreate("tic-tac-toe", {
    mode: mode,
    inviteSource: "matchmaker"
  });
};

/** Create an authoritative match (room) with the chosen mode; client joins with returned match_id. */
var rpcCreateTictactoeMatch = function (ctx, logger, nk, payload) {
  var mode = "classic";
  try {
    var p = parseRpcPayload(payload);
    mode = p.mode === "timed" ? "timed" : "classic";
  } catch (e0) {
    logger.error("create match parse: %s", String(e0));
  }
  var matchId = nk.matchCreate("tic-tac-toe", {
    mode: mode,
    inviteSource: "invite"
  });
  return JSON.stringify({ match_id: matchId, mode: mode });
};

/** Read current user's tic-tac-toe stats from storage (wins / losses / streaks). */
var rpcGetMyStats = function (ctx, logger, nk, payload) {
  var userId = ctx.userId;
  if (!userId) {
    return JSON.stringify({ wins: 0, losses: 0, streak: 0, bestStreak: 0 });
  }
  try {
    var rec = nk.storageRead([
      { collection: "stats", key: "user_stats", userId: userId },
    ]);
    if (!rec || rec.length === 0) {
      return JSON.stringify({ wins: 0, losses: 0, streak: 0, bestStreak: 0 });
    }
    return JSON.stringify(rec[0].value);
  } catch (e) {
    logger.error("get stats failed: %s", String(e));
    return JSON.stringify({ wins: 0, losses: 0, streak: 0, bestStreak: 0 });
  }
};

var InitModule = function (ctx, logger, nk, initializer) {
  initializer.registerRpc("create_tictactoe_match", rpcCreateTictactoeMatch);
  initializer.registerRpc("get_my_stats", rpcGetMyStats);
  initializer.registerMatchmakerMatched(matchmakerMatched);

  initializer.registerMatch("tic-tac-toe", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLoop: matchLoop,
    matchLeave: matchLeave,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal,
  });

  try {
    nk.leaderboardCreate("tictactoe_wins", false, "desc", "incr", "", {});
  } catch (e) {
    logger.info("leaderboard create skipped: %s", String(e));
  }

  logger.info("Tic-tac-toe module registered (matchmaker + match handler)");
};
