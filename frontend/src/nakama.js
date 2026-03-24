import { Client } from "@heroiclabs/nakama-js";

function getOrCreateDeviceId() {
  const key = "ttt_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
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
