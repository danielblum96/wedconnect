import { parseCookies, clearSessionCookie } from "../_utils/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  const token = cookies["wc_session"];
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/partner/login", request.url).href,
      "Set-Cookie": clearSessionCookie(),
    },
  });
}
