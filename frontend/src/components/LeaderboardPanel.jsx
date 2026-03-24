import { useGameStore } from "../store";

export default function LeaderboardPanel({ onRefresh }) {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const myStats = useGameStore((s) => s.myStats);
  const connectionStatus = useGameStore((s) => s.connectionStatus);

  const online = connectionStatus === "ready" || connectionStatus === "queued";

  return (
    <aside className="panel side">
      <div className="lb-head">
        <h2>Leaderboard</h2>
        <button
          type="button"
          className="btn-icon-refresh"
          onClick={onRefresh}
          disabled={!online}
          title="Reload top players and your stats"
          aria-label="Reload top players and your stats"
        >
          ↻
        </button>
      </div>

      {myStats ? (
        <p className="lb-you">
          <span className="muted small">Your record</span>
          <br />
          <strong>
            {myStats.wins ?? 0}W — {myStats.losses ?? 0}L
          </strong>
          <span className="muted small">
            {" "}
            · Streak {myStats.streak ?? 0} · Best {myStats.bestStreak ?? 0}
          </span>
        </p>
      ) : (
        <p className="muted small lb-you-placeholder">
          Your wins/losses appear here after games.
        </p>
      )}

      {leaderboard.length > 0 ? (
        <>
          <p className="lb-section-label muted small">Top players</p>
          <ol className="lb-list">
            {leaderboard.map((row, idx) => (
              <li key={row.owner_id || idx}>
                <span className="lb-rank">{row.rank ?? idx + 1}</span>
                <span className="lb-name">
                  {row.username || row.owner_id?.slice(0, 8) || "—"}
                </span>
                <span className="lb-score">{row.score ?? 0} wins</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="muted small lb-empty-global">
          No global rankings yet — finish a decisive game to earn a win on the
          board.
        </p>
      )}
    </aside>
  );
}
