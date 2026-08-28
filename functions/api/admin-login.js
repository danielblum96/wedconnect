import { verifyPassword, newSessionToken } from "../_utils/auth.js";
import { adminSessionCookie } from "../_utils/adminAuth.js";
import { checkRateLimit, clientIp } from "../_utils/rateLimit.js";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();
  const jelszo = (formData.get("jelszo") || "").toString();

  function backWithError(code) {
    return Response.redirect(`${new URL("/admin/login", request.url).href}?error=${code}`, 303);
  }

  const allowed = await checkRateLimit(env, `admin-login:${clientIp(request)}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SECONDS);
  if (!allowed) return backWithError("rate_limited");

  if (!jelszo) return backWithError("missing_fields");
  if (!env.ADMIN_PASSWORD_HASH) return backWithError("generic");

  const ok = await verifyPassword(jelszo, env.ADMIN_PASSWORD_HASH);
  if (!ok) return backWithError("invalid");

  const token = newSessionToken();
  const lejar = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  await env.DB.prepare("INSERT INTO admin_sessions (token, lejar) VALUES (?, ?)").bind(token, lejar).run();

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/admin/rendelesek", request.url).href,
      "Set-Cookie": adminSessionCookie(token, SESSION_MAX_AGE),
    },
  });
}
