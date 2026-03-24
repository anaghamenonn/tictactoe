import { create } from "zustand";

/**
 * UI + Nakama handles. Game state comes from the server via onmatchdata only.
 */
export const useGameStore = create((set) => ({
  connectionStatus: "idle",
  error: null,

  client: null,
  socket: null,
  session: null,

  matchId: null,
  /** True only when this match was created via "Create room" with Classic mode — show invite-a-friend UI while waiting. */
  inviteFriendRoom: false,
  gameMode: "classic",

  /** Last authoritative snapshot from the match (JSON from server) */
  gameState: null,

  leaderboard: [],
  /** From RPC get_my_stats — wins, losses, streak, bestStreak */
  myStats: null,

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setError: (error) => set({ error }),

  setNakama: ({ client, socket, session }) =>
    set({ client, socket, session }),

  setMatchId: (matchId) => set({ matchId }),
  setInviteFriendRoom: (inviteFriendRoom) => set({ inviteFriendRoom }),
  setGameMode: (gameMode) => set({ gameMode }),

  setGameState: (gameState) => set({ gameState }),

  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setMyStats: (myStats) => set({ myStats }),

  resetMatch: () =>
    set({
      matchId: null,
      gameState: null,
      inviteFriendRoom: false,
    }),
}));
