import { useState } from "react";
import { useGameStore } from "./store";
import { buildInviteUrl } from "./inviteUrl.js";
import GameOverModal from "./components/GameOverModal.jsx";

function symbolForSession(gameState, userId) {
  if (!gameState || !userId) return null;
  if (gameState.playerXId === userId) return "X";
  if (gameState.playerOId === userId) return "O";
  return null;
}

/** @returns {"win" | "lose" | "draw" | "ended" | null} */
function getOutcome(gameState, userId) {
  if (!gameState || gameState.phase !== "finished") return null;
  if (gameState.endReason === "draw") return "draw";
  if (!userId || !gameState.winnerUserId) return "ended";
  return gameState.winnerUserId === userId ? "win" : "lose";
}

export default function Game({ onMove, onLeave }) {
  const [copiedInvite, setCopiedInvite] = useState(false);
  const session = useGameStore((s) => s.session);
  const matchId = useGameStore((s) => s.matchId);
  const inviteFriendRoom = useGameStore((s) => s.inviteFriendRoom);
  const gameState = useGameStore((s) => s.gameState);

  async function copyInviteLink() {
    if (!matchId) return;
    const url = buildInviteUrl(matchId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 2500);
    } catch {
      try {
        await navigator.clipboard.writeText(matchId);
        setCopiedInvite(true);
        window.setTimeout(() => setCopiedInvite(false), 2500);
      } catch {
        /* ignore */
      }
    }
  }

  if (!gameState) {
    return (
      <div className="panel">
        <p>Loading match…</p>
      </div>
    );
  }

  const mySymbol = symbolForSession(gameState, session?.user_id);
  const isPlaying = gameState.phase === "playing";
  const myTurn =
    isPlaying && mySymbol && gameState.turn === mySymbol;

  const outcome = getOutcome(gameState, session?.user_id);
  const showGameOver = outcome !== null;

  const isTimed = gameState.mode === "timed";
  const secondsLeft =
    typeof gameState.secondsLeft === "number"
      ? Math.max(0, gameState.secondsLeft)
      : 0;

  const statusLine = (() => {
    if (gameState.phase === "waiting") {
      return "Waiting for opponent to join…";
    }
    if (showGameOver) {
      return "Match finished";
    }
    if (myTurn) {
      return "Your turn";
    }
    return `Opponent's turn (${gameState.turn})`;
  })();

  const modeTitle = isTimed ? "Timed (30s per turn)" : "Classic";

  return (
    <section className="panel game game-wrap">
      {showGameOver ? (
        <GameOverModal
          outcome={outcome}
          endReason={gameState.endReason}
          onBackToLobby={onLeave}
        />
      ) : null}

      <div className="game-layout">
        <div className="game-main">
          <header className="game-head">
            <div>
              <p className="eyebrow">Match · {modeTitle}</p>
              <p className="mono small">{matchId}</p>
            </div>

            <button type="button" className="ghost ghost-inline" onClick={onLeave}>
              Leave
            </button>
          </header>

          <p className="status">{statusLine}</p>

          {gameState.phase === "waiting" && matchId && inviteFriendRoom ? (
            <div className="invite-box">
              <p className="invite-title">Invite a friend</p>
              <p className="invite-hint muted small">
                Copy the link and send it (chat, email). When they open it in a
                browser, they join this match automatically.
              </p>
              <div className="invite-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={copyInviteLink}
                >
                  {copiedInvite ? "Copied!" : "Copy invite link"}
                </button>
              </div>
              <p className="mono small invite-url-preview" title={buildInviteUrl(matchId)}>
                {buildInviteUrl(matchId)}
              </p>
            </div>
          ) : null}

          {mySymbol ? (
            <p className="you-are">
              You are <strong>{mySymbol}</strong>
            </p>
          ) : (
            <p className="you-are muted">Spectating / reconnecting…</p>
          )}

          <div
            className={`board ${showGameOver ? "board-dimmed" : ""}`}
            role="grid"
            aria-label="Tic tac toe board"
          >
            {gameState.board.map((cell, i) => (
              <button
                key={i}
                type="button"
                className={`cell ${cell ? `mark-${cell}` : ""}`}
                onClick={() => onMove(i)}
                disabled={!myTurn || cell !== "" || !isPlaying}
                aria-label={`Cell ${i + 1} ${cell || "empty"}`}
              >
                {cell}
              </button>
            ))}
          </div>
        </div>

        {isTimed && !showGameOver ? (
          <aside className="game-timer-aside" aria-live="polite">
            <p className="game-timer-label">Time left</p>
            {gameState.phase === "waiting" ? (
              <p className="game-timer-placeholder muted">Starts when both players are in</p>
            ) : (
              <p className="game-timer-value" aria-label={`${secondsLeft} seconds left this turn`}>
                {secondsLeft}
                <span className="game-timer-unit">s</span>
              </p>
            )}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
