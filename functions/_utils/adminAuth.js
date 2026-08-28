// Az admin-bejelentkezés SZÁNDÉKOSAN teljesen elválasztva él a viszonteladói
// auth-rendszertől (külön session-tábla, külön cookie) - egy hibásan
// beállított vagy feltört viszonteladó-fiók így sosem juthat admin-joghoz.
import { parseCookies } from "./auth.js";

const ADMIN_COOKIE_NAME = "wc_admin_session";

export async function getAdminSession(request, db) {
  const cookies = parseCookies(request);
  const token = cookies[ADMIN_COOKIE_NAME];
  if (!token) return null;
  const row = await db.prepare("SELECT token, lejar FROM admin_sessions WHERE token = ?").bind(token).first();
  if (!row) return null;
  if (new Date(row.lejar).getTime() < Date.now()) return null;
  return row;
}

export function adminSessionCookie(token, maxAgeSeconds) {
  return `${ADMIN_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function clearAdminSessionCookie() {
  return `${ADMIN_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
