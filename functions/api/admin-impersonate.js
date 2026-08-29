import { getAdminSession } from "../_utils/adminAuth.js";
import { newSessionToken, sessionCookie } from "../_utils/auth.js";

// Rövid élettartam, mert ez egy admin-eszköz (support/debug célra), nem
// valódi bejelentkezés - ha nyitva marad egy böngészőfülön, magától lejár.
const IMPERSONATION_MAX_AGE = 60 * 60 * 2;

export async function onRequestPost(context) {
  const { request, env } = context;
  const session = await getAdminSession(request, env.DB);
  if (!session) return Response.redirect(new URL("/admin/login", request.url).href, 303);

  const formData = await request.formData();
  const viszonteladoId = parseInt((formData.get("viszontelado_id") || "").toString(), 10);
  if (!viszonteladoId) return Response.redirect(new URL("/admin/viszonteladok", request.url).href, 303);

  const reseller = await env.DB.prepare("SELECT id FROM viszontelado WHERE id = ?").bind(viszonteladoId).first();
  if (!reseller) return Response.redirect(new URL("/admin/viszonteladok", request.url).href, 303);

  const token = newSessionToken();
  const lejar = new Date(Date.now() + IMPERSONATION_MAX_AGE * 1000).toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (token, viszontelado_id, lejar, admin_impersonalt) VALUES (?, ?, ?, 1)"
  )
    .bind(token, viszonteladoId, lejar)
    .run();

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/partner/dashboard", request.url).href,
      "Set-Cookie": sessionCookie(token, IMPERSONATION_MAX_AGE),
    },
  });
}
