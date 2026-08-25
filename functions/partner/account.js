import { getSessionReseller } from "../_utils/auth.js";
import { escapeHtml } from "../_utils/html.js";

const PW_ERROR_MESSAGES = {
  wrong_current: "Das aktuelle Passwort ist falsch.",
  weak_password: "Das neue Passwort muss mindestens 8 Zeichen lang sein.",
  mismatch: "Die beiden neuen Passwörter stimmen nicht überein.",
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const url = new URL(request.url);
  const pwChanged = url.searchParams.get("pwchanged");
  const pwError = url.searchParams.get("pwerror");

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Konto — WedConnect</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --bg:#faf7f2; --fg:#2b2620; --muted:#7a7266; --accent:#b48b56; --card:#ffffff; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:"Poppins",sans-serif; background:var(--bg); color:var(--fg); }
  header { display:flex; align-items:center; justify-content:space-between; padding:20px 32px; background:var(--card); box-shadow:0 2px 10px rgba(0,0,0,0.05); }
  .brand { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.4rem; }
  .brand span { color:var(--accent); }
  .who { font-size:0.85rem; color:var(--muted); }
  .back-link { font-size:0.85rem; color:var(--muted); text-decoration:underline; }
  .logout-form button { border:none; background:none; color:var(--muted); text-decoration:underline; cursor:pointer; font-family:inherit; font-size:0.85rem; }
  main { max-width:420px; margin:0 auto; padding:36px 24px 80px; }
  h2 { font-family:"Cormorant Garamond",serif; font-size:1.5rem; margin:0 0 18px; }
  .card { background:var(--card); border-radius:14px; padding:26px 28px; box-shadow:0 10px 30px -20px rgba(0,0,0,0.15); }
  label { display:block; font-size:0.8rem; font-weight:500; margin-bottom:5px; }
  input { width:100%; padding:9px 12px; border:1px solid #ddd6c9; border-radius:8px; font-family:inherit; font-size:0.9rem; margin-bottom:14px; }
  button[type=submit] { padding:10px 24px; border:none; border-radius:999px; background:var(--accent); color:#1a1408; font-weight:600; font-size:0.85rem; cursor:pointer; }
  .error-box { background:#fdeee7; color:#b1451f; border:1px solid #f3c8b3; padding:10px 14px; border-radius:8px; font-size:0.85rem; margin-bottom:18px; }
  .info-box { background:#eaf5ee; color:#3a7a4e; border:1px solid #bfe0cb; padding:10px 14px; border-radius:8px; font-size:0.85rem; margin-bottom:18px; }
</style>
</head>
<body>
<header>
  <div class="brand">Wed<span>Connect</span> Partner</div>
  <div style="display:flex; align-items:center; gap:16px;">
    <span class="who">${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</span>
    <a class="back-link" href="/partner/dashboard">Zurück zum Dashboard</a>
    <form class="logout-form" method="POST" action="/api/reseller-logout"><button type="submit">Abmelden</button></form>
  </div>
</header>
<main>
  <h2>Passwort ändern</h2>
  <div class="card">
    ${pwError ? `<div class="error-box">${escapeHtml(PW_ERROR_MESSAGES[pwError] || "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.")}</div>` : ""}
    ${pwChanged ? `<div class="info-box">Passwort geändert.</div>` : ""}
    <form method="POST" action="/api/change-password">
      <label>Aktuelles Passwort</label>
      <input type="password" name="jelenlegi_jelszo" required autocomplete="current-password">
      <label>Neues Passwort</label>
      <input type="password" name="uj_jelszo" required autocomplete="new-password" minlength="8">
      <label>Neues Passwort bestätigen</label>
      <input type="password" name="uj_jelszo2" required autocomplete="new-password" minlength="8">
      <button type="submit">Passwort speichern</button>
    </form>
  </div>
</main>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
