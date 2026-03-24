import { useGameStore } from "../store";

function parseRoomLabel(label) {
  if (!label) return null;
  try {
    return JSON.parse(label);
  } catch {
    return null;
  }
}

export default function MatchLobby({
  onFindMatch,
  onCreateRoom,
  onRefreshOpenMatches,
  onJoinRoom,
  openMatches,
}) {
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const gameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const error = useGameStore((s) => s.error);

  const busy =
    connectionStatus === "connecting" || connectionStatus === "queued";
  const online = connectionStatus === "ready" || connectionStatus === "queued";

  return (
    <section className="panel lobby">
      <h1 className="title">Tic-Tac-Toe</h1>
      <p className="subtitle">Server-authoritative multiplayer via Nakama</p>

      <div className="mode-row" role="group" aria-label="Game mode">
        <button
          type="button"
          className={`mode-btn ${gameMode === "classic" ? "active" : ""}`}
          onClick={() => setGameMode("classic")}
          disabled={busy}
        >
          Classic
        </button>
        <button
          type="button"
          className={`mode-btn ${gameMode === "timed" ? "active" : ""}`}
          onClick={() => setGameMode("timed")}
          disabled={busy}
        >
          Timed (30s / turn)
        </button>
      </div>

      <p className="section-label">Matchmaking</p>
      <button
        type="button"
        className="primary"
        onClick={onFindMatch}
        disabled={busy || connectionStatus !== "ready"}
      >
        {connectionStatus === "queued"
          ? "Finding opponent…"
          : "Find match"}
      </button>

      <div className="section-label-row">
        <p className="section-label">Rooms</p>
        <button
          type="button"
          className="btn-icon-refresh"
          onClick={onRefreshOpenMatches}
          disabled={!online || busy}
          title="Refresh list of waiting rooms"
          aria-label="Refresh list of waiting rooms"
        >
          ↻
        </button>
      </div>
      <div className="room-actions">
        <button
          type="button"
          className="secondary"
          onClick={onCreateRoom}
          disabled={busy || connectionStatus !== "ready"}
        >
          Create room (wait for friend)
        </button>
      </div>

      {openMatches.length > 0 ? (
        <ul className="room-list" aria-label="Open rooms">
          {openMatches.map((m) => {
            const meta = parseRoomLabel(m.label);
            const mode = meta?.mode ?? "?";
            return (
              <li key={m.match_id} className="room-row">
                <span className="mono small">{m.match_id?.slice(0, 8)}…</span>
                <span className="muted small">{mode}</span>
                <button
                  type="button"
                  className="ghost ghost-inline"
                  onClick={() => onJoinRoom(m.match_id)}
                  disabled={busy || connectionStatus !== "ready"}
                >
                  Join
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted small room-hint">
          No open rooms (size 1). Create one or refresh after someone opens a
          room.
        </p>
      )}

      {error ? <p className="error">{error}</p> : null}

      <p className="hint">
        Open a second browser tab or use another device pointed at the same
        server — for matchmaking, both players must pick the same mode. If you
        create a <strong>Classic</strong> room (wait for friend), use
        &quot;Copy invite link&quot; on the game screen (or the URL with{" "}
        <span className="mono">?join=…</span>) so your friend can open it and
        join. You can also tap ↻ next to Rooms to list waiting games, then
        Join.
      </p>
    </section>
  );
}
