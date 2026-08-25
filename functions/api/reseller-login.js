import { verifyPassword, newSessionToken, sessionCookie } from "../_utils/auth.js";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const jelszo = (formData.get("jelszo") || "").toString();

  function backWithError(code) {
    return Response.redirect(`${new URL("/partner/login", request.url).href}?error=${code}`, 303);
  }

  if (!email || !jelszo) return backWithError("missing_fields");

  const user = await env.DB.prepare("SELECT id, jelszo_hash, allapot FROM viszontelado WHERE email = ?")
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
      Location: new URL("/partner/dashboard", request.url).href,
      "Set-Cookie": sessionCookie(token, SESSION_MAX_AGE),
    },
  });
}
