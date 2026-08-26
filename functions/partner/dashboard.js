import { getSessionReseller } from "../_utils/auth.js";
import { STYLES, FONT_RECIPES, getStyleName, resolveStyleByStoredValue } from "../_utils/styles.js";
import { escapeHtml, safeHref } from "../_utils/html.js";
import { getCopy, getStatusLabel } from "../_utils/i18n.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const { results: parok } = await env.DB.prepare(
    "SELECT id, par_neve, nev1, nev2, eskuvo_datuma, slug, allapot, valasztott_stilus, egyedi_uzenet, egyedi_gombok, nyelv FROM parok WHERE viszontelado_id = ? ORDER BY eskuvo_datuma DESC"
  )
    .bind(reseller.id)
    .all();

  const url = new URL(request.url);
  const saved = url.searchParams.get("saved");
  const error = url.searchParams.get("error");
  const deleted = url.searchParams.get("deleted");
  const created = url.searchParams.get("created");
  const createdCouple = created ? (parok || []).find((p) => p.slug === created) : null;
  const stdOrdered = url.searchParams.get("stdordered");
  const stdError = url.searchParams.get("stderror");
  const stdErrorMessages = {
    invalid: "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
    missing_address: "Bitte geben Sie eine Lieferadresse ein.",
  };

  const defaultMessage = getCopy(reseller.nyelv || "de").defaultMessage;

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = (parok || [])
    .filter((p) => p.eskuvo_datuma >= todayStr)
    .sort((a, b) => a.eskuvo_datuma.localeCompare(b.eskuvo_datuma))[0];

  function daysUntil(dateStr) {
    const target = new Date(`${dateStr}T00:00:00Z`);
    const now = new Date();
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.round((target.getTime() - todayUTC) / 86400000);
  }

  function daysUntilLabel(days) {
    if (days === 0) return "Heute!";
    if (days === 1) return "Morgen";
    return `${days} Tage`;
  }

  const stylePicker = STYLES.map((s) => {
    return `
      <label class="style-swatch" style="--bg:${s.bg}; --fg:${s.fg}; --accent:${s.accent}; --accent-text:${s.accentText}; --btn-fg:${s.btnFg};">
        <input type="radio" name="stilus" value="${s.id}" required>
        <span class="swatch-mock"></span>
        <span class="swatch-name">${escapeHtml(getStyleName(s, "de"))}</span>
        <button type="submit" class="swatch-confirm">✓ Seite erstellen</button>
      </label>`;
  }).join("");

  const stylesForClient = JSON.stringify(STYLES.map((s) => ({ id: s.id, font: s.font })));
  const fontRecipesForClient = JSON.stringify(FONT_RECIPES);
  const defaultMessageForClient = JSON.stringify(defaultMessage);

  const rows = (parok || [])
    .map((p) => {
      let gombok = [];
      try {
        gombok = p.egyedi_gombok ? JSON.parse(p.egyedi_gombok) : [];
      } catch (e) {
        gombok = [];
      }
      const gombRows = [0, 1, 2, 3, 4]
        .map((i) => {
          const g = gombok[i] || { label: "", url: "" };
          return `
            <div class="btn-row">
              <input type="text" name="gomb_label" placeholder="Button-Beschriftung" value="${escapeHtml(g.label)}" autocomplete="off">
              <input type="url" name="gomb_url" placeholder="https://..." value="${escapeHtml(g.url)}" autocomplete="off">
            </div>`;
        })
        .join("");

      const pageUrl = `https://wedconnect.eu/${p.slug}`;
      const styleName = getStyleName(resolveStyleByStoredValue(p.valasztott_stilus), "de");
      const statusLabel = getStatusLabel(p.allapot, "de");
      const searchText = `${p.par_neve} ${p.eskuvo_datuma} ${styleName}`.toLowerCase();
      const nev1 = p.nev1 || (p.par_neve || "").split(" & ")[0] || "";
      const nev2 = p.nev2 || (p.par_neve || "").split(" & ")[1] || "";

      return `
        <div class="couple${created === p.slug ? " just-created" : ""}" data-search="${escapeHtml(searchText)}">
          <div class="couple-head">
            <div>
              <div class="couple-name">${escapeHtml(p.par_neve)}</div>
              <div class="couple-meta">${escapeHtml(p.eskuvo_datuma)} · ${escapeHtml(styleName)} · <span class="status">${escapeHtml(statusLabel)}</span></div>
              <a class="couple-link" href="${safeHref(pageUrl)}" target="_blank" rel="noopener">${escapeHtml(pageUrl)}</a>
            </div>
            <div class="couple-actions">
              <button type="button" class="btn-qr btn-copy" data-copy="${escapeHtml(pageUrl)}">Link kopieren</button>
              <button type="button" class="btn-qr" data-url="${escapeHtml(pageUrl)}" data-filename="${escapeHtml(p.slug)}-qr.png">QR-Code</button>
              <form method="POST" action="/api/couple-delete" class="delete-form" onsubmit="return confirm('Soll dieses Brautpaar wirklich endgültig gelöscht werden?')">
                <input type="hidden" name="par_id" value="${p.id}">
                <button type="submit" class="btn-delete">Löschen</button>
              </form>
            </div>
          </div>
          <details>
            <summary>Bearbeiten</summary>
            <form method="POST" action="/api/couple-update" class="edit-form">
              <input type="hidden" name="par_id" value="${p.id}">
              <label>Eigene Nachricht (leer lassen für den Standardtext)</label>
              <textarea name="egyedi_uzenet" rows="2" placeholder="Vielen Dank, dass du diesen Tag mit uns feierst...">${escapeHtml(p.egyedi_uzenet || "")}</textarea>
              <label>Buttons (Beschriftung + Link, max. 5)</label>
              ${gombRows}
              <button type="submit" class="btn-save">Speichern</button>
              ${saved === String(p.id) ? '<span class="saved-note">Gespeichert ✓</span>' : ""}
            </form>
          </details>
          <button
            type="button"
            class="btn-std-open"
            data-par-id="${p.id}"
            data-nev1="${escapeHtml(nev1)}"
            data-nev2="${escapeHtml(nev2)}"
            data-datum="${escapeHtml(p.eskuvo_datuma)}"
            data-nyelv="${escapeHtml(p.nyelv || "hu")}"
          >Save the Date gestalten</button>
        </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Partner Dashboard — WedConnect</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Great+Vibes&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<script src="/assets/qrcode.min.js"></script>
<script type="module">
  import { generateMockupSVG } from "/assets/save-the-date.js?v=7";
  window.STD = { generateMockupSVG };
</script>
<style>
  :root { --bg:#faf7f2; --fg:#2b2620; --muted:#7a7266; --accent:#b48b56; --card:#ffffff; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:"Poppins",sans-serif; background:var(--bg); color:var(--fg); }
  header { display:flex; align-items:center; justify-content:space-between; padding:20px 32px; background:var(--card); box-shadow:0 2px 10px rgba(0,0,0,0.05); }
  .brand { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.4rem; }
  .brand span { color:var(--accent); }
  .who { font-size:0.85rem; color:var(--muted); }
  .logout-form button { border:none; background:none; color:var(--muted); text-decoration:underline; cursor:pointer; font-family:inherit; font-size:0.85rem; }
  main { max-width:820px; margin:0 auto; padding:36px 24px 80px; }
  h2 { font-family:"Cormorant Garamond",serif; font-size:1.5rem; margin:0 0 18px; }
  .new-couple { background:var(--card); border-radius:14px; padding:26px 28px; margin-bottom:40px; box-shadow:0 10px 30px -20px rgba(0,0,0,0.15); }
  .field-row { display:flex; gap:14px; flex-wrap:wrap; }
  .field-row > div { flex:1; min-width:160px; }
  label { display:block; font-size:0.8rem; font-weight:500; margin-bottom:5px; }
  input, select, textarea { width:100%; padding:9px 12px; border:1px solid #ddd6c9; border-radius:8px; font-family:inherit; font-size:0.9rem; margin-bottom:14px; }
  button.btn-save, .new-couple button[type=submit] {
    padding:10px 24px; border:none; border-radius:999px; background:var(--accent); color:#1a1408;
    font-weight:600; font-size:0.85rem; cursor:pointer;
  }
  .couple { background:var(--card); border-radius:12px; padding:18px 22px; margin-bottom:14px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); }
  .couple-name { font-weight:600; font-size:1.05rem; }
  .couple-meta { font-size:0.82rem; color:var(--muted); margin:2px 0 4px; }
  .status { color:var(--accent); font-weight:600; }
  .couple-link { font-size:0.82rem; color:var(--accent); text-decoration:none; }
  details { margin-top:10px; }
  summary { cursor:pointer; font-size:0.85rem; color:var(--accent); font-weight:600; }
  .edit-form { margin-top:14px; }
  .btn-row { display:flex; gap:8px; }
  .btn-row input { flex:1; }
  .saved-note { color:#3a7a4e; font-size:0.85rem; margin-left:10px; }
  .empty { color:var(--muted); font-size:0.9rem; }
  .error-box { background:#fdeee7; color:#b1451f; border:1px solid #f3c8b3; padding:10px 14px; border-radius:8px; font-size:0.85rem; margin-bottom:18px; }
  .style-picker { display:grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap:18px; margin-bottom:6px; }
  .style-swatch { position:relative; cursor:pointer; border-radius:12px; overflow:hidden; border:2px solid transparent; box-shadow:0 4px 14px rgba(0,0,0,0.1); display:block; }
  .style-swatch input { position:absolute; opacity:0; width:0; height:0; margin:0; }
  .swatch-mock { background:var(--bg); color:var(--fg); min-height:230px; padding:22px 18px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:8px; }
  .mock-eyebrow { font-family:"Poppins",sans-serif; font-size:0.62rem; font-weight:600; letter-spacing:0.28em; text-transform:uppercase; color:var(--accent-text); }
  .mock-names { line-height:1.15; max-width:100%; overflow-wrap:break-word; word-break:break-word; }
  .mock-date { font-family:"Poppins",sans-serif; font-size:0.75rem; font-weight:500; letter-spacing:0.1em; color:var(--accent-text); }
  .mock-message { font-family:"Cormorant Garamond",serif; font-style:italic; font-size:0.85rem; line-height:1.4; max-width:100%; margin-top:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .mock-buttons { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-top:6px; }
  .mock-btn { background:var(--accent); color:var(--btn-fg); font-family:"Poppins",sans-serif; font-size:0.62rem; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; padding:6px 14px; border-radius:999px; white-space:nowrap; max-width:150px; overflow:hidden; text-overflow:ellipsis; }
  .swatch-name { display:block; padding:9px 8px; font-size:0.78rem; font-weight:500; text-align:center; color:#4a4038; background:#fff; }
  .style-picker .style-swatch button.swatch-confirm {
    display:block; width:100%; border:none; border-radius:0; margin:0; font-family:inherit; cursor:pointer;
    max-height:0; opacity:0; padding:0 8px; overflow:hidden;
    font-size:0.92rem; font-weight:800; letter-spacing:0.02em; text-align:center;
    color:#1a1408; background:linear-gradient(135deg,#f0c988,#b48b56);
    transition:max-height 0.28s ease, opacity 0.22s ease, padding 0.28s ease;
  }
  .style-swatch { transition:transform 0.15s ease, box-shadow 0.15s ease; }
  .style-swatch:has(input:checked) { border-color:#b48b56; box-shadow:0 0 0 3px rgba(180,139,86,0.35), 0 10px 24px -10px rgba(180,139,86,0.6); transform:scale(1.02); z-index:1; }
  .style-swatch:has(input:checked) .swatch-name { display:none; }
  .style-picker .style-swatch:has(input:checked) button.swatch-confirm {
    max-height:64px; opacity:1; padding:17px 8px;
    animation: swatchConfirmPulse 1.4s ease-in-out infinite;
  }
  @keyframes swatchConfirmPulse {
    0%, 100% { box-shadow:0 4px 14px -4px rgba(180,139,86,0.7); }
    50% { box-shadow:0 6px 22px -2px rgba(180,139,86,1); }
  }
  .success-banner { display:flex; align-items:center; gap:16px; background:linear-gradient(135deg,#fff6e6,#ffe9c7); border:1px solid #e8c583; border-radius:14px; padding:18px 20px; margin-bottom:24px; box-shadow:0 10px 30px -14px rgba(180,139,86,0.5); flex-wrap:wrap; animation:successIn 0.5s cubic-bezier(.25,1,.5,1); }
  @keyframes successIn { from { opacity:0; transform:translateY(-12px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
  .success-emoji { font-size:2.4rem; animation:successBounce 1.2s ease-in-out infinite; }
  @keyframes successBounce { 0%, 100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(-6px) rotate(-8deg); } }
  .success-body { flex:1; min-width:180px; }
  .success-title { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.3rem; color:#5c4321; }
  .success-sub { font-size:0.82rem; color:#8a6d3f; margin-top:2px; word-break:break-word; }
  .success-actions { display:flex; gap:8px; flex-wrap:wrap; }
  .success-view { padding:9px 18px; border-radius:999px; background:#b48b56; color:#1a1408; font-weight:700; font-size:0.82rem; text-decoration:none; white-space:nowrap; }
  .couple.just-created { animation:justCreatedGlow 2.6s ease-out 1; }
  @keyframes justCreatedGlow {
    0% { box-shadow:0 0 0 6px rgba(180,139,86,0.55), 0 6px 20px -16px rgba(0,0,0,0.15); }
    100% { box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); }
  }
  .style-picker-hint { font-size:0.78rem; color:var(--muted); margin:-2px 0 16px; }
  .step-label { font-size:0.78rem; font-weight:600; letter-spacing:0.04em; color:var(--accent); text-transform:uppercase; margin:0 0 16px; }
  .hint-inline { font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted); font-size:0.78rem; }
  .wizard-nav { display:flex; gap:12px; margin-top:8px; }
  .btn-back { padding:10px 24px; border:1px solid #ddd6c9; border-radius:999px; background:none; color:var(--fg); font-weight:600; font-size:0.85rem; cursor:pointer; font-family:inherit; }
  .btn-next { padding:10px 24px; border:none; border-radius:999px; background:var(--accent); color:#1a1408; font-weight:600; font-size:0.85rem; cursor:pointer; font-family:inherit; }
  .btn-row { display:flex; gap:8px; align-items:center; }
  .btn-remove-row { flex:none; border:none; background:none; color:var(--muted); font-size:1.2rem; line-height:1; cursor:pointer; padding:0 4px 14px; }
  .btn-add-row { border:1px dashed #ddd6c9; background:none; color:var(--accent); border-radius:8px; padding:9px 14px; font-size:0.85rem; font-weight:600; cursor:pointer; font-family:inherit; margin-bottom:20px; }
  .info-box { background:#eaf5ee; color:#3a7a4e; border:1px solid #bfe0cb; padding:10px 14px; border-radius:8px; font-size:0.85rem; margin-bottom:18px; }
  .search-row input { margin-bottom:18px; }
  .couple-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; }
  .couple-actions { display:flex; gap:8px; flex:none; }
  .delete-form { display:inline; }
  .btn-qr, .btn-delete { padding:7px 14px; border-radius:999px; font-weight:600; font-size:0.78rem; cursor:pointer; font-family:inherit; white-space:nowrap; }
  .btn-qr { border:1px solid #ddd6c9; background:none; color:var(--fg); }
  .btn-delete { border:1px solid #e0b8ac; background:none; color:#b1451f; }
  .pw-link { font-size:0.85rem; color:var(--muted); text-decoration:underline; }
  .stats-bar { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:24px; }
  .stat { flex:1; min-width:180px; background:var(--card); border-radius:14px; padding:20px 22px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); }
  .stat-value { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:2rem; color:var(--accent); line-height:1; }
  .stat-label { font-size:0.82rem; color:var(--muted); margin-top:6px; }
  .empty-state { text-align:center; padding:48px 24px; background:var(--card); border-radius:14px; box-shadow:0 6px 20px -16px rgba(0,0,0,0.15); }
  .empty-emoji { font-size:2.5rem; margin-bottom:12px; }
  .empty-title { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.3rem; margin-bottom:6px; }
  .empty-text { font-size:0.9rem; color:var(--muted); }
  .btn-std-open { font-family:"Poppins",sans-serif; font-size:0.76rem; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; color:var(--accent); background:#fff; border:1.5px solid var(--accent); padding:10px 22px; border-radius:999px; cursor:pointer; transition:background 0.18s ease, color 0.18s ease; }
  .btn-std-open:hover { background:var(--accent); color:#fff; }
  .std-modal { border:none; border-radius:22px; padding:0; max-width:760px; width:92vw; box-shadow:0 40px 90px -24px rgba(30,20,8,0.4); position:relative; }
  .std-modal::backdrop { background:rgba(20,14,6,0.55); backdrop-filter:blur(3px); }
  .std-modal[open] { animation:std-modal-in 0.22s ease; }
  @keyframes std-modal-in { from { opacity:0; transform:translateY(10px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
  .std-modal-close { position:absolute; top:14px; right:14px; width:34px; height:34px; border-radius:50%; border:none; background:#f4efe2; color:var(--fg); font-size:1.3rem; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; }
  .std-modal-close:hover { background:#eadfc4; }
  .std-modal-head { padding:34px 44px 0; text-align:center; }
  .std-modal-title { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.7rem; margin:0; color:var(--fg); }
  .std-modal-subtitle { font-size:0.85rem; color:var(--muted); margin-top:5px; min-height:1.2em; }
  .std-modal .std-panel-body { padding:26px 44px 40px; }
  .std-panel-body { display:flex; gap:36px; flex-wrap:wrap; align-items:flex-start; }
  .std-stage { flex:none; width:300px; max-width:100%; }
  .std-stage-bg { position:relative; background:radial-gradient(ellipse at 50% 38%, #ffffff 0%, #f2ead9 65%, #ece0c8 100%); border-radius:20px; padding:28px 24px; box-shadow:inset 0 0 0 1px rgba(180,139,86,0.14); }
  .std-preview svg { width:100%; height:auto; display:block; filter:drop-shadow(0 20px 28px -14px rgba(90,65,30,0.4)); }
  .std-nfc-badge { position:absolute; right:14px; bottom:14px; display:flex; align-items:center; gap:5px; background:var(--accent); color:#fff; padding:6px 12px 6px 8px; border-radius:999px; font-family:"Poppins",sans-serif; font-size:0.68rem; font-weight:700; letter-spacing:0.03em; box-shadow:0 8px 16px -8px rgba(180,139,86,0.7); cursor:default; }
  .std-nfc-badge svg { width:15px; height:15px; flex:none; }
  .std-nfc-badge::before { content:""; position:absolute; inset:-5px; border-radius:999px; border:1.5px solid var(--accent); opacity:0; animation:std-nfc-pulse 2.6s ease-out infinite; }
  @keyframes std-nfc-pulse { 0% { opacity:0.5; transform:scale(0.92); } 70% { opacity:0; transform:scale(1.28); } 100% { opacity:0; transform:scale(1.28); } }
  .std-stage-caption { margin:14px 4px 0; font-size:0.76rem; line-height:1.4; color:var(--muted); text-align:center; }
  .std-form { flex:1; min-width:240px; padding-top:4px; }
  .btn-std-submit { font-size:0.95rem; padding:11px 20px; }
</style>
</head>
<body>
<header>
  <div class="brand">Wed<span>Connect</span> Partner</div>
  <div style="display:flex; align-items:center; gap:16px;">
    <span class="who">${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</span>
    <a class="pw-link" href="/partner/account">Passwort ändern</a>
    <form class="logout-form" method="POST" action="/api/reseller-logout"><button type="submit">Abmelden</button></form>
  </div>
</header>
<main>
  ${error ? `<div class="error-box">Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.</div>` : ""}
  ${deleted ? `<div class="info-box">Brautpaar gelöscht.</div>` : ""}
  ${stdOrdered ? `<div class="info-box">Save the Date-Bestellung gesendet. Wir melden uns bei Ihnen.</div>` : ""}
  ${stdError ? `<div class="error-box">${escapeHtml(stdErrorMessages[stdError] || "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.")}</div>` : ""}
  ${
    createdCouple
      ? `<div class="success-banner" id="success-banner">
          <div class="success-emoji">🎉</div>
          <div class="success-body">
            <div class="success-title">Fertig! Die Seite ist online.</div>
            <div class="success-sub">${escapeHtml(createdCouple.par_neve)} · ${escapeHtml(`https://wedconnect.eu/${createdCouple.slug}`)}</div>
          </div>
          <div class="success-actions">
            <a class="success-view" href="${safeHref(`https://wedconnect.eu/${createdCouple.slug}`)}" target="_blank" rel="noopener">Seite ansehen</a>
            <button type="button" class="btn-qr btn-copy" data-copy="${escapeHtml(`https://wedconnect.eu/${createdCouple.slug}`)}">Link kopieren</button>
            <button type="button" class="btn-qr" data-url="${escapeHtml(`https://wedconnect.eu/${createdCouple.slug}`)}" data-filename="${escapeHtml(createdCouple.slug)}-qr.png">QR-Code</button>
          </div>
        </div>`
      : ""
  }
  ${
    parok && parok.length
      ? `<div class="stats-bar">
          <div class="stat">
            <div class="stat-value">${parok.length}</div>
            <div class="stat-label">${parok.length === 1 ? "Hochzeitsseite erstellt" : "Hochzeitsseiten erstellt"}</div>
          </div>
          ${
            upcoming
              ? `<div class="stat">
                  <div class="stat-value">${daysUntilLabel(daysUntil(upcoming.eskuvo_datuma))}</div>
                  <div class="stat-label">bis zur Hochzeit von ${escapeHtml(upcoming.par_neve)}</div>
                </div>`
              : ""
          }
        </div>`
      : ""
  }
  <div class="new-couple">
    <h2>Neues Brautpaar hinzufügen</h2>
    <form method="POST" action="/api/couple-create" id="new-couple-form" novalidate>
      <div class="wizard-step" data-step="1">
        <p class="step-label">Schritt 1 von 3 · Namen &amp; Datum</p>
        <div class="field-row">
          <div><label>Name der Braut</label><input type="text" name="nev1" id="f-nev1" required></div>
          <div><label>Name des Bräutigams</label><input type="text" name="nev2" id="f-nev2" required></div>
        </div>
        <div class="field-row">
          <div><label>Hochzeitsdatum</label><input type="date" name="eskuvo_datuma" id="f-datum" required></div>
        </div>
        <div class="wizard-nav">
          <button type="button" class="btn-next" data-next="2">Weiter</button>
        </div>
      </div>

      <div class="wizard-step" data-step="2" hidden>
        <p class="step-label">Schritt 2 von 3 · Nachricht &amp; Buttons</p>
        <label>Eigene Nachricht <span class="hint-inline">(kann jederzeit geändert werden)</span></label>
        <textarea name="egyedi_uzenet" id="f-uzenet" rows="3">${escapeHtml(defaultMessage)}</textarea>
        <label>Buttons <span class="hint-inline">(können jederzeit geändert werden)</span></label>
        <div id="button-rows">
          <div class="btn-row">
            <input type="text" name="gomb_label" placeholder="Button-Beschriftung" autocomplete="off">
            <input type="url" name="gomb_url" placeholder="https://..." autocomplete="off">
            <button type="button" class="btn-remove-row" aria-label="Button entfernen">×</button>
          </div>
        </div>
        <button type="button" class="btn-add-row" id="add-button-row">+ Button hinzufügen</button>
        <div class="wizard-nav">
          <button type="button" class="btn-back" data-back="1">Zurück</button>
          <button type="button" class="btn-next" data-next="3">Weiter</button>
        </div>
      </div>

      <div class="wizard-step" data-step="3" hidden>
        <p class="step-label">Schritt 3 von 3 · Stil wählen</p>
        <p class="style-picker-hint">Klicken Sie auf den Stil, der am besten zur Hochzeit passt – Namen, Datum, Nachricht und Buttons werden direkt in der Vorschau angezeigt.</p>
        <div class="style-picker" id="style-picker">${stylePicker}</div>
        <div class="wizard-nav">
          <button type="button" class="btn-back" data-back="2">Zurück</button>
          <button type="submit">Seite erstellen</button>
        </div>
      </div>
    </form>
  </div>

  <h2>Ihre Brautpaare</h2>
  ${
    parok && parok.length
      ? `<div class="search-row"><input type="text" id="couple-search" placeholder="Suchen (Name, Datum, Stil)..."></div>`
      : ""
  }
  ${
    rows ||
    `<div class="empty-state">
      <div class="empty-emoji">💍</div>
      <div class="empty-title">Noch keine Hochzeitsseite erstellt</div>
      <div class="empty-text">Legen Sie oben Ihr erstes Brautpaar an — in unter 2 Minuten ist die Seite online.</div>
    </div>`
  }
  ${parok && parok.length ? `<p class="empty" id="no-results" hidden>Keine Treffer für diese Suche.</p>` : ""}
</main>

<dialog id="std-modal" class="std-modal">
  <button type="button" class="std-modal-close" aria-label="Schließen">&times;</button>
  <div class="std-modal-head">
    <h3 class="std-modal-title">Save the Date gestalten</h3>
    <p class="std-modal-subtitle" id="std-modal-subtitle"></p>
  </div>
  <div class="std-panel-body">
    <div class="std-stage">
      <div class="std-stage-bg">
        <div class="std-preview" id="std-modal-preview"></div>
        <div class="std-nfc-badge" title="WedConnect-Chip: Smartphone antippen öffnet automatisch die Hochzeitsseite">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="7.2" cy="16.8" r="1.4" fill="currentColor"/>
            <path d="M10.6 13.4a5 5 0 0 1 0 7.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M13.4 10.6a9 9 0 0 1 0 12.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M16.2 7.8a13 13 0 0 1 0 18.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span>NFC</span>
        </div>
      </div>
      <p class="std-stage-caption">Laserschnitt aus Holz · WedConnect-Chip auf der Rückseite verlinkt direkt zur Hochzeitsseite</p>
    </div>
    <form method="POST" action="/api/order-save-the-date" class="std-form">
      <input type="hidden" name="par_id" id="std-modal-par-id" value="">
      <label>Menge</label>
      <input type="number" name="mennyiseg" min="1" max="9999" value="1" required>
      <label>Lieferadresse</label>
      <textarea name="szallitasi_cim" rows="3" placeholder="Name, Straße, PLZ, Ort, Land" required></textarea>
      <label>Anmerkung <span class="hint-inline">(optional)</span></label>
      <textarea name="megjegyzes" rows="2" placeholder="z. B. Sonderwünsche"></textarea>
      <button type="submit" class="btn-save btn-std-submit">Bestellung senden</button>
    </form>
  </div>
</dialog>
<script>
(function () {
  var DEFAULT_MESSAGE = ${defaultMessageForClient};
  var STYLES = ${stylesForClient};
  var FONT_RECIPES = ${fontRecipesForClient};
  var MAX_BUTTONS = 5;

  var form = document.getElementById("new-couple-form");
  var steps = Array.prototype.slice.call(form.querySelectorAll(".wizard-step"));
  var rowsContainer = document.getElementById("button-rows");
  var addRowBtn = document.getElementById("add-button-row");

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showStep(n) {
    steps.forEach(function (s) {
      s.hidden = parseInt(s.dataset.step, 10) !== n;
    });
    if (n === 3) renderPreviews();
  }

  function stepValid(stepEl) {
    var inputs = stepEl.querySelectorAll("input[required], textarea[required]");
    for (var i = 0; i < inputs.length; i++) {
      if (!inputs[i].checkValidity()) {
        inputs[i].reportValidity();
        return false;
      }
    }
    return true;
  }

  form.querySelectorAll("[data-next]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var current = btn.closest(".wizard-step");
      if (!stepValid(current)) return;
      showStep(parseInt(btn.dataset.next, 10));
    });
  });

  form.querySelectorAll("[data-back]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      showStep(parseInt(btn.dataset.back, 10));
    });
  });

  function bindRemove(btn) {
    btn.addEventListener("click", function () {
      btn.closest(".btn-row").remove();
    });
  }
  rowsContainer.querySelectorAll(".btn-remove-row").forEach(bindRemove);

  addRowBtn.addEventListener("click", function () {
    if (rowsContainer.children.length >= MAX_BUTTONS) return;
    var div = document.createElement("div");
    div.className = "btn-row";
    div.innerHTML =
      '<input type="text" name="gomb_label" placeholder="Button-Beschriftung" autocomplete="off">' +
      '<input type="url" name="gomb_url" placeholder="https://..." autocomplete="off">' +
      '<button type="button" class="btn-remove-row" aria-label="Button entfernen">×</button>';
    rowsContainer.appendChild(div);
    bindRemove(div.querySelector(".btn-remove-row"));
  });

  function renderPreviews() {
    var nev1 = document.getElementById("f-nev1").value.trim();
    var nev2 = document.getElementById("f-nev2").value.trim();
    var datum = document.getElementById("f-datum").value;
    var namesText = (nev1 || "Anna") + " & " + (nev2 || "Max");

    var dateText = "";
    if (datum) {
      var parts = datum.split("-");
      if (parts.length === 3) dateText = parts[0] + "." + parts[1] + "." + parts[2] + ".";
    }

    var message = document.getElementById("f-uzenet").value.trim() || DEFAULT_MESSAGE;

    var labels = Array.prototype.map.call(form.querySelectorAll('[name="gomb_label"]'), function (el) {
      return el.value.trim();
    });
    var buttons = labels.filter(function (l) {
      return l;
    });

    document.querySelectorAll(".style-swatch").forEach(function (sw) {
      var id = sw.querySelector("input").value;
      var style = STYLES.filter(function (s) {
        return s.id === id;
      })[0];
      if (!style) return;
      var recipe = FONT_RECIPES[style.font] || FONT_RECIPES.sans;
      var namesFontSize = style.font === "script" || style.font === "hand" ? "2rem" : "1.5rem";
      var mock = sw.querySelector(".swatch-mock");
      var buttonsHtml = buttons.length
        ? '<span class="mock-buttons">' +
          buttons
            .slice(0, 2)
            .map(function (b) {
              return '<span class="mock-btn">' + escapeHtml(b) + "</span>";
            })
            .join("") +
          "</span>"
        : "";
      mock.innerHTML =
        '<span class="mock-eyebrow">Hochzeit</span>' +
        '<span class="mock-names" style="' + recipe + " font-size:" + namesFontSize + ';">' + escapeHtml(namesText) + "</span>" +
        (dateText ? '<span class="mock-date">' + escapeHtml(dateText) + "</span>" : "") +
        '<span class="mock-message">' + escapeHtml(message) + "</span>" +
        buttonsHtml;
    });
  }

  renderPreviews();
  showStep(1);

  var searchInput = document.getElementById("couple-search");
  if (searchInput) {
    var coupleEls = Array.prototype.slice.call(document.querySelectorAll(".couple"));
    var noResults = document.getElementById("no-results");
    searchInput.addEventListener("input", function () {
      var q = searchInput.value.trim().toLowerCase();
      var anyVisible = false;
      coupleEls.forEach(function (el) {
        var match = !q || (el.getAttribute("data-search") || "").indexOf(q) !== -1;
        el.style.display = match ? "" : "none";
        if (match) anyVisible = true;
      });
      if (noResults) noResults.hidden = anyVisible;
    });
  }

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      // legrégebbi böngészőknél sem dob hibát, csak nem másol - nem kritikus
    }
    document.body.removeChild(ta);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        legacyCopy(text);
      });
    }
    legacyCopy(text);
    return Promise.resolve();
  }

  document.querySelectorAll(".btn-copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var url = btn.getAttribute("data-copy");
      var original = btn.textContent;
      copyToClipboard(url).then(function () {
        btn.textContent = "Kopiert ✓";
        setTimeout(function () {
          btn.textContent = original;
        }, 1500);
      });
    });
  });

  document.querySelectorAll(".btn-qr[data-url]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var pageUrl = btn.getAttribute("data-url");
      var filename = btn.getAttribute("data-filename");
      var qr = qrcode(0, "M");
      qr.addData(pageUrl);
      qr.make();
      var count = qr.getModuleCount();
      var cell = 10;
      var margin = cell * 4;
      var size = count * cell + margin * 2;
      var canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#000000";
      for (var r = 0; r < count; r++) {
        for (var c = 0; c < count; c++) {
          if (qr.isDark(r, c)) ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell);
        }
      }
      var link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  });

  var stdModal = document.getElementById("std-modal");
  var stdModalPreview = document.getElementById("std-modal-preview");
  var stdModalParId = document.getElementById("std-modal-par-id");
  var stdModalSubtitle = document.getElementById("std-modal-subtitle");

  function renderStdPreview(nev1, nev2, datum, nyelv) {
    if (!window.STD || !window.STD.generateMockupSVG) {
      setTimeout(function () {
        renderStdPreview(nev1, nev2, datum, nyelv);
      }, 150);
      return;
    }
    var parts = datum.split("-").map(Number);
    stdModalPreview.innerHTML = window.STD.generateMockupSVG(nev1, nev2, parts[0], parts[1], parts[2], nyelv);
  }

  document.querySelectorAll(".btn-std-open").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var nev1 = btn.getAttribute("data-nev1");
      var nev2 = btn.getAttribute("data-nev2");
      var datum = btn.getAttribute("data-datum");
      var nyelv = btn.getAttribute("data-nyelv");
      stdModalParId.value = btn.getAttribute("data-par-id");
      stdModalSubtitle.textContent = nev1 + " & " + nev2;
      renderStdPreview(nev1, nev2, datum, nyelv);
      if (typeof stdModal.showModal === "function") {
        stdModal.showModal();
      } else {
        stdModal.setAttribute("open", "");
      }
    });
  });

  if (stdModal) {
    stdModal.querySelector(".std-modal-close").addEventListener("click", function () {
      stdModal.close();
    });
    stdModal.addEventListener("click", function (e) {
      if (e.target === stdModal) stdModal.close();
    });
  }

  if (document.getElementById("success-banner")) {
    launchConfetti();
    var cleanUrl = location.pathname;
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", cleanUrl);
    }
  }

  function launchConfetti() {
    var canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    var colors = ["#b48b56", "#f0c988", "#d98fa0", "#7fae6a", "#4a8fa8", "#cfa64b"];
    var particles = [];
    for (var i = 0; i < 140; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: 2 + Math.random() * 3,
        speedX: -1.5 + Math.random() * 3,
        rotation: Math.random() * 360,
        rotationSpeed: -8 + Math.random() * 16,
      });
    }

    var start = Date.now();
    var duration = 3000;

    function frame() {
      var elapsed = Date.now() - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function (p) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (elapsed < duration) {
        requestAnimationFrame(frame);
      } else {
        window.removeEventListener("resize", resize);
        canvas.remove();
      }
    }
    requestAnimationFrame(frame);
  }
})();
</script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
