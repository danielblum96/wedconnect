import { getSessionReseller } from "../_utils/auth.js";
import { STYLES, FONT_RECIPES, getStyleName, resolveStyleByStoredValue } from "../_utils/styles.js";
import { escapeHtml, safeHref } from "../_utils/html.js";
import { getCopy, getStatusLabel, getResellerCopy, getPricing, formatPrice } from "../_utils/i18n.js";
import { countryOptions } from "../_utils/countries.js";

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

  const lang = reseller.nyelv || "de";
  const t = getResellerCopy(lang).dashboard;
  const stdErrorMessages = t.stdError;
  const pricing = getPricing(lang);
  const PAGE_PRICE = pricing.pagePrice;
  const STD_PRICE = pricing.stdPrice;

  const defaultMessage = getCopy(lang).defaultMessage;
  const defaultBilling = {
    utca: reseller.szamlazasi_utca || "",
    irsz: reseller.szamlazasi_irsz || "",
    varos: reseller.szamlazasi_varos || "",
    orszag: reseller.szamlazasi_orszag || reseller.orszag || "DE",
  };
  const defaultShipping = reseller.szallitas_azonos
    ? defaultBilling
    : {
        utca: reseller.alap_szallitasi_utca || "",
        irsz: reseller.alap_szallitasi_irsz || "",
        varos: reseller.alap_szallitasi_varos || "",
        orszag: reseller.alap_szallitasi_orszag || reseller.orszag || "DE",
      };
  const defaultAdoszam = reseller.adoszam || "";

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

  const stylePicker = STYLES.map((s) => {
    return `
      <label class="style-swatch" style="--bg:${s.bg}; --fg:${s.fg}; --accent:${s.accent}; --accent-text:${s.accentText}; --btn-fg:${s.btnFg};">
        <input type="radio" name="stilus" value="${s.id}" required>
        <span class="swatch-mock"></span>
        <span class="swatch-name">${escapeHtml(getStyleName(s, lang))}</span>
        <button type="submit" class="swatch-confirm">${t.styleConfirm}</button>
      </label>`;
  }).join("");

  const stylesForClient = JSON.stringify(
    STYLES.map((s) => ({ id: s.id, font: s.font, bg: s.bg, fg: s.fg, accent: s.accent, accentText: s.accentText, btnFg: s.btnFg }))
  );
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
              <input type="text" name="gomb_label" placeholder="${t.buttonLabelPlaceholder}" value="${escapeHtml(g.label)}" autocomplete="off">
              <input type="url" name="gomb_url" placeholder="https://..." value="${escapeHtml(g.url)}" autocomplete="off">
            </div>`;
        })
        .join("");

      const pageUrl = `https://wedconnect.eu/${p.slug}`;
      const resolvedStyle = resolveStyleByStoredValue(p.valasztott_stilus);
      const styleName = getStyleName(resolvedStyle, lang);
      const statusLabel = getStatusLabel(p.allapot, lang);
      const searchText = `${p.par_neve} ${p.eskuvo_datuma} ${styleName}`.toLowerCase();
      const nev1 = p.nev1 || (p.par_neve || "").split(" & ")[0] || "";
      const nev2 = p.nev2 || (p.par_neve || "").split(" & ")[1] || "";
      const mockGombok = gombok
        .map((g) => (g && g.label ? g.label.trim() : ""))
        .filter(Boolean)
        .slice(0, 2);

      return `
        <div class="couple${created === p.slug ? " just-created" : ""}" data-search="${escapeHtml(searchText)}">
          <div class="couple-head">
            <div>
              <div class="couple-name">${escapeHtml(p.par_neve)}</div>
              <div class="couple-meta">${escapeHtml(p.eskuvo_datuma)} · ${escapeHtml(styleName)} · <span class="status">${escapeHtml(statusLabel)}</span></div>
              <a class="couple-link" href="${safeHref(pageUrl)}" target="_blank" rel="noopener">${escapeHtml(pageUrl)}</a>
            </div>
            <div class="couple-actions">
              <button type="button" class="btn-qr btn-copy" data-copy="${escapeHtml(pageUrl)}">${t.copyLink}</button>
              <button type="button" class="btn-qr" data-url="${escapeHtml(pageUrl)}" data-filename="${escapeHtml(p.slug)}-qr.png">${t.qrCode}</button>
              <form method="POST" action="/api/couple-delete" class="delete-form" onsubmit="return confirm('${t.confirmDelete.replace(/'/g, "\\'")}')">
                <input type="hidden" name="par_id" value="${p.id}">
                <button type="submit" class="btn-delete">${t.delete}</button>
              </form>
            </div>
          </div>
          <details>
            <summary>${t.edit}</summary>
            <form method="POST" action="/api/couple-update" class="edit-form">
              <input type="hidden" name="par_id" value="${p.id}">
              <label>${t.ownMessageEditHint}</label>
              <textarea name="egyedi_uzenet" rows="2" placeholder="${t.ownMessagePlaceholder}">${escapeHtml(p.egyedi_uzenet || "")}</textarea>
              <label>${t.buttonsEditHint}</label>
              ${gombRows}
              <button type="submit" class="btn-save">${t.save}</button>
              ${saved === String(p.id) ? `<span class="saved-note">${t.saved}</span>` : ""}
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
            data-url="${escapeHtml(pageUrl)}"
            data-stilus="${escapeHtml(resolvedStyle.id)}"
            data-uzenet="${escapeHtml(p.egyedi_uzenet || defaultMessage)}"
            data-gombok='${escapeHtml(JSON.stringify(mockGombok))}'
          >${t.createStd}</button>
          <div class="checkout-row">
            <button
              type="button"
              class="btn-std-open btn-checkout"
              data-par-id="${p.id}"
              data-nev1="${escapeHtml(nev1)}"
              data-nev2="${escapeHtml(nev2)}"
              data-datum="${escapeHtml(p.eskuvo_datuma)}"
              data-nyelv="${escapeHtml(p.nyelv || "hu")}"
              data-url="${escapeHtml(pageUrl)}"
              data-stilus="${escapeHtml(resolvedStyle.id)}"
              data-uzenet="${escapeHtml(p.egyedi_uzenet || defaultMessage)}"
              data-gombok='${escapeHtml(JSON.stringify(mockGombok))}'
            >${t.checkout}</button>
          </div>
        </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${t.pageTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Great+Vibes&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<script src="/assets/qrcode.min.js"></script>
<script type="module">
  import { generateMockupSVG } from "/assets/save-the-date.js?v=8";
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
  .checkout-row { display:flex; justify-content:flex-end; margin-top:18px; }
  .btn-std-open.btn-checkout { background:linear-gradient(135deg,var(--accent),#8f6a3c); color:#fff; text-transform:none; font-weight:700; font-size:1rem; letter-spacing:0.01em; padding:15px 34px; border:none; box-shadow:0 12px 26px -8px rgba(180,139,86,0.65); transition:transform 0.15s ease, box-shadow 0.15s ease; }
  .btn-std-open.btn-checkout:hover { background:linear-gradient(135deg,var(--accent),#8f6a3c); color:#fff; transform:translateY(-1px); box-shadow:0 16px 32px -8px rgba(180,139,86,0.75); }
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
  .price-note { display:inline-block; font-size:0.78rem; font-weight:600; color:var(--accent); background:#fbf2e2; border:1px solid #ecd9b6; border-radius:999px; padding:5px 14px; margin:-6px 0 16px; }
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
  .account-link { font-size:0.85rem; color:var(--muted); text-decoration:underline; }
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
  .std-preview-page { border-radius:16px; box-shadow:0 20px 28px -14px rgba(30,20,10,0.35); }
  .std-nfc-badge { position:absolute; right:20px; bottom:8px; display:flex; align-items:center; gap:7px; background:var(--accent); color:#fff; padding:7px 14px 7px 9px; border-radius:999px; font-family:"Poppins",sans-serif; font-size:0.72rem; font-weight:700; letter-spacing:0.02em; box-shadow:0 8px 16px -8px rgba(180,139,86,0.7); cursor:default; }
  .std-nfc-badge[hidden] { display:none; }
  .std-nfc-badge svg { width:24px; height:24px; flex:none; }
  .std-nfc-badge::before { content:""; position:absolute; inset:-5px; border-radius:999px; border:1.5px solid var(--accent); opacity:0; animation:std-nfc-pulse 2.6s ease-out infinite; }
  @keyframes std-nfc-pulse { 0% { opacity:0.5; transform:scale(0.92); } 70% { opacity:0; transform:scale(1.28); } 100% { opacity:0; transform:scale(1.28); } }
  .std-stage-caption { margin:14px 4px 0; font-size:0.76rem; line-height:1.4; color:var(--muted); text-align:center; }
  .std-form { flex:1; min-width:240px; padding-top:4px; }
  .btn-std-submit { font-size:0.95rem; padding:11px 20px; }
  .std-link-row { margin-bottom:16px; }
  .std-link-label { display:inline-flex; align-items:center; gap:6px; margin-bottom:5px; }
  .std-info-wrap { position:relative; display:inline-flex; }
  .std-info-btn { width:16px; height:16px; border-radius:50%; border:1px solid var(--muted); background:none; color:var(--muted); font-size:0.65rem; font-weight:700; font-style:italic; font-family:Georgia,serif; line-height:1; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; padding:0; flex:none; }
  .std-info-btn:hover, .std-info-btn:focus-visible { border-color:var(--accent); color:var(--accent); outline:none; }
  .std-link-value { font-size:0.85rem; color:var(--fg); background:#f7f3ea; border:1px solid #ece1cc; border-radius:8px; padding:9px 12px; word-break:break-all; }
  .std-toggle-label { display:flex; align-items:flex-start; gap:9px; font-size:0.85rem; font-weight:600; color:var(--fg); background:#fbf2e2; border:1px solid #ecd9b6; border-radius:10px; padding:11px 14px; margin-bottom:14px; cursor:pointer; }
  .std-toggle-label input[type="checkbox"] { width:16px; height:16px; margin:2px 0 0; flex:none; accent-color:var(--accent); }
  .std-pricing { background:#faf6ee; border:1px solid #ece1cc; border-radius:10px; padding:12px 14px; margin:2px 0 16px; }
  .std-price-page-free { color:#4a7a4a; font-weight:600; }
  .std-price-row { display:flex; justify-content:space-between; gap:12px; font-size:0.82rem; color:var(--muted); padding:3px 0; }
  .std-price-row[hidden] { display:none; }
  .std-price-total { border-top:1px solid #e3d5b8; margin-top:5px; padding-top:8px; font-size:0.95rem; font-weight:700; color:var(--fg); }
  .std-info-popover { position:absolute; z-index:5; top:calc(100% + 8px); left:-6px; width:230px; max-width:60vw; background:#2b2620; color:#fff; font-size:0.76rem; font-weight:400; line-height:1.45; letter-spacing:normal; text-transform:none; padding:11px 13px; border-radius:10px; box-shadow:0 12px 28px -10px rgba(0,0,0,0.4); }
  .std-info-popover::before { content:""; position:absolute; top:-5px; left:10px; width:10px; height:10px; background:#2b2620; transform:rotate(45deg); }
</style>
</head>
<body>
<header>
  <div class="brand">Wed<span>Connect</span> Partner</div>
  <div style="display:flex; align-items:center; gap:16px;">
    <span class="who">${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</span>
    <a class="account-link" href="/partner/account">${t.account}</a>
    <form class="logout-form" method="POST" action="/api/reseller-logout"><button type="submit">${t.logout}</button></form>
  </div>
</header>
<main>
  ${error ? `<div class="error-box">${t.genericError}</div>` : ""}
  ${deleted ? `<div class="info-box">${t.coupleDeleted}</div>` : ""}
  ${stdOrdered ? `<div class="info-box">${t.stdOrdered}</div>` : ""}
  ${stdError ? `<div class="error-box">${escapeHtml(stdErrorMessages[stdError] || t.genericError)}</div>` : ""}
  ${
    createdCouple
      ? `<div class="success-banner" id="success-banner">
          <div class="success-emoji">🎉</div>
          <div class="success-body">
            <div class="success-title">${t.successTitle}</div>
            <div class="success-sub">${escapeHtml(createdCouple.par_neve)} · ${escapeHtml(`https://wedconnect.eu/${createdCouple.slug}`)}</div>
          </div>
          <div class="success-actions">
            <a class="success-view" href="${safeHref(`https://wedconnect.eu/${createdCouple.slug}`)}" target="_blank" rel="noopener">${t.viewPage}</a>
            <button type="button" class="btn-qr btn-copy" data-copy="${escapeHtml(`https://wedconnect.eu/${createdCouple.slug}`)}">${t.copyLink}</button>
            <button type="button" class="btn-qr" data-url="${escapeHtml(`https://wedconnect.eu/${createdCouple.slug}`)}" data-filename="${escapeHtml(createdCouple.slug)}-qr.png">${t.qrCode}</button>
          </div>
        </div>`
      : ""
  }
  ${
    parok && parok.length
      ? `<div class="stats-bar">
          <div class="stat">
            <div class="stat-value">${parok.length}</div>
            <div class="stat-label">${parok.length === 1 ? t.statPageSingular : t.statPagePlural}</div>
          </div>
          ${
            upcoming
              ? `<div class="stat">
                  <div class="stat-value">${t.daysUntilLabel(daysUntil(upcoming.eskuvo_datuma))}</div>
                  <div class="stat-label">${t.untilWeddingOf(escapeHtml(upcoming.par_neve))}</div>
                </div>`
              : ""
          }
        </div>`
      : ""
  }
  <div class="new-couple">
    <h2>${t.newCoupleHeading}</h2>
    <form method="POST" action="/api/couple-create" id="new-couple-form" novalidate>
      <div class="wizard-step" data-step="1">
        <p class="step-label">${t.step1Label}</p>
        <div class="field-row">
          <div><label>${t.brideName}</label><input type="text" name="nev1" id="f-nev1" required></div>
          <div><label>${t.groomName}</label><input type="text" name="nev2" id="f-nev2" required></div>
        </div>
        <div class="field-row">
          <div><label>${t.weddingDate}</label><input type="date" name="eskuvo_datuma" id="f-datum" required></div>
        </div>
        <div class="wizard-nav">
          <button type="button" class="btn-next" data-next="2">${t.next}</button>
        </div>
      </div>

      <div class="wizard-step" data-step="2" hidden>
        <p class="step-label">${t.step2Label}</p>
        <label>${t.ownMessage} <span class="hint-inline">${t.ownMessageHint}</span></label>
        <textarea name="egyedi_uzenet" id="f-uzenet" rows="3">${escapeHtml(defaultMessage)}</textarea>
        <label>${t.buttons} <span class="hint-inline">${t.buttonsHint}</span></label>
        <div id="button-rows">
          <div class="btn-row">
            <input type="text" name="gomb_label" placeholder="${t.buttonLabelPlaceholder}" autocomplete="off">
            <input type="url" name="gomb_url" placeholder="https://..." autocomplete="off">
            <button type="button" class="btn-remove-row" aria-label="${t.buttonRemoveAria}">×</button>
          </div>
        </div>
        <button type="button" class="btn-add-row" id="add-button-row">${t.addButton}</button>
        <div class="wizard-nav">
          <button type="button" class="btn-back" data-back="1">${t.back}</button>
          <button type="button" class="btn-next" data-next="3">${t.next}</button>
        </div>
      </div>

      <div class="wizard-step" data-step="3" hidden>
        <p class="step-label">${t.step3Label}</p>
        <p class="style-picker-hint">${t.stylePickerHint}</p>
        <p class="price-note">${t.priceNote(formatPrice(PAGE_PRICE, lang))}</p>
        <div class="style-picker" id="style-picker">${stylePicker}</div>
        <div class="wizard-nav">
          <button type="button" class="btn-back" data-back="2">${t.back}</button>
          <button type="submit">${t.createPage}</button>
        </div>
      </div>
    </form>
  </div>

  <h2>${t.yourCouples}</h2>
  ${
    parok && parok.length
      ? `<div class="search-row"><input type="text" id="couple-search" placeholder="${t.searchPlaceholder}"></div>`
      : ""
  }
  ${
    rows ||
    `<div class="empty-state">
      <div class="empty-emoji">💍</div>
      <div class="empty-title">${t.emptyTitle}</div>
      <div class="empty-text">${t.emptyText}</div>
    </div>`
  }
  ${parok && parok.length ? `<p class="empty" id="no-results" hidden>${t.noResults}</p>` : ""}
</main>

<dialog id="std-modal" class="std-modal">
  <button type="button" class="std-modal-close" aria-label="${t.modalClose}">&times;</button>
  <div class="std-modal-head">
    <h3 class="std-modal-title">${t.modalTitle}</h3>
    <p class="std-modal-subtitle" id="std-modal-subtitle"></p>
  </div>
  <div class="std-panel-body">
    <div class="std-stage">
      <div class="std-stage-bg">
        <div class="std-preview" id="std-modal-preview"></div>
        <div class="std-nfc-badge" id="std-nfc-badge" title="${t.infoPopover}">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="7.2" cy="16.8" r="1.4" fill="currentColor"/>
            <path d="M10.6 13.4a5 5 0 0 1 0 7.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M13.4 10.6a9 9 0 0 1 0 12.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M16.2 7.8a13 13 0 0 1 0 18.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span>+ WedConnect</span>
        </div>
      </div>
      <p class="std-stage-caption" id="std-stage-caption">${t.stageCaption}</p>
    </div>
    <form method="POST" action="/api/order-save-the-date" class="std-form">
      <input type="hidden" name="par_id" id="std-modal-par-id" value="">
      <div class="std-link-row">
        <label class="std-link-label">
          ${t.wedconnectLink}
          <span class="std-info-wrap">
            <button type="button" class="std-info-btn" id="std-info-btn" aria-label="${t.moreInfoAria}">i</button>
            <div class="std-info-popover" id="std-info-popover" hidden>${t.infoPopover}</div>
          </span>
        </label>
        <div class="std-link-value" id="std-modal-link"></div>
      </div>
      <label class="std-toggle-label">
        <input type="checkbox" id="std-modal-want-std">
        ${t.wantStdToggle} <span class="hint-inline">${t.wantStdHint()}</span>
      </label>
      <div id="std-qty-group" hidden>
        <label>${t.qtyLabel} <span class="hint-inline">${t.qtyHint(formatPrice(STD_PRICE, lang))}</span></label>
        <input type="number" name="mennyiseg" id="std-modal-menge" min="50" max="9999" value="50">
      </div>
      <div class="std-pricing">
        <div class="std-price-row"><span>${t.pageLine}<span id="std-price-page-note">${t.priceOnce}</span></span><span id="std-price-page">${formatPrice(PAGE_PRICE, lang)}</span></div>
        <div class="std-price-row" id="std-price-std-row" hidden><span>${t.stdLine(`<span id="std-price-qty">50</span>`, formatPrice(STD_PRICE, lang))}</span><span id="std-price-sub">${formatPrice(STD_PRICE, lang)}</span></div>
        <div class="std-price-row std-price-total"><span>${t.total}</span><span id="std-price-total">${formatPrice(PAGE_PRICE, lang)}</span></div>
      </div>
      <label>${t.vatLabel} <span class="hint-inline">${t.optional}</span></label>
      <input type="text" name="adoszam" id="std-modal-adoszam" placeholder="${t.vatPlaceholder}" value="${escapeHtml(defaultAdoszam)}">

      <label>${t.billingStreet}</label>
      <input type="text" name="szamlazasi_utca" id="std-modal-billing-utca" required value="${escapeHtml(defaultBilling.utca)}">
      <div class="field-row">
        <div>
          <label>${t.postalCode}</label>
          <input type="text" name="szamlazasi_irsz" id="std-modal-billing-irsz" required value="${escapeHtml(defaultBilling.irsz)}">
        </div>
        <div>
          <label>${t.city}</label>
          <input type="text" name="szamlazasi_varos" id="std-modal-billing-varos" required value="${escapeHtml(defaultBilling.varos)}">
        </div>
      </div>
      <label>${t.countryBilling}</label>
      <select name="szamlazasi_orszag" id="std-modal-billing-orszag">
        ${countryOptions(defaultBilling.orszag, lang)}
      </select>

      <div id="std-address-group" hidden>
        <label>${t.shippingStreet}</label>
        <input type="text" name="szallitasi_utca" id="std-modal-cim-utca" value="${escapeHtml(defaultShipping.utca)}">
        <div class="field-row">
          <div>
            <label>${t.postalCode}</label>
            <input type="text" name="szallitasi_irsz" id="std-modal-cim-irsz" value="${escapeHtml(defaultShipping.irsz)}">
          </div>
          <div>
            <label>${t.city}</label>
            <input type="text" name="szallitasi_varos" id="std-modal-cim-varos" value="${escapeHtml(defaultShipping.varos)}">
          </div>
        </div>
        <label>${t.countryShipping}</label>
        <select name="szallitasi_orszag" id="std-modal-cim-orszag">
          ${countryOptions(defaultShipping.orszag, lang)}
        </select>
      </div>
      <label>${t.note} <span class="hint-inline">${t.optional}</span></label>
      <textarea name="megjegyzes" rows="2" placeholder="${t.notePlaceholder}"></textarea>
      <button type="submit" class="btn-save btn-std-submit">${t.checkout}</button>
    </form>
  </div>
</dialog>
<script>
(function () {
  var DEFAULT_MESSAGE = ${defaultMessageForClient};
  var STYLES = ${stylesForClient};
  var FONT_RECIPES = ${fontRecipesForClient};
  var MAX_BUTTONS = 5;
  var CREATED_PAR_ID = ${createdCouple ? JSON.stringify(String(createdCouple.id)) : "null"};
  var DEFAULT_BILLING = ${JSON.stringify(defaultBilling)};
  var DEFAULT_SHIPPING = ${JSON.stringify(defaultShipping)};
  var DEFAULT_ADOSZAM = ${JSON.stringify(defaultAdoszam)};
  var COPY = {
    mockEyebrow: ${JSON.stringify(t.mockEyebrow)},
    copied: ${JSON.stringify(t.copied)},
    buttonLabelPlaceholder: ${JSON.stringify(t.buttonLabelPlaceholder)},
    buttonRemoveAria: ${JSON.stringify(t.buttonRemoveAria)},
    priceOnce: ${JSON.stringify(t.priceOnce)},
    priceFreeFrom50: ${JSON.stringify(t.priceFreeFrom50)},
    priceOnceUnder50: ${JSON.stringify(t.priceOnceUnder50)},
  };

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
      '<input type="text" name="gomb_label" placeholder="' + escapeHtml(COPY.buttonLabelPlaceholder) + '" autocomplete="off">' +
      '<input type="url" name="gomb_url" placeholder="https://..." autocomplete="off">' +
      '<button type="button" class="btn-remove-row" aria-label="' + escapeHtml(COPY.buttonRemoveAria) + '">×</button>';
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
        '<span class="mock-eyebrow">' + escapeHtml(COPY.mockEyebrow) + '</span>' +
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
        btn.textContent = COPY.copied;
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
  var stdModalLink = document.getElementById("std-modal-link");
  var stdInfoBtn = document.getElementById("std-info-btn");
  var stdInfoPopover = document.getElementById("std-info-popover");
  var stdModalMenge = document.getElementById("std-modal-menge");
  var stdWantStd = document.getElementById("std-modal-want-std");
  var stdQtyGroup = document.getElementById("std-qty-group");
  var stdAddressGroup = document.getElementById("std-address-group");
  var stdModalCimUtca = document.getElementById("std-modal-cim-utca");
  var stdModalCimIrsz = document.getElementById("std-modal-cim-irsz");
  var stdModalCimVaros = document.getElementById("std-modal-cim-varos");
  var stdModalCimOrszag = document.getElementById("std-modal-cim-orszag");
  var stdModalBillingUtca = document.getElementById("std-modal-billing-utca");
  var stdModalBillingIrsz = document.getElementById("std-modal-billing-irsz");
  var stdModalBillingVaros = document.getElementById("std-modal-billing-varos");
  var stdModalBillingOrszag = document.getElementById("std-modal-billing-orszag");
  var stdModalAdoszam = document.getElementById("std-modal-adoszam");
  var stdPriceQty = document.getElementById("std-price-qty");
  var stdPricePage = document.getElementById("std-price-page");
  var stdPricePageNote = document.getElementById("std-price-page-note");
  var stdPriceStdRow = document.getElementById("std-price-std-row");
  var stdPriceSub = document.getElementById("std-price-sub");
  var stdPriceTotal = document.getElementById("std-price-total");
  var stdNfcBadge = document.getElementById("std-nfc-badge");
  var stdStageCaption = document.getElementById("std-stage-caption");
  var PAGE_PRICE = ${PAGE_PRICE};
  var STD_PRICE = ${STD_PRICE};
  var CURRENCY = ${JSON.stringify(pricing.currency)};
  var PRICE_LOCALE = ${JSON.stringify(lang === "hu" ? "hu-HU" : lang === "en" ? "en-US" : "de-DE")};
  var currentCouple = {};

  function formatPrice(n) {
    var opts = { style: "currency", currency: CURRENCY };
    if (CURRENCY === "HUF") opts.maximumFractionDigits = 0;
    return new Intl.NumberFormat(PRICE_LOCALE, opts).format(n);
  }

  function renderPageMock(nev1, nev2, datum, stilusId, uzenet, gombokJson) {
    var style = STYLES.filter(function (s) {
      return s.id === stilusId;
    })[0] || STYLES[0];
    if (!style) return;
    var recipe = FONT_RECIPES[style.font] || FONT_RECIPES.sans;
    var namesFontSize = style.font === "script" || style.font === "hand" ? "2rem" : "1.5rem";
    var namesText = (nev1 || "") + " & " + (nev2 || "");
    var dateText = "";
    if (datum) {
      var parts = datum.split("-");
      if (parts.length === 3) dateText = parts[0] + "." + parts[1] + "." + parts[2] + ".";
    }
    var gombok = [];
    try {
      gombok = JSON.parse(gombokJson || "[]");
    } catch (e) {
      gombok = [];
    }
    var buttonsHtml = gombok.length
      ? '<span class="mock-buttons">' +
        gombok
          .map(function (b) {
            return '<span class="mock-btn">' + escapeHtml(b) + "</span>";
          })
          .join("") +
        "</span>"
      : "";
    var varsStyle =
      "--bg:" + style.bg + ";--fg:" + style.fg + ";--accent:" + style.accent + ";--accent-text:" + style.accentText + ";--btn-fg:" + style.btnFg + ";";
    stdModalPreview.innerHTML =
      '<div class="swatch-mock std-preview-page" style="' + varsStyle + '">' +
      '<span class="mock-eyebrow">' + escapeHtml(COPY.mockEyebrow) + '</span>' +
      '<span class="mock-names" style="' + recipe + " font-size:" + namesFontSize + ';">' + escapeHtml(namesText) + "</span>" +
      (dateText ? '<span class="mock-date">' + escapeHtml(dateText) + "</span>" : "") +
      '<span class="mock-message">' + escapeHtml(uzenet || "") + "</span>" +
      buttonsHtml +
      "</div>";
  }

  function updateStdPreviewMode(wantStd) {
    if (stdNfcBadge) stdNfcBadge.hidden = !wantStd;
    if (stdStageCaption) stdStageCaption.hidden = !wantStd;
    if (wantStd) {
      renderStdPreview(currentCouple.nev1, currentCouple.nev2, currentCouple.datum, currentCouple.nyelv);
    } else {
      renderPageMock(currentCouple.nev1, currentCouple.nev2, currentCouple.datum, currentCouple.stilus, currentCouple.uzenet, currentCouple.gombok);
    }
  }

  function updateStdPricing() {
    var wantStd = stdWantStd.checked;
    stdQtyGroup.hidden = !wantStd;
    stdAddressGroup.hidden = !wantStd;
    if (stdModalCimUtca) stdModalCimUtca.required = wantStd;
    if (stdModalCimIrsz) stdModalCimIrsz.required = wantStd;
    if (stdModalCimVaros) stdModalCimVaros.required = wantStd;
    stdPriceStdRow.hidden = !wantStd;
    updateStdPreviewMode(wantStd);

    if (!wantStd) {
      stdModalMenge.value = "0";
      stdPricePage.textContent = formatPrice(PAGE_PRICE);
      stdPricePage.className = "";
      stdPricePageNote.textContent = COPY.priceOnce;
      stdPriceTotal.textContent = formatPrice(PAGE_PRICE);
      return;
    }

    var qty = parseInt(stdModalMenge.value, 10);
    if (!qty || qty < 1) {
      qty = 1;
    }
    var sub = qty * STD_PRICE;
    var pageFree = qty >= 50;
    stdPriceQty.textContent = qty;
    stdPriceSub.textContent = formatPrice(sub);
    stdPricePage.textContent = pageFree ? formatPrice(0) : formatPrice(PAGE_PRICE);
    stdPricePage.className = pageFree ? "std-price-page-free" : "";
    stdPricePageNote.textContent = pageFree ? COPY.priceFreeFrom50 : COPY.priceOnceUnder50;
    stdPriceTotal.textContent = formatPrice((pageFree ? 0 : PAGE_PRICE) + sub);
  }

  function clampStdQty() {
    var qty = parseInt(stdModalMenge.value, 10);
    if (!qty || qty < 50) qty = 50;
    if (qty > 9999) qty = 9999;
    stdModalMenge.value = qty;
    updateStdPricing();
  }

  if (stdModalMenge) {
    stdModalMenge.addEventListener("input", updateStdPricing);
    stdModalMenge.addEventListener("blur", clampStdQty);
  }
  if (stdWantStd) stdWantStd.addEventListener("change", updateStdPricing);

  var stdOrderForm = stdModal ? stdModal.querySelector(".std-form") : null;
  if (stdOrderForm) {
    stdOrderForm.addEventListener("submit", function () {
      if (stdWantStd && stdWantStd.checked) clampStdQty();
    });
  }

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
      currentCouple = {
        nev1: nev1,
        nev2: nev2,
        datum: datum,
        nyelv: nyelv,
        stilus: btn.getAttribute("data-stilus"),
        uzenet: btn.getAttribute("data-uzenet"),
        gombok: btn.getAttribute("data-gombok"),
      };
      stdModalParId.value = btn.getAttribute("data-par-id");
      stdModalSubtitle.textContent = nev1 + " & " + nev2;
      stdModalLink.textContent = btn.getAttribute("data-url");
      if (stdInfoPopover) stdInfoPopover.hidden = true;
      if (stdWantStd) stdWantStd.checked = true;
      if (stdModalMenge) stdModalMenge.value = "50";
      if (stdModalAdoszam) stdModalAdoszam.value = DEFAULT_ADOSZAM;
      if (stdModalBillingUtca) stdModalBillingUtca.value = DEFAULT_BILLING.utca;
      if (stdModalBillingIrsz) stdModalBillingIrsz.value = DEFAULT_BILLING.irsz;
      if (stdModalBillingVaros) stdModalBillingVaros.value = DEFAULT_BILLING.varos;
      if (stdModalBillingOrszag) stdModalBillingOrszag.value = DEFAULT_BILLING.orszag;
      if (stdModalCimUtca) stdModalCimUtca.value = DEFAULT_SHIPPING.utca;
      if (stdModalCimIrsz) stdModalCimIrsz.value = DEFAULT_SHIPPING.irsz;
      if (stdModalCimVaros) stdModalCimVaros.value = DEFAULT_SHIPPING.varos;
      if (stdModalCimOrszag) stdModalCimOrszag.value = DEFAULT_SHIPPING.orszag;
      updateStdPricing();
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

  if (stdInfoBtn && stdInfoPopover) {
    stdInfoBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      stdInfoPopover.hidden = !stdInfoPopover.hidden;
    });
    document.addEventListener("click", function (e) {
      if (!stdInfoPopover.hidden && e.target !== stdInfoBtn && !stdInfoPopover.contains(e.target)) {
        stdInfoPopover.hidden = true;
      }
    });
  }

  if (document.getElementById("success-banner")) {
    launchConfetti();
    var cleanUrl = location.pathname;
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", cleanUrl);
    }
    if (CREATED_PAR_ID) {
      setTimeout(function () {
        var btn = document.querySelector('.btn-std-open[data-par-id="' + CREATED_PAR_ID + '"]');
        if (btn) btn.click();
      }, 900);
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
