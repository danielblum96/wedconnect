import { verifyPassword, newSessionToken, sessionCookie, dashboardHref } from "../_utils/auth.js";
import { checkRateLimit, clientIp } from "../_utils/rateLimit.js";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const jelszo = (formData.get("jelszo") || "").toString();
  // A /partner/login ÉS a /sajat/bejelentkezes UGYANEZT a végpontot hívja -
  // hiba esetén oda kell visszairányítani, ahonnan a kérés jött, hogy a
  // magánszemély sose lássa véletlenül a "Partner" oldalt.
  const redirectBack = (formData.get("redirect_back") || "/partner/login").toString();

  function backWithError(code) {
    return Response.redirect(`${new URL(redirectBack, request.url).href}?error=${code}`, 303);
  }

  const allowed = await checkRateLimit(
    env,
    `login:${clientIp(request)}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) return backWithError("rate_limited");

  if (!email || !jelszo) return backWithError("missing_fields");

  const user = await env.DB.prepare("SELECT id, jelszo_hash, allapot, fiok_tipus FROM viszontelado WHERE email = ?")
    .bind(email)
    .first();
  if (!user) return backWithError("invalid");

  const ok = await verifyPassword(jelszo, user.jelszo_hash);
  if (!ok) return backWithError("invalid");
  if (user.allapot !== "Aktív") return backWithError("suspended");

  const token = newSessionToken();
  const lejar = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, viszontelado_id, lejar) VALUES (?, ?, ?)")
    .bind(token, user.id, lejar)
    .run();

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(dashboardHref(user.fiok_tipus), request.url).href,
      "Set-Cookie": sessionCookie(token, SESSION_MAX_AGE),
    },
  });
}
