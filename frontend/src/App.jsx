import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectNakama,
  decodeMatchData,
  joinMatchFromMatchmaker,
} from "./nakama";
import {
  clearJoinFromAddressBar,
  setJoinInAddressBar,
} from "./inviteUrl.js";
import { useGameStore } from "./store";
import MatchLobby from "./components/MatchLobby.jsx";
import Game from "./Game.jsx";
import LeaderboardPanel from "./components/LeaderboardPanel.jsx";
import "./App.css";

export default function App() {
  const socketRef = useRef(null);
  const clientRef = useRef(null);
  const sessionRef = useRef(null);
  /** When true, socket closed due to effect cleanup — do not set status to idle (StrictMode / remount race). */
  const setNakama = useGameStore((s) => s.setNakama);
  const setConnectionStatus = useGameStore((s) => s.setConnectionStatus);
  const setError = useGameStore((s) => s.setError);
  const setMatchId = useGameStore((s) => s.setMatchId);
  const setInviteFriendRoom = useGameStore((s) => s.setInviteFriendRoom);
  const setGameState = useGameStore((s) => s.setGameState);
  const setLeaderboard = useGameStore((s) => s.setLeaderboard);
  const setMyStats = useGameStore((s) => s.setMyStats);
  const resetMatch = useGameStore((s) => s.resetMatch);

  const matchId = useGameStore((s) => s.matchId);
  const gameMode = useGameStore((s) => s.gameMode);
  const [openMatches, setOpenMatches] = useState([]);

  const loadLeaderboard = useCallback(async () => {
    const client = clientRef.current;
    const session = sessionRef.current;
    if (!client || !session) return;
    try {
      const res = await client.listLeaderboardRecords(
        session,
        "tictactoe_wins",
        undefined,
        10,
      );
      setLeaderboard(res.records ?? []);
    } catch {
      setLeaderboard([]);
    }
  }, [setLeaderboard]);

  const loadMyStats = useCallback(async () => {
    const client = clientRef.current;
    const session = sessionRef.current;
    if (!client || !session) return;
    try {
      const res = await client.rpc(session, "get_my_stats", {});
      setMyStats(res.payload ?? null);
    } catch {
      setMyStats(null);
    }
  }, [setMyStats]);

  /** One control in the sidebar: Nakama leaderboard + your storage stats. */
  const refreshLeaderboardAndStats = useCallback(async () => {
    await loadLeaderboard();
    await loadMyStats();
  }, [loadLeaderboard, loadMyStats]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setConnectionStatus("connecting");
      setError(null);
      try {
        const { client, socket, session } = await connectNakama();
        if (cancelled) {
          socket.ondisconnect = () => {};
          socket.disconnect(false);
          return;
        }

        clientRef.current = client;
        sessionRef.current = session;
        socketRef.current = socket;
        setNakama({ client, socket, session });

        socket.onmatchdata = (msg) => {
          const state = decodeMatchData(msg.data);
          setGameState(state);
        };

        socket.onmatchmakermatched = async (matched) => {
          try {
            const match = await joinMatchFromMatchmaker(socket, matched);
            setInviteFriendRoom(false);
            setMatchId(match.match_id);
            setConnectionStatus("ready");
          } catch (e) {
            setError(e?.message ?? String(e));
            setConnectionStatus("ready");
          }
        };

        socket.ondisconnect = () => {
          setConnectionStatus("idle");
          setError("Disconnected from server");
          resetMatch();
        };

        setConnectionStatus("ready");

        if (!cancelled) await loadLeaderboard();
        if (!cancelled) await loadMyStats();

        const joinFromLink = new URLSearchParams(window.location.search).get(
          "join",
        );
        if (joinFromLink && !cancelled) {
          setConnectionStatus("queued");
          setError(null);
          try {
            const joined = await socket.joinMatch(joinFromLink);
            setInviteFriendRoom(false);
            setMatchId(joined.match_id);
            setConnectionStatus("ready");
            clearJoinFromAddressBar();
          } catch (joinErr) {
            setError(joinErr?.message ?? String(joinErr));
            setConnectionStatus("ready");
            clearJoinFromAddressBar();
          }
        }
      } catch (e) {
        setError(e?.message ?? String(e));
        setConnectionStatus("idle");
      }
    }

    run();

    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.ondisconnect = () => {};
        s.disconnect(false);
      }
      socketRef.current = null;
      clientRef.current = null;
      sessionRef.current = null;
    };
  }, [
    resetMatch,
    setConnectionStatus,
    setError,
    setGameState,
    loadLeaderboard,
    loadMyStats,
    setMatchId,
    setNakama,
  ]);

  const findMatch = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket) return;
    setError(null);
    setConnectionStatus("queued");
    try {
      const query =
        gameMode === "timed"
          ? "+properties.mode:timed"
          : "+properties.mode:classic";
      await socket.addMatchmaker(query, 2, 2, { mode: gameMode }, {});
    } catch (e) {
      setError(e?.message ?? String(e));
      setConnectionStatus("ready");
    }
  }, [gameMode, setConnectionStatus, setError]);

  const createRoom = useCallback(async () => {
    const client = clientRef.current;
    const session = sessionRef.current;
    const socket = socketRef.current;
    if (!client || !session || !socket) return;
    setError(null);
    setConnectionStatus("queued");
    try {
      const res = await client.rpc(session, "create_tictactoe_match", {
        mode: gameMode,
      });
      const mid = res.payload?.match_id;
      if (!mid) throw new Error("Server did not return match_id");
      const match = await socket.joinMatch(mid);
      setInviteFriendRoom(gameMode === "classic");
      setMatchId(match.match_id);
      setJoinInAddressBar(match.match_id);
      setConnectionStatus("ready");
    } catch (e) {
      setError(e?.message ?? String(e));
      setConnectionStatus("ready");
    }
  }, [
    gameMode,
    setConnectionStatus,
    setError,
    setInviteFriendRoom,
    setMatchId,
  ]);

  const refreshOpenMatches = useCallback(async () => {
    const client = clientRef.current;
    const session = sessionRef.current;
    if (!client || !session) return;
    try {
      const list = await client.listMatches(session, 20, true, "", 1, 1);
      const raw = list.matches ?? [];
      const filtered = raw.filter(
        (m) => m.authoritative && m.handler_name === "tic-tac-toe",
      );
      setOpenMatches(filtered);
    } catch {
      setOpenMatches([]);
    }
  }, []);

  const joinRoomById = useCallback(
    async (matchIdToJoin) => {
      const socket = socketRef.current;
      if (!socket) return;
      setError(null);
      setConnectionStatus("queued");
      try {
        const match = await socket.joinMatch(matchIdToJoin);
        setInviteFriendRoom(false);
        setMatchId(match.match_id);
        clearJoinFromAddressBar();
        setConnectionStatus("ready");
      } catch (e) {
        setError(e?.message ?? String(e));
        setConnectionStatus("ready");
      }
    },
    [setConnectionStatus, setError, setInviteFriendRoom, setMatchId],
  );

  const leaveMatch = useCallback(async () => {
    const socket = socketRef.current;
    const mid = useGameStore.getState().matchId;
    if (socket && mid) {
      try {
        await socket.leaveMatch(mid);
      } catch {
        /* ignore */
      }
    }
    resetMatch();
    clearJoinFromAddressBar();
    setOpenMatches([]);
    setConnectionStatus("ready");
    loadMyStats();
    loadLeaderboard();
  }, [loadLeaderboard, loadMyStats, resetMatch, setConnectionStatus]);

  const makeMove = useCallback(async (index) => {
    const socket = socketRef.current;
    const mid = useGameStore.getState().matchId;
    if (!socket || !mid) return;
    await socket.sendMatchState(mid, 1, JSON.stringify({ index }));
  }, []);

  return (
    <div className="app-shell">
      <main className="main">
        {!matchId ? (
          <MatchLobby
            onFindMatch={findMatch}
            onCreateRoom={createRoom}
            onRefreshOpenMatches={refreshOpenMatches}
            onJoinRoom={joinRoomById}
            openMatches={openMatches}
          />
        ) : (
          <Game onMove={makeMove} onLeave={leaveMatch} />
        )}
      </main>
      <LeaderboardPanel onRefresh={refreshLeaderboardAndStats} />
    </div>
  );
}
