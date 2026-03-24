import { Client } from "@heroiclabs/nakama-js";

/**
 * Nakama device id for authenticateDevice.
 *
 * localStorage alone is shared across all tabs in the same profile, so every tab
 * would log in as the same user. The match server assigns X then O only for *two
 * different* user IDs (see matchJoin in nakama/modules/index.js). Two tabs with
 * the same user never fill playerOId — both clients still map to X and stay in
 * "waiting".
 *
 * sessionStorage is per-tab in Chromium, so we suffix a tab-scoped id to get a
 * distinct Nakama account per tab while keeping the same tab stable across refresh.
 */
function getOrCreateDeviceId() {
  const storageKey = "ttt_device_id";
  let base = localStorage.getItem(storageKey);
  if (!base) {
    base = crypto.randomUUID();
    localStorage.setItem(storageKey, base);
  }
  const tabKey = "ttt_tab_instance";
  let tab = sessionStorage.getItem(tabKey);
  if (!tab) {
    tab = crypto.randomUUID();
    sessionStorage.setItem(tabKey, tab);
  }
  return `${base}:${tab}`;
}

export function getNakamaConfig() {
  return {
    serverKey: import.meta.env.VITE_NAKAMA_SERVER_KEY || "defaultkey",
    host: import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1",
    port: String(import.meta.env.VITE_NAKAMA_PORT || "7350"),
    useSSL: import.meta.env.VITE_NAKAMA_USE_SSL === "true",
  };
}

/**
 * Creates client, authenticates with stable device id, opens realtime socket.
 */
export async function connectNakama() {
  const { serverKey, host, port, useSSL } = getNakamaConfig();
  const client = new Client(serverKey, host, port, useSSL);
  const session = await client.authenticateDevice(getOrCreateDeviceId(), true);
  const socket = client.createSocket(useSSL, false);
  await socket.connect(session, false);
  return { client, socket, session };
}

export function decodeMatchData(data) {
  if (!data) return null;
  if (typeof data === "string") return JSON.parse(data);
  const text = new TextDecoder().decode(data);
  return JSON.parse(text);
}

/**
 * Authoritative matches (nk.matchCreate in registerMatchmakerMatched) expose
 * `match_id` for JoinMatch. Relayed matches use `token`. Join with whichever is present.
 */
export async function joinMatchFromMatchmaker(socket, matched) {
  const matchId = matched.match_id || matched.matchId;
  const token = matched.token;
  if (matchId) {
    return socket.joinMatch(matchId);
  }
  if (token) {
    return socket.joinMatch(undefined, token);
  }
  throw new Error("Matchmaker result missing match_id and token");
}
