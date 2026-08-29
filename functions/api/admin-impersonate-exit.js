import { parseCookies, clearSessionCookie } from "../_utils/auth.js";

// A wc_admin_session cookie-t ez SOSEM érinti (külön cookie, külön tábla) -
// az admin-session végig érvényben marad, amíg a viszonteladói impersonation
// sessiönt itt lezárjuk, ezért a kilépés után az admin visszakerül a panelbe
// anélkül, hogy újra be kellene jelentkeznie.
export async function onRequestPost(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  const token = cookies["wc_session"];
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ? AND admin_impersonalt = 1").bind(token).run();
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/admin/viszonteladok", request.url).href,
      "Set-Cookie": clearSessionCookie(),
    },
  });
}
