import { parseCookies } from "../_utils/auth.js";
import { clearAdminSessionCookie } from "../_utils/adminAuth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  const token = cookies["wc_admin_session"];
  if (token) await env.DB.prepare("DELETE FROM admin_sessions WHERE token = ?").bind(token).run();

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/admin/login", request.url).href,
      "Set-Cookie": clearAdminSessionCookie(),
    },
  });
}
