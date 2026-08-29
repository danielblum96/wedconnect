import { getSessionReseller } from "../_utils/auth.js";
import { escapeHtml } from "../_utils/html.js";
import { countryOptions } from "../_utils/countries.js";
import { getResellerCopy } from "../_utils/i18n.js";

const PW_ERROR_MESSAGES = {
  de: {
    wrong_current: "Das aktuelle Passwort ist falsch.",
    weak_password: "Das neue Passwort muss mindestens 8 Zeichen lang sein.",
    mismatch: "Die beiden neuen Passwörter stimmen nicht überein.",
  },
  hu: {
    wrong_current: "A jelenlegi jelszó helytelen.",
    weak_password: "Az új jelszónak legalább 8 karakter hosszúnak kell lennie.",
    mismatch: "A két új jelszó nem egyezik.",
  },
  en: {
    wrong_current: "The current password is incorrect.",
    weak_password: "The new password must be at least 8 characters long.",
    mismatch: "The two new passwords do not match.",
  },
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const lang = reseller.nyelv || "de";
  const t = getResellerCopy(lang).account;
  const pwErrorMessages = PW_ERROR_MESSAGES[lang] || PW_ERROR_MESSAGES.de;

  const url = new URL(request.url);
  const pwChanged = url.searchParams.get("pwchanged");
  const pwError = url.searchParams.get("pwerror");
  const billingSaved = url.searchParams.get("billingsaved");
  const billingError = url.searchParams.get("billingerror");

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${t.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --bg:#faf7f2; --fg:#2b2620; --muted:#7a7266; --accent:#b48b56; --card:#ffffff; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:"Poppins",sans-serif; background:var(--bg); color:var(--fg); }
  header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px 16px; padding:20px 32px; background:var(--card); box-shadow:0 2px 10px rgba(0,0,0,0.05); }
  .brand { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.4rem; }
  .brand span { color:var(--accent); }
  .who { font-size:0.95rem; color:var(--muted); }
  .back-link { font-size:0.95rem; color:var(--muted); text-decoration:underline; }
  .logout-form button { border:none; background:none; color:var(--muted); text-decoration:underline; cursor:pointer; font-family:inherit; font-size:0.95rem; }
  @media (max-width: 600px) {
    header { padding:14px 16px; }
    .who { display:none; }
  }
  main { max-width:420px; margin:0 auto; padding:36px 24px 80px; }
  h2 { font-family:"Cormorant Garamond",serif; font-size:1.5rem; margin:0 0 18px; }
  .card { background:var(--card); border-radius:14px; padding:26px 28px; box-shadow:0 10px 30px -20px rgba(0,0,0,0.15); }
  label { display:block; font-size:0.9rem; font-weight:500; margin-bottom:5px; }
  input, textarea, select { width:100%; padding:9px 12px; border:1px solid #ddd6c9; border-radius:8px; font-family:inherit; font-size:1rem; margin-bottom:14px; background:#fff; }
  textarea { resize:vertical; min-height:60px; }
  .field-row { display:grid; grid-template-columns:1fr 2fr; gap:12px; }
  button[type=submit] { padding:10px 24px; border:none; border-radius:999px; background:linear-gradient(135deg,#f0c988,#b48b56); color:#1a1408; font-weight:600; font-size:0.95rem; cursor:pointer; font-family:inherit; box-shadow:0 6px 16px -8px rgba(139,102,53,0.6); transition:transform 0.15s ease, box-shadow 0.15s ease; }
  button[type=submit]:hover { transform:translateY(-1px); box-shadow:0 8px 20px -8px rgba(139,102,53,0.75); }
  .error-box { background:#fdeee7; color:#b1451f; border:1px solid #f3c8b3; padding:10px 14px; border-radius:8px; font-size:0.95rem; margin-bottom:18px; }
  .info-box { background:#eaf5ee; color:#3a7a4e; border:1px solid #bfe0cb; padding:10px 14px; border-radius:8px; font-size:0.95rem; margin-bottom:18px; }
  .toggle-label { display:flex; align-items:flex-start; gap:9px; font-size:0.95rem; font-weight:500; color:var(--fg); background:#faf6ee; border:1px solid #ece1cc; border-radius:8px; padding:10px 13px; margin-bottom:14px; cursor:pointer; }
  .toggle-label input[type="checkbox"] { width:16px; height:16px; margin:2px 0 0; flex:none; accent-color:var(--accent); }
  .hint-inline { font-weight:400; color:var(--muted); }
  .impersonation-bar { display:flex; align-items:center; justify-content:center; gap:14px; flex-wrap:wrap; background:#2b2620; color:#fff; padding:10px 16px; font-size:0.9rem; font-weight:600; text-align:center; }
  .impersonation-bar form { display:inline; }
  .impersonation-bar button { border:1px solid rgba(255,255,255,0.5); background:none; color:#fff; border-radius:999px; padding:5px 16px; font-size:0.85rem; font-weight:600; cursor:pointer; font-family:inherit; }
  .impersonation-bar button:hover { background:rgba(255,255,255,0.15); }
</style>
</head>
<body>
${
  reseller.admin_impersonalt
    ? `<div class="impersonation-bar">
        <span>🔍 Admin nézet – ide léptél be: <strong>${escapeHtml(reseller.ceg_nev)}</strong> (${escapeHtml(reseller.email)}) helyett</span>
        <form method="POST" action="/api/admin-impersonate-exit"><button type="submit">Kilépés az admin panelbe</button></form>
      </div>`
    : ""
}
<header>
  <div class="brand">Wed<span>Connect</span> Partner</div>
  <div style="display:flex; align-items:center; gap:16px;">
    <span class="who">${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</span>
    <a class="back-link" href="/partner/dashboard">${t.backToDashboard}</a>
    <form class="logout-form" method="POST" action="/api/reseller-logout"><button type="submit">${t.logout}</button></form>
  </div>
</header>
<main>
  <h2>${t.pwHeading}</h2>
  <div class="card">
    ${pwError ? `<div class="error-box">${escapeHtml(pwErrorMessages[pwError] || t.pwGenericError)}</div>` : ""}
    ${pwChanged ? `<div class="info-box">${t.pwChanged}</div>` : ""}
    <form method="POST" action="/api/change-password">
      <label>${t.currentPassword}</label>
      <input type="password" name="jelenlegi_jelszo" required autocomplete="current-password">
      <label>${t.newPassword}</label>
      <input type="password" name="uj_jelszo" required autocomplete="new-password" minlength="8">
      <label>${t.newPasswordConfirm}</label>
      <input type="password" name="uj_jelszo2" required autocomplete="new-password" minlength="8">
      <button type="submit">${t.pwSave}</button>
    </form>
  </div>

  <h2 style="margin-top:36px;">${t.addressHeading}</h2>
  <div class="card">
    ${billingError ? `<div class="error-box">${t.billingError}</div>` : ""}
    ${billingSaved ? `<div class="info-box">${t.addressSaved}</div>` : ""}
    <form method="POST" action="/api/reseller-update-billing">
      <label>${t.vatLabel} <span class="hint-inline">${t.optional}</span></label>
      <input type="text" name="adoszam" placeholder="${t.vatPlaceholder}" value="${escapeHtml(reseller.adoszam || "")}">

      <label>${t.street}</label>
      <input type="text" name="szamlazasi_utca" value="${escapeHtml(reseller.szamlazasi_utca || "")}">

      <div class="field-row">
        <div>
          <label>${t.postalCode}</label>
          <input type="text" name="szamlazasi_irsz" value="${escapeHtml(reseller.szamlazasi_irsz || "")}">
        </div>
        <div>
          <label>${t.city}</label>
          <input type="text" name="szamlazasi_varos" value="${escapeHtml(reseller.szamlazasi_varos || "")}">
        </div>
      </div>

      <label>${t.countryBilling}</label>
      <select name="szamlazasi_orszag">
        ${countryOptions(reseller.szamlazasi_orszag || reseller.orszag, reseller.nyelv)}
      </select>

      <label class="toggle-label">
        <input type="checkbox" name="szallitas_azonos" value="1" id="acc-azonos" ${reseller.szallitas_azonos ? "checked" : ""}>
        ${t.shippingSameToggle}
      </label>

      <div id="acc-shipping-group" ${reseller.szallitas_azonos ? "hidden" : ""}>
        <label>${t.streetShipping}</label>
        <input type="text" name="alap_szallitasi_utca" value="${escapeHtml(reseller.alap_szallitasi_utca || "")}">

        <div class="field-row">
          <div>
            <label>${t.postalCode}</label>
            <input type="text" name="alap_szallitasi_irsz" value="${escapeHtml(reseller.alap_szallitasi_irsz || "")}">
          </div>
          <div>
            <label>${t.city}</label>
            <input type="text" name="alap_szallitasi_varos" value="${escapeHtml(reseller.alap_szallitasi_varos || "")}">
          </div>
        </div>

        <label>${t.countryShipping}</label>
        <select name="alap_szallitasi_orszag">
          ${countryOptions(reseller.alap_szallitasi_orszag || reseller.orszag, reseller.nyelv)}
        </select>
      </div>

      <button type="submit">${t.addressSave}</button>
    </form>
  </div>
</main>
<script>
  var accAzonos = document.getElementById("acc-azonos");
  var accShippingGroup = document.getElementById("acc-shipping-group");
  if (accAzonos && accShippingGroup) {
    accAzonos.addEventListener("change", function () {
      accShippingGroup.hidden = accAzonos.checked;
    });
  }
</script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
