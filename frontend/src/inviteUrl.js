/**
 * Shareable deep link so a friend can open the app and auto-join the same match.
 * Example: https://yoursite.com/?join=<match_id>
 */

export function buildInviteUrl(matchId) {
  const u = new URL(window.location.href);
  u.searchParams.set("join", matchId);
  return u.toString();
}

/** After hosting creates a room — put ?join= in the bar so copy-from-address-bar works too. */
export function setJoinInAddressBar(matchId) {
  const u = new URL(window.location.href);
  u.searchParams.set("join", matchId);
  window.history.replaceState({}, "", u);
}

/** Remove ?join= after joining or when leaving the match. */
export function clearJoinFromAddressBar() {
  const u = new URL(window.location.href);
  if (!u.searchParams.has("join")) return;
  u.searchParams.delete("join");
  const q = u.searchParams.toString();
  window.history.replaceState(
    {},
    "",
    q ? `${u.pathname}?${q}` : u.pathname,
  );
}
