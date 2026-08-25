import { hashPassword } from "../_utils/auth.js";
import { escapeHtml } from "../_utils/html.js";

function page({ valid, token, error }) {
  const errorMessages = {
    weak_password: "Das Passwort muss mindestens 8 Zeichen lang sein.",
    mismatch: "Die beiden Passwörter stimmen nicht überein.",
  };

  const body = valid
    ? `
      <h1>Neues Passwort festlegen</h1>
      ${error ? `<div class="error">${escapeHtml(errorMessages[error] || "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.")}</div>` : ""}
      <form method="POST" action="/partner/reset-password">
        <input type="hidden" name="token" value="${escapeHtml(token)}">
        <label for="jelszo">Neues Passwort</label>
        <input type="password" id="jelszo" name="jelszo" required autocomplete="new-password" minlength="8">
        <label for="jelszo2">Neues Passwort bestätigen</label>
        <input type="password" id="jelszo2" name="jelszo2" required autocomplete="new-password" minlength="8">
        <button type="submit">Passwort speichern</button>
      </form>`
    : `
      <h1>Link ungültig oder abgelaufen</h1>
      <p class="hint">Dieser Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.</p>
      <a class="btn-link" href="/partner/forgot-password">Neuen Link anfordern</a>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Passwort zurücksetzen — WedConnect</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --bg:#faf7f2; --fg:#2b2620; --muted:#7a7266; --accent:#b48b56; --card-bg:#ffffff; --error:#b1451f; }
  * { box-sizing: border-box; }
  html, body { margin:0; min-height:100%; }
  body { font-family:"Poppins",sans-serif; background:var(--bg); color:var(--fg); display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { background:var(--card-bg); max-width:420px; width:100%; padding:40px 36px; border-radius:12px; box-shadow:0 20px 50px -20px rgba(0,0,0,0.15); text-align:center; }
  .brand { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.6rem; margin-bottom:6px; }
  .brand span { color:var(--accent); }
  h1 { font-size:1rem; font-weight:500; color:var(--muted); margin:0 0 24px; }
  label { display:block; font-size:0.85rem; font-weight:500; margin-bottom:6px; text-align:left; }
  input { width:100%; padding:11px 14px; border:1px solid #ddd6c9; border-radius:8px; font-family:inherit; font-size:0.95rem; margin-bottom:18px; }
  input:focus { outline:2px solid var(--accent); outline-offset:1px; }
  button, .btn-link { width:100%; display:block; padding:13px; border:none; border-radius:999px; background:var(--accent); color:#1a1408; font-family:inherit; font-weight:600; font-size:0.9rem; letter-spacing:0.03em; cursor:pointer; text-decoration:none; box-sizing:border-box; }
  .error { background:#fdeee7; color:var(--error); border:1px solid #f3c8b3; padding:10px 14px; border-radius:8px; font-size:0.85rem; margin-bottom:18px; text-align:left; }
  .hint { font-size:0.85rem; color:var(--muted); margin:0 0 24px; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">Wed<span>Connect</span></div>
    ${body}
  </div>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const error = url.searchParams.get("error") || "";

  const reset = token
    ? await env.DB.prepare("SELECT lejar, felhasznalva FROM password_resets WHERE token = ?").bind(token).first()
    : null;
  const valid = !!(reset && !reset.felhasznalva && new Date(reset.lejar).getTime() > Date.now());

  return new Response(page({ valid, token, error }), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();
  const token = (formData.get("token") || "").toString();
  const jelszo = (formData.get("jelszo") || "").toString();
  const jelszo2 = (formData.get("jelszo2") || "").toString();

  function backWithError(code) {
    return Response.redirect(
      `${new URL("/partner/reset-password", request.url).href}?token=${encodeURIComponent(token)}&error=${code}`,
      303
    );
  }

  const reset = token
    ? await env.DB.prepare("SELECT viszontelado_id, lejar, felhasznalva FROM password_resets WHERE token = ?").bind(token).first()
    : null;
  if (!reset || reset.felhasznalva || new Date(reset.lejar).getTime() < Date.now()) {
    return Response.redirect(new URL("/partner/reset-password", request.url).href, 303);
  }

  if (jelszo.length < 8) return backWithError("weak_password");
  if (jelszo !== jelszo2) return backWithError("mismatch");

  const hash = await hashPassword(jelszo);
  await env.DB.prepare("UPDATE viszontelado SET jelszo_hash = ? WHERE id = ?").bind(hash, reset.viszontelado_id).run();
  await env.DB.prepare("UPDATE password_resets SET felhasznalva = 1 WHERE token = ?").bind(token).run();
  await env.DB.prepare("DELETE FROM sessions WHERE viszontelado_id = ?").bind(reset.viszontelado_id).run();

  return Response.redirect(`${new URL("/partner/login", request.url).href}?reset=1`, 303);
}
