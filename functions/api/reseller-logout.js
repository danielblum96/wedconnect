import { parseCookies, clearSessionCookie, loginHref } from "../_utils/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  const token = cookies["wc_session"];
  let fiokTipus = null;
  if (token) {
    const row = await env.DB.prepare(
      "SELECT v.fiok_tipus FROM sessions s JOIN viszontelado v ON v.id = s.viszontelado_id WHERE s.token = ?"
    )
      .bind(token)
      .first();
    fiokTipus = row ? row.fiok_tipus : null;
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(loginHref(fiokTipus), request.url).href,
      "Set-Cookie": clearSessionCookie(),
    },
  });
}
