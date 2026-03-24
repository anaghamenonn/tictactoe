import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

function burstConfetti() {
  const end = Date.now() + 2200;
  const colors = ["#a855f7", "#38bdf8", "#f472b6", "#fbbf24"];

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.65 },
      colors,
      ticks: 200,
      gravity: 1.1,
      scalar: 1.05,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.65 },
      colors,
      ticks: 200,
      gravity: 1.1,
      scalar: 1.05,
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.58 },
    colors,
    ticks: 300,
    gravity: 0.9,
    scalar: 1,
  });
  frame();
}

function reasonSubtitle(endReason, outcome) {
  if (outcome === "ended") return "The match has ended.";
  if (outcome === "draw") return "The grid is full — nobody takes the crown this time.";
  if (endReason === "forfeit") {
    return outcome === "win"
      ? "Your opponent left the match."
      : "The match ended when a player left.";
  }
  if (endReason === "timeout") {
    return outcome === "win"
      ? "Your opponent ran out of time."
      : "The clock beat you on that turn.";
  }
  return outcome === "win"
    ? "You lined up three in a row."
    : "Your opponent sealed three in a row.";
}

/**
 * @param {"win" | "lose" | "draw" | "ended"} outcome
 */
export default function GameOverModal({ outcome, endReason, onBackToLobby }) {
  const firedConfetti = useRef(false);

  useEffect(() => {
    if (outcome !== "win" || firedConfetti.current) return;
    firedConfetti.current = true;
    requestAnimationFrame(() => burstConfetti());
  }, [outcome]);

  const title =
    outcome === "win"
      ? "You won!"
      : outcome === "lose"
        ? "You lose"
        : outcome === "draw"
          ? "It's a draw"
          : "Game over";

  const emoji =
    outcome === "win"
      ? "🏆"
      : outcome === "lose"
        ? "💔"
        : outcome === "draw"
          ? "🤝"
          : "🎮";

  return (
    <div className="game-over-backdrop" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
      <div className={`game-over-card outcome-${outcome}`}>
        <div className="game-over-emoji" aria-hidden="true">
          {emoji}
        </div>
        <h2 id="game-over-title" className="game-over-title">
          {title}
        </h2>
        <p className="game-over-sub">{reasonSubtitle(endReason, outcome)}</p>
        <button type="button" className="game-over-cta" onClick={onBackToLobby}>
          Back to lobby
        </button>
      </div>
    </div>
  );
}
