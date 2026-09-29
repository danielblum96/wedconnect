import { STYLES, FONT_RECIPES, namesFontSize, getStyleName } from "./styles.js";
import { escapeHtml } from "./html.js";
import { DIVIDER_KEYS, dividerHtml } from "./dividers.js";
import { envelopePalette } from "./envelopeIntro.js";

// Az esküvői oldalon belüli szerkesztő mód (?szerkesztes=1). CSAK a belépett
// tulajdonos partnernek jelenik meg (a functions/[slug].js ellenőrzi), a
// nyilvános látogatók az oldalt a régi módon kapják. Szekciónként (borítókép,
// üzenet, program, gombok) egy kis szerkesztő panel nyílik, a stílus külön
// "Design" panelen élő előnézettel; a mentés a /api/couple-section-update
// végponton megy (szekciónként), a fotó a meglévő couple-photo-* végpontokon.

export const EDIT_MAX_EVENTS = 8;
export const EDIT_MAX_BUTTONS = 5;
export const EDIT_MAX_LOCATIONS = 2;

// Egy szekció becsomagolása: szerkesztő módban kattintható zóna ceruza-címkével (és húzó-fogantyúval /
// eltávolító gombbal). Az ÜRES (még nem hozzáadott) elem NEM jelenik meg az oldalon: azt csak a bal oldali
// "Elemek" oszlopból lehet hozzáadni.
export function editZone(name, contentHtml, { edit, empty, penLabel, sortable, dragLabel, removable, removeLabel }) {
  if (!edit) return contentHtml;
  if (empty) return "";
  return `<div class="wc-zone" id="zone-${name}" data-open="panel-${name}" role="button" tabindex="0" aria-label="${escapeHtml(penLabel)}">${contentHtml}<span class="wc-tools"><span class="wc-pen">✎ ${escapeHtml(penLabel)}</span>${
    removable ? `<button type="button" class="wc-del" data-remove-el="${name}" aria-label="${escapeHtml(removeLabel)}" title="${escapeHtml(removeLabel)}">✕</button>` : ""
  }</span>${
    sortable ? `<span class="wc-drag" role="button" tabindex="0" aria-label="${escapeHtml(dragLabel)}" title="${escapeHtml(dragLabel)}">⠿</span>` : ""
  }</div>`;
}

export const editorCss = `
  body.wc-editing { padding-top: 76px; }
  .wc-bar { position:fixed; top:0; left:0; right:0; z-index:9999; display:flex; align-items:center; gap:8px; padding:9px 12px; background:#2b2620; color:#fff; font:600 13px/1.3 "Poppins",Arial,sans-serif; text-align:left; }
  .wc-bar-title { flex:1; min-width:0; }
  .wc-bar form { margin:0; }
  .wc-pill { font:600 12px/1 "Poppins",Arial,sans-serif; padding:9px 12px; border-radius:999px; background:rgba(255,255,255,0.14); white-space:nowrap; }
  .wc-bar-title small { display:block; font-weight:400; opacity:0.7; font-size:11px; }
  .wc-bar a, .wc-bar button { font:600 13px/1 "Poppins",Arial,sans-serif; border-radius:999px; padding:9px 14px; cursor:pointer; text-decoration:none; white-space:nowrap; border:1px solid rgba(255,255,255,0.45); background:transparent; color:#fff; }
  .wc-bar .wc-bar-primary { background:linear-gradient(135deg,#f0c988,#b48b56); border-color:transparent; color:#1a1408; }
  .wc-zone { position:relative; cursor:pointer; outline:1.5px dashed rgba(120,120,120,0.7); outline-offset:6px; border-radius:4px; margin-bottom:30px; padding:18px 8px 4px; scroll-margin-top:90px; }
  .wc-zone:hover, .wc-zone:focus-visible { outline-color:#b48b56; outline-width:2px; }
  .wc-zone .cover-photo { margin-bottom:0; }
  .wc-zone-empty { margin-bottom:30px; }
  .wc-zone-placeholder { display:flex; align-items:center; justify-content:center; min-height:72px; padding:14px; text-align:center; font:500 0.95rem/1.4 "Poppins",sans-serif; color:var(--fg); opacity:0.8; }
  .wc-tools { position:absolute; top:-13px; right:-4px; z-index:5; display:flex; gap:6px; align-items:center; }
  .wc-del { border:none; cursor:pointer; background:#2b2620; color:#fff; border-radius:999px; width:26px; height:24px; font:600 11px/1 Arial,sans-serif; box-shadow:0 3px 8px rgba(0,0,0,0.25); }
  .wc-del:hover { background:#b1451f; }
  .wc-pen { position:static; z-index:5; background:#2b2620; color:#fff; border-radius:999px; padding:4px 11px; font:600 11px/1.4 "Poppins",Arial,sans-serif; letter-spacing:0.02em; box-shadow:0 3px 8px rgba(0,0,0,0.25); }
  .wc-zone a { pointer-events:none; }
  .wc-dlg { border:none; border-radius:16px; padding:22px 20px 18px; width:min(560px, calc(100vw - 24px)); max-height:88vh; overflow:auto; background:#fff; color:#2b2620; text-align:left; font:400 15px/1.5 "Poppins",Arial,sans-serif; box-shadow:0 24px 60px -20px rgba(0,0,0,0.5); }
  .wc-dlg::backdrop { background:rgba(20,16,12,0.5); }
  .wc-dlg h3 { margin:0 0 6px; font:600 1.15rem/1.3 "Poppins",Arial,sans-serif; }
  .wc-dlg .wc-hint { margin:0 0 14px; color:#7a7266; font-size:0.88rem; }
  .wc-dlg label { display:block; font-size:0.85rem; font-weight:500; margin:0 0 4px; }
  .wc-dlg input[type=text], .wc-dlg input[type=time], .wc-dlg textarea { width:100%; padding:10px 12px; border:1px solid #ddd6c9; border-radius:8px; font:inherit; font-size:16px; margin-bottom:10px; background:#fff; color:#2b2620; box-sizing:border-box; }
  .wc-dlg textarea { min-height:90px; resize:vertical; }
  .wc-chips { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 12px; }
  .wc-chips .wc-chips-label { width:100%; font-size:0.8rem; font-weight:600; color:#7a7266; }
  .wc-chip { border:1px solid #ddd6c9; background:#fff; color:#2b2620; border-radius:999px; padding:6px 12px; font:500 0.85rem/1.2 "Poppins",Arial,sans-serif; cursor:pointer; }
  .wc-chip:hover { border-color:#b48b56; background:#faf6ee; }
  .wc-row { display:grid; grid-template-columns:118px 1fr; gap:8px; }
  .wc-row-btn { grid-template-columns:1fr 1fr; }
  .wc-row[hidden] { display:none; }
  .wc-add-row { border:1px dashed #ddd6c9; background:none; color:#8c6d34; border-radius:8px; padding:8px 14px; font:600 0.88rem/1 "Poppins",Arial,sans-serif; cursor:pointer; margin-bottom:6px; }
  .wc-foot { display:flex; gap:10px; justify-content:flex-end; align-items:center; margin-top:12px; flex-wrap:wrap; }
  .wc-btn-primary { border:none; border-radius:999px; padding:11px 26px; background:linear-gradient(135deg,#f0c988,#b48b56); color:#1a1408; font:600 0.95rem/1 "Poppins",Arial,sans-serif; cursor:pointer; }
  .wc-btn-ghost { border:none; background:none; color:#7a7266; padding:11px 14px; font:600 0.95rem/1 "Poppins",Arial,sans-serif; cursor:pointer; }
  .wc-btn-danger { border:1px solid #e0b8ac; background:none; color:#b1451f; border-radius:999px; padding:9px 16px; font:600 0.85rem/1 "Poppins",Arial,sans-serif; cursor:pointer; }
  .wc-photo-preview { display:block; max-width:100%; max-height:220px; margin:0 auto 12px; border-radius:6px; }
  .wc-photo-drop { position:relative; border:2px dashed #ddd6c9; border-radius:10px; padding:22px 12px; text-align:center; color:#7a7266; font-size:0.9rem; margin-bottom:10px; }
  .wc-photo-drop input[type=file] { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; }
  .wc-status { font-size:0.85rem; color:#7a7266; }
  .wc-status.error { color:#b1451f; }
  #panel-design { z-index:9998; position:fixed; inset:auto 0 0 0; margin:0 auto 10px; max-height:52vh; }
  #panel-design::backdrop { background:transparent; }
  .wc-bar-icon { display:none; }
  .wc-drag { position:absolute; top:-13px; left:-4px; z-index:5; min-width:38px; text-align:center; background:#2b2620; color:#fff; border-radius:999px; padding:3px 12px; font:600 15px/1.5 "Poppins",Arial,sans-serif; cursor:grab; touch-action:none; user-select:none; box-shadow:0 3px 8px rgba(0,0,0,0.25); }
  .wc-drag:focus-visible { outline:2px solid #b48b56; outline-offset:2px; }
  .wc-zone.wc-dragging { z-index:30; will-change:transform; outline:2px solid #b48b56; background:var(--bg); box-shadow:0 16px 40px rgba(0,0,0,0.35); opacity:0.94; }
  body.wc-drag-mode, body.wc-drag-mode * { cursor:grabbing !important; user-select:none !important; }
  #wc-drop-line { position:fixed; height:4px; border-radius:2px; background:#b48b56; z-index:9996; pointer-events:none; box-shadow:0 0 0 2px rgba(255,255,255,0.7); }
  #wc-drop-line[hidden] { display:none; }
  .wc-styles { display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; margin-bottom:6px; }
  @media (min-width:520px) { .wc-styles { grid-template-columns:repeat(3, 1fr); } }
  .wc-style { display:flex; align-items:center; gap:8px; border:2px solid transparent; outline:1px solid #ddd6c9; border-radius:10px; padding:10px; cursor:pointer; font:600 0.8rem/1.2 "Poppins",Arial,sans-serif; text-align:left; }
  .wc-style .wc-dot { width:14px; height:14px; border-radius:50%; flex:none; box-shadow:0 0 0 1px rgba(255,255,255,0.6); }
  .wc-style.selected { border-color:#b48b56; outline-color:#b48b56; }
  .wc-form .wc-foot { position:sticky; bottom:-18px; background:#fff; padding:10px 0 2px; z-index:2; }
  .wc-error { background:#fdeee7; color:#b1451f; border:1px solid #f3c8b3; border-radius:8px; padding:9px 12px; font-size:0.85rem; margin:4px 0 8px; }
  .wc-error[hidden] { display:none; }
  .wc-chip.selected { background:#2b2620; border-color:#2b2620; color:#fff; }
  .wc-crop { position:relative; max-width:320px; margin:0 auto 8px; touch-action:none; cursor:crosshair; border-radius:6px; overflow:hidden; line-height:0; }
  .wc-crop-img { display:block; width:100%; height:auto; user-select:none; -webkit-user-drag:none; }
  .wc-crop-dot { position:absolute; width:20px; height:20px; border:2px solid #fff; border-radius:50%; box-shadow:0 0 0 1.5px #2b2620; transform:translate(-50%,-50%); pointer-events:none; }
  .wc-tip { position:fixed; left:50%; bottom:18px; transform:translateX(-50%); z-index:9997; max-width:min(92vw, 460px); display:flex; gap:10px; align-items:center; background:#2b2620; color:#fff; padding:10px 12px 10px 16px; border-radius:14px; font:500 13px/1.4 "Poppins",Arial,sans-serif; box-shadow:0 10px 30px rgba(0,0,0,0.35); text-align:left; }
  .wc-tip[hidden] { display:none; }
  .wc-tip button { flex:none; border:none; background:rgba(255,255,255,0.16); color:#fff; border-radius:999px; width:26px; height:26px; cursor:pointer; font-size:12px; }
  @keyframes wc-up { from { transform:translateY(36px); opacity:0; } to { transform:none; opacity:1; } }
  @media (max-width:520px) {
    .wc-dlg:not(#panel-design) { position:fixed; inset:auto 0 0 0; margin:0; width:100%; max-width:100%; max-height:90vh; max-height:90dvh; border-radius:18px 18px 0 0; padding-bottom:calc(14px + env(safe-area-inset-bottom)); animation:wc-up 0.22s ease-out; }
    .wc-tip { bottom:14px; }
  }
  .wc-opening { display:flex; flex-direction:column; gap:7px; margin:4px 0 10px; }
  .wc-opening label { display:flex; align-items:center; gap:8px; margin:0; font-weight:600; font-size:0.9rem; cursor:pointer; }
  .wc-opening input { width:18px; height:18px; margin:0; accent-color:#b48b56; }
  .wc-env-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:10px 0 2px; }
  .wc-check { display:flex; align-items:center; gap:8px; font-weight:600; font-size:0.9rem; cursor:pointer; margin:0 !important; }
  .wc-check input { width:18px; height:18px; margin:0; accent-color:#b48b56; }
  .wc-div-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:10px; margin-bottom:8px; }
  @media (min-width:520px) { .wc-div-grid { grid-template-columns:repeat(3, 1fr); } }
  .wc-div-tile { position:relative; display:block; cursor:pointer; margin:0 !important; }
  .wc-div-tile input { position:absolute; opacity:0; inset:0; margin:0; cursor:pointer; }
  .wc-div-prev { display:flex; align-items:center; justify-content:center; min-height:64px; padding:10px 8px; border-radius:10px; border:2px solid transparent; outline:1px solid #ddd6c9; background:var(--bg); color:var(--accent-text); }
  .wc-div-prev .divider { margin:0; max-width:none; width:100%; gap:8px; }
  .wc-div-none { font-size:1.1rem; opacity:0.6; }
  .wc-div-tile input:checked ~ .wc-div-prev { border-color:#b48b56; outline-color:#b48b56; }
  .wc-div-tile input:focus-visible ~ .wc-div-prev { outline:2px solid #2b2620; }
  .wc-div-name { display:block; text-align:center; font-size:0.8rem; font-weight:600; margin-top:5px; }
  .wc-zone .cover-wrap { margin: 0; }
  #zone-photo { padding: 0; margin: 0 -30px 16px; }
  .card > #zone-photo:first-child { margin-top: -46px; }
  .wc-story-row { border:1px solid #ece4d6; border-radius:10px; padding:12px 12px 4px; margin-bottom:12px; }
  .wc-story-top { display:flex; gap:8px; align-items:flex-start; }
  .wc-story-top input { flex:1; min-width:0; }
  .wc-dlg .wc-story-top input[type=date] { flex:1 1 0; width:auto; min-width:0; }
  .wc-story-tools { display:flex; gap:4px; flex:none; }
  .wc-story-tools button { width:32px; height:40px; border:1px solid #ddd6c9; background:#fff; border-radius:8px; cursor:pointer; color:#2b2620; font-size:13px; }
  .wc-story-row textarea { min-height:64px; }
  .wc-side { position:fixed; left:0; top:52px; bottom:0; width:300px; z-index:9990; background:#fff; color:#2b2620; border-right:1px solid #e6dfd0; overflow:auto; padding:18px 16px 24px; text-align:left; font:400 14px/1.45 "Poppins",Arial,sans-serif; }
  .wc-side h2 { margin:0 0 4px; font:600 1.05rem/1.3 "Poppins",Arial,sans-serif; }
  .wc-side .wc-hint { margin:0 0 14px; }
  .wc-el { display:flex; align-items:center; gap:12px; width:100%; margin:0 0 10px; padding:12px; border:1px solid #e6dfd0; border-radius:12px; background:#fff; color:#2b2620; text-align:left; cursor:pointer; font:inherit; }
  .wc-el:hover { border-color:#b48b56; background:#faf6ee; }
  .wc-el .wc-el-ico { flex:none; width:38px; height:38px; display:flex; align-items:center; justify-content:center; font-size:19px; border-radius:10px; background:#f6efe0; }
  .wc-el .wc-el-txt { flex:1; min-width:0; }
  .wc-el .wc-el-txt b { display:block; font-size:0.92rem; font-weight:600; }
  .wc-el .wc-el-txt small { display:block; color:#7a7266; font-size:0.78rem; line-height:1.35; }
  .wc-el .wc-el-state { flex:none; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#f0c988,#b48b56); color:#1a1408; font-weight:700; font-size:14px; }
  .wc-el.on { background:#faf9f5; }
  .wc-el.on .wc-el-state { background:#e6efe0; color:#3d6b2e; }
  .wc-side-backdrop { display:none; }
  .wc-ghost { position:fixed; z-index:10001; pointer-events:none; transform:translate(14px,14px); background:#fff; color:#2b2620; border:1.5px solid #b48b56; border-radius:10px; padding:8px 14px; font:600 13px/1.3 "Poppins",Arial,sans-serif; box-shadow:0 12px 30px rgba(0,0,0,0.3); }
  @media (min-width:900px) { body.wc-editing { padding-left:300px; } .wc-bar-elements { display:none !important; } }
  @media (min-width:900px) {
    /* Asztali nézetben a Design panel a bal oszlopba nyílik (az Elemek helyére), így az oldal jobb oldalt végig látszik. */
    #panel-design { inset:52px auto 0 0; width:300px; max-width:300px; height:calc(100vh - 52px); max-height:none; margin:0; border-radius:0; border-right:1px solid #e6dfd0; box-shadow:8px 0 30px -14px rgba(0,0,0,0.25); z-index:9995; padding:18px 16px 18px; }
    #panel-design .wc-styles { grid-template-columns:repeat(2, 1fr); }
    #panel-design .wc-style { padding:9px 8px; font-size:0.74rem; gap:6px; }
  }
  @media (max-width:899px) {
    .wc-side { top:46px; width:min(86vw, 340px); transform:translateX(-104%); transition:transform 0.22s ease; box-shadow:8px 0 30px rgba(0,0,0,0.25); }
    .wc-side.open { transform:none; }
    .wc-side-backdrop.open { display:block; position:fixed; inset:46px 0 0 0; z-index:9989; background:rgba(20,16,12,0.4); }
  }
  .wc-toast.error { background:#b1451f; }
  .wc-loc-block { border:1px solid #ece4d6; border-radius:10px; padding:12px 12px 2px; margin-bottom:10px; }
  .wc-loc-block[hidden] { display:none; }
  .wc-dlg input[type=date] { width:100%; padding:10px 12px; border:1px solid #ddd6c9; border-radius:8px; font:inherit; font-size:16px; margin-bottom:10px; background:#fff; color:#2b2620; box-sizing:border-box; }
  .wc-toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:10000; background:#2b2620; color:#fff; padding:10px 20px; border-radius:999px; font:600 13px/1.3 "Poppins",Arial,sans-serif; box-shadow:0 8px 24px rgba(0,0,0,0.3); }
  @media (max-width:520px) { .wc-bar-lbl { display:none; } .wc-bar-icon { display:inline; } .wc-bar { padding:8px 8px; gap:5px; justify-content:center; } .wc-bar a, .wc-bar button, .wc-pill { padding:8px 10px; font-size:12px; } .wc-bar-title { display:none; } body.wc-editing { padding-top:60px; } }
`;

function toolbar({ par, t, previewHref, isDraft, freeEligible }) {
  const pubLabel = freeEligible ? t.publishFree : t.publishNow;
  const cut = pubLabel.indexOf(" (");
  const pubHtml = cut > 0 ? `${escapeHtml(pubLabel.slice(0, cut))}<span class="wc-bar-lbl">${escapeHtml(pubLabel.slice(cut))}</span>` : escapeHtml(pubLabel);
  const publish = isDraft
    ? `<form method="POST" action="/api/couple-pay"><input type="hidden" name="par_id" value="${par.id}"><button type="submit" class="wc-bar-primary">${pubHtml}</button></form>`
    : `<span class="wc-pill">${escapeHtml(t.editorPublished)}</span>`;
  return `<div class="wc-bar" data-par-id="${par.id}">
    <div class="wc-bar-title">✎ ${escapeHtml(t.editorBadge)}<small>${escapeHtml(t.editorBadgeHint)}${isDraft ? " · " + escapeHtml(t.draftLabel) : ""}</small></div>
    <button type="button" class="wc-bar-elements" data-toggle-side aria-label="${escapeHtml(t.editorElements)}">＋<span class="wc-bar-lbl"> ${escapeHtml(t.editorElements)}</span></button>
    <button type="button" data-open="panel-design" aria-label="${escapeHtml(t.editorDesign)}">🎨<span class="wc-bar-lbl"> ${escapeHtml(t.editorDesign)}</span></button>
    <a href="${escapeHtml(previewHref)}">${escapeHtml(t.editorPreview)}</a>
    <a href="/partner/dashboard">${escapeHtml(t.editorDone)}</a>
    ${publish}
  </div>`;
}

function chips(label, items, attr) {
  return `<div class="wc-chips"><span class="wc-chips-label">${escapeHtml(label)}</span>${items
    .map((s) => `<button type="button" class="wc-chip" ${attr}="${escapeHtml(s)}">${escapeHtml(s)}</button>`)
    .join("")}</div>`;
}

function footer(t) {
  return `<div class="wc-foot"><button type="button" class="wc-btn-ghost" data-close>${escapeHtml(t.editorCancel)}</button><button type="submit" class="wc-btn-primary">${escapeHtml(t.save)}</button></div>`;
}

function panelForm(parId, section, body, t) {
  return `<form class="wc-form" method="POST" action="/api/couple-section-update"><input type="hidden" name="par_id" value="${parId}"><input type="hidden" name="section" value="${section}">${body}<div class="wc-error" hidden></div>${footer(t)}</form>`;
}

function panels({ par, slug, t, lang, gombok, esemenyek, helyek, fotoBeallitas, nyitoOn, envelopeMessage, dividerKey, eyebrowText, storyItems, countdownOn, countdownTime, nev1, nev2, hasPhoto, photoVersion, currentStyleId }) {
  const eventVisible = Math.min(EDIT_MAX_EVENTS, Math.max(esemenyek.length + 1, 2));
  const eventRows = Array.from({ length: EDIT_MAX_EVENTS }, (_, i) => {
    const ev = esemenyek[i] || { ido: "", nev: "" };
    return `<div class="wc-row wc-event-row"${i >= eventVisible ? " hidden" : ""}>
      <input type="time" name="esemeny_ido" value="${escapeHtml(ev.ido)}" aria-label="${escapeHtml(t.eventTimeLabel)}">
      <input type="text" name="esemeny_nev" placeholder="${escapeHtml(t.eventNamePlaceholder)}" value="${escapeHtml(ev.nev)}" maxlength="100" autocomplete="off">
    </div>`;
  }).join("");

  const buttonVisible = Math.min(EDIT_MAX_BUTTONS, Math.max(gombok.length + 1, 2));
  const buttonRows = Array.from({ length: EDIT_MAX_BUTTONS }, (_, i) => {
    const g = gombok[i] || { label: "", url: "" };
    return `<div class="wc-row wc-row-btn wc-button-row"${i >= buttonVisible ? " hidden" : ""}>
      <input type="text" name="gomb_label" placeholder="${escapeHtml(t.buttonLabelPlaceholder)}" value="${escapeHtml(g.label)}" maxlength="60" autocomplete="off">
      <input type="text" name="gomb_url" placeholder="https://..." value="${escapeHtml(g.url)}" maxlength="500" autocomplete="off">
    </div>`;
  }).join("");

  const locVisible = Math.min(EDIT_MAX_LOCATIONS, Math.max(helyek.length, 1));
  const locBlocks = Array.from({ length: EDIT_MAX_LOCATIONS }, (_, i) => {
    const h = helyek[i] || { cimke: "", nev: "", cim: "", terkep: "" };
    return `<div class="wc-loc-block"${i >= locVisible ? " hidden" : ""}>
      <input type="text" name="hely_cimke" list="wc-loc-labels" placeholder="${escapeHtml(t.editorLocLabel)}" value="${escapeHtml(h.cimke)}" maxlength="40" autocomplete="off">
      <input type="text" name="hely_nev" placeholder="${escapeHtml(t.editorLocName)}" value="${escapeHtml(h.nev)}" maxlength="100" autocomplete="off">
      <input type="text" name="hely_cim" placeholder="${escapeHtml(t.editorLocAddress)}" value="${escapeHtml(h.cim)}" maxlength="200" autocomplete="off">
      <input type="text" name="hely_terkep" placeholder="${escapeHtml(t.editorLocMap)}" value="${escapeHtml(h.terkep)}" maxlength="500" autocomplete="off">
    </div>`;
  }).join("");

  const styleButtons = STYLES.map(
    (s) =>
      `<button type="button" class="wc-style${s.id === currentStyleId ? " selected" : ""}" data-style="${s.id}" style="background:${s.bg}; color:${s.fg};"><span class="wc-dot" style="background:${s.accent}"></span>${escapeHtml(getStyleName(s, lang))}</button>`
  ).join("");

  const storyRow = (it) => `<div class="wc-story-row">
      <input type="hidden" name="story_id" value="${escapeHtml(it.id || "")}">
      <div class="wc-story-top">
        <input type="date" name="story_datum" value="${escapeHtml(/^\d{4}-\d{2}-\d{2}$/.test(it.datum || "") ? it.datum : "")}" aria-label="${escapeHtml(t.editorStoryDate)}">
        <span class="wc-story-tools"><button type="button" data-story-move="-1" aria-label="${escapeHtml(t.editorStoryUp)}">▲</button><button type="button" data-story-move="1" aria-label="${escapeHtml(t.editorStoryDown)}">▼</button><button type="button" data-story-remove aria-label="${escapeHtml(t.editorStoryRemove)}" title="${escapeHtml(t.editorStoryRemove)}">✕</button></span>
      </div>
      <input type="text" name="story_cim" maxlength="100" placeholder="${escapeHtml(t.editorStoryTitle)}" value="${escapeHtml(it.cim || "")}" autocomplete="off">
      <textarea name="story_szoveg" maxlength="500" rows="3" placeholder="${escapeHtml(t.editorStoryText)}">${escapeHtml(it.szoveg || "")}</textarea>
    </div>`;

  const dlg = (id, title, body, extra = "") =>
    `<dialog class="wc-dlg" id="panel-${id}"${extra}><h3>${escapeHtml(title)}</h3>${body}</dialog>`;

  return [
    dlg(
      "photo",
      t.editorTitlePhoto,
      `<p class="wc-hint">${escapeHtml(t.photoExplain)}</p>
      <div id="wc-photo" data-par-id="${par.id}" data-slug="${escapeHtml(slug)}">
        <div class="wc-photo-drop">${escapeHtml(hasPhoto ? t.editorPhotoChange : t.photoDropHint)}<input type="file" accept="image/*" id="wc-photo-input"></div>
        <div class="wc-status" id="wc-photo-status"></div>
        ${
          hasPhoto
            ? `<form class="wc-form" method="POST" action="/api/couple-section-update">
          <input type="hidden" name="par_id" value="${par.id}"><input type="hidden" name="section" value="photo">
          <input type="hidden" name="foto_arany" id="wc-arany" value="${fotoBeallitas ? fotoBeallitas.arany : "orig"}">
          <input type="hidden" name="foto_x" id="wc-foto-x" value="${fotoBeallitas ? fotoBeallitas.x : 50}">
          <input type="hidden" name="foto_y" id="wc-foto-y" value="${fotoBeallitas ? fotoBeallitas.y : 50}">
          <label>${escapeHtml(t.editorCropRatio)}</label>
          <div class="wc-chips">
            <button type="button" class="wc-chip${fotoBeallitas ? "" : " selected"}" data-ratio="orig">${escapeHtml(t.editorCropOriginal)}</button>
            ${["3/2", "4/3", "1/1", "16/9"].map((r) => `<button type="button" class="wc-chip${fotoBeallitas && fotoBeallitas.arany === r ? " selected" : ""}" data-ratio="${r}">${r.replace("/", ":")}</button>`).join("")}
          </div>
          <div class="wc-crop"><img class="wc-crop-img" src="/foto/${encodeURIComponent(slug)}?v=${encodeURIComponent(photoVersion)}" alt=""${fotoBeallitas ? ` style="aspect-ratio:${fotoBeallitas.arany};object-fit:cover;object-position:${fotoBeallitas.x}% ${fotoBeallitas.y}%"` : ""}><span class="wc-crop-dot"${fotoBeallitas ? ` style="left:${fotoBeallitas.x}%;top:${fotoBeallitas.y}%"` : " hidden"}></span></div>
          <p class="wc-hint">${escapeHtml(t.editorCropHint)}</p>
          <div class="wc-error" hidden></div>
          <div class="wc-foot" style="justify-content:space-between">
            <button type="button" class="wc-btn-danger" id="wc-photo-remove">${escapeHtml(t.photoRemove)}</button>
            <span style="display:flex;gap:10px"><button type="button" class="wc-btn-ghost" data-close>${escapeHtml(t.editorCancel)}</button><button type="submit" class="wc-btn-primary">${escapeHtml(t.save)}</button></span>
          </div>
        </form>`
            : `<div class="wc-foot"><button type="button" class="wc-btn-ghost" data-close>${escapeHtml(t.modalClose)}</button></div>`
        }
      </div>`
    ),
    dlg(
      "story",
      t.editorTitleStory,
      panelForm(
        par.id,
        "story",
        `<p class="wc-hint">${escapeHtml(t.editorStoryHint)}</p>
        ${chips(t.inspirationLabel, t.editorStorySuggestions, "data-fill-story")}
        <div class="wc-story-list">${storyItems.map(storyRow).join("")}</div>
        <template id="wc-story-row-tpl">${storyRow({})}</template>
        <button type="button" class="wc-add-row" data-story-add${storyItems.length >= 8 ? " hidden" : ""}>${escapeHtml(t.editorStoryAdd)}</button>`,
        t
      )
    ),
    dlg(
      "countdown",
      t.editorTitleCountdown,
      panelForm(
        par.id,
        "countdown",
        `<label class="wc-check"><input type="checkbox" name="vissza_be" value="1"${countdownOn ? " checked" : ""}> ${escapeHtml(t.editorCountdownShow)}</label>
        <label for="wc-vissza-ido" style="margin-top:12px">${escapeHtml(t.editorCountdownTime)}</label>
        <input type="time" id="wc-vissza-ido" name="vissza_ido" value="${escapeHtml(countdownTime)}">
        <p class="wc-hint">${escapeHtml(t.editorCountdownHint)}</p>`,
        t
      )
    ),
    dlg(
      "divider",
      t.editorTitleDivider,
      panelForm(
        par.id,
        "divider",
        `<p class="wc-hint">${escapeHtml(t.editorDividerHint)}</p>
        <div class="wc-div-grid">${DIVIDER_KEYS.map(
          (k) =>
            `<label class="wc-div-tile"><input type="radio" name="elvalaszto" value="${k}"${k === dividerKey ? " checked" : ""}><span class="wc-div-prev">${k === "nincs" ? '<span class="wc-div-none">✕</span>' : dividerHtml(k)}</span><span class="wc-div-name">${escapeHtml(t.editorDivNames[k])}</span></label>`
        ).join("")}</div>`,
        t
      )
    ),
    dlg(
      "names",
      t.editorTitleNames,
      panelForm(
        par.id,
        "names",
        `<p class="wc-hint">${escapeHtml(t.editorNamesHint)}</p>
        <label for="wc-nev1">${escapeHtml(t.editorName1)}</label>
        <input type="text" id="wc-nev1" name="nev1" value="${escapeHtml(nev1)}" maxlength="60" required autocomplete="off">
        <label for="wc-nev2">${escapeHtml(t.editorName2)}</label>
        <input type="text" id="wc-nev2" name="nev2" value="${escapeHtml(nev2)}" maxlength="60" required autocomplete="off">
        <label for="wc-datum">${escapeHtml(t.editorDate)}</label>
        <input type="date" id="wc-datum" name="eskuvo_datuma" value="${escapeHtml(par.eskuvo_datuma)}" required>
        <label for="wc-felirat">${escapeHtml(t.editorEyebrow)}</label>
        <input type="text" id="wc-felirat" name="felirat" value="${escapeHtml(eyebrowText)}" maxlength="40" autocomplete="off">
        <p class="wc-hint">${escapeHtml(t.editorEyebrowHint)}</p>`,
        t
      )
    ),
    dlg(
      "location",
      t.editorTitleLocation,
      panelForm(
        par.id,
        "location",
        `<p class="wc-hint">${escapeHtml(t.editorLocationHint)}</p>
        <datalist id="wc-loc-labels">${t.editorLocLabels.map((l) => `<option value="${escapeHtml(l)}"></option>`).join("")}</datalist>
        ${locBlocks}
        <p class="wc-hint">${escapeHtml(t.editorLocMapHint)}</p>
        <button type="button" class="wc-add-row" data-add-row=".wc-loc-block"${locVisible >= EDIT_MAX_LOCATIONS ? " hidden" : ""}>${escapeHtml(t.editorAddLocationRow)}</button>`,
        t
      )
    ),
    dlg(
      "message",
      t.editorTitleMessage,
      panelForm(
        par.id,
        "message",
        `<p class="wc-hint">${escapeHtml(t.ownMessageExplain)}</p>
        ${chips(t.inspirationLabel, t.messageSuggestions, "data-fill-message")}
        <textarea name="egyedi_uzenet" maxlength="1000" placeholder="${escapeHtml(t.ownMessagePlaceholder)}">${escapeHtml(par.egyedi_uzenet || "")}</textarea>
        <p class="wc-hint">${escapeHtml(t.ownMessageEditHint)}</p>`,
        t
      )
    ),
    dlg(
      "program",
      t.editorTitleProgram,
      panelForm(
        par.id,
        "program",
        `<p class="wc-hint">${escapeHtml(t.programExplain)}</p>
        ${chips(t.inspirationLabel, t.eventSuggestions, "data-fill-event")}
        ${eventRows}
        <button type="button" class="wc-add-row" data-add-row=".wc-event-row"${eventVisible >= EDIT_MAX_EVENTS ? " hidden" : ""}>${escapeHtml(t.addEvent)}</button>`,
        t
      )
    ),
    dlg(
      "buttons",
      t.editorTitleButtons,
      panelForm(
        par.id,
        "buttons",
        `<p class="wc-hint">${escapeHtml(t.buttonsExplain)}</p>
        ${chips(t.inspirationLabel, t.buttonSuggestions, "data-fill")}
        ${buttonRows}
        <button type="button" class="wc-add-row" data-add-row=".wc-button-row"${buttonVisible >= EDIT_MAX_BUTTONS ? " hidden" : ""}>${escapeHtml(t.addButton)}</button>`,
        t
      )
    ),
    dlg(
      "design",
      t.editorTitleDesign,
      panelForm(
        par.id,
        "style",
        `<p class="wc-hint">${escapeHtml(t.editorDesignHint)}</p>
        <input type="hidden" name="stilus" id="wc-stilus" value="${escapeHtml(currentStyleId)}">
        <div class="wc-styles">${styleButtons}</div>
        <input type="hidden" name="nyito_mezo" value="1">
        <div class="wc-env-row">
          <label class="wc-check"><input type="checkbox" name="nyito" id="wc-nyito" value="boritek"${nyitoOn ? " checked" : ""}> ${escapeHtml(t.editorEnvelope)}</label>
          <button type="button" class="wc-chip" data-play-envelope>${escapeHtml(t.editorEnvelopePreview)}</button>
        </div>
        <p class="wc-hint">${escapeHtml(t.editorEnvelopeHint)}</p>
        <label for="wc-nyito-szoveg">${escapeHtml(t.editorEnvelopeText)}</label>
        <input type="text" id="wc-nyito-szoveg" name="nyito_szoveg" value="${escapeHtml(envelopeMessage)}" maxlength="60" autocomplete="off">
        <p class="wc-hint">${escapeHtml(t.editorEnvelopeTextHint)}</p>`,
        t
      )
    ),
  ].join("\n");
}

function script({ t }) {
  const stylesForClient = JSON.stringify(
    STYLES.map((s) => ({ id: s.id, font: s.font, bg: s.bg, fg: s.fg, accent: s.accent, accentText: s.accentText, btnFg: s.btnFg }))
  );
  const fontsForClient = JSON.stringify(
    Object.fromEntries(Object.keys(FONT_RECIPES).map((k) => [k, { recipe: FONT_RECIPES[k], size: namesFontSize(k) }]))
  );
  const copyForClient = JSON.stringify({
    uploading: t.photoUploading,
    uploadError: t.photoUploadError,
    removeConfirm: t.photoRemoveConfirm,
    saved: t.saved,
    saveFailed: t.editorSaveFailed,
    unsaved: t.editorUnsaved,
    errButton: t.editorErrButton,
    errUrl: t.editorErrUrl,
    errEvent: t.editorErrEvent,
    removeConfirm2: t.editorRemoveConfirm,
    elOn: t.editorElOn,
    elAdd: t.editorElAdd,
  });
  return `<script type="module">
  import { resizeImageToWebp } from "/assets/photo-upload.js?v=1";
  var STYLES = ${stylesForClient};
  var envelopePalette = ${envelopePalette.toString()};
  var FONTS = ${fontsForClient};
  var COPY = ${copyForClient};
  var root = document.documentElement;
  var designPanel = document.getElementById("panel-design");
  var NONMODAL = ["panel-design"];
  var ELEMENT_KEYS = ["photo", "divider", "countdown", "story", "location", "program", "buttons"];
  var side = document.getElementById("wc-side"), sideBackdrop = document.getElementById("wc-side-backdrop");
  function updateSidebar() {
    ELEMENT_KEYS.forEach(function (k) {
      var btn = side.querySelector('[data-add-el="' + k + '"]');
      if (!btn) return;
      var on = !!document.getElementById("zone-" + k);
      btn.classList.toggle("on", on);
      btn.querySelector(".wc-el-state").textContent = on ? "\u2713" : "\uFF0B";
      btn.title = on ? COPY.elOn : COPY.elAdd;
    });
  }
  function closeSide() { side.classList.remove("open"); sideBackdrop.classList.remove("open"); }
  function postSection(fields) {
    var body = new FormData();
    body.append("par_id", document.querySelector(".wc-bar").getAttribute("data-par-id"));
    Object.keys(fields).forEach(function (k) { [].concat(fields[k]).forEach(function (v) { body.append(k, v); }); });
    return fetch("/api/couple-section-update", { method: "POST", body: body, headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("save"); });
  }
  var suppressClick = false;
  // Elem húzása a bal oldali oszlopból közvetlenül az oldalra (csak egérrel; érintésen a kattintás/fiók marad).
  var ext = null, ghost = null;
  function extTarget(y) {
    var zs = sortableZones();
    for (var i = 0; i < zs.length; i++) {
      var r = zs[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) return { before: zs[i], all: zs };
    }
    return { before: null, all: zs };
  }
  function extUpdate(e) {
    ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px";
    var card = document.querySelector(".card").getBoundingClientRect(), sideR = side.getBoundingClientRect();
    var inside = e.clientX > Math.max(sideR.right, card.left - 40) && e.clientX < card.right + 40 && e.clientY > 52;
    ext.inside = inside;
    if (!inside) { dropLine.hidden = true; return; }
    var tg = extTarget(e.clientY), y;
    if (tg.before) y = tg.before.getBoundingClientRect().top - 15;
    else if (tg.all.length) y = tg.all[tg.all.length - 1].getBoundingClientRect().bottom + 15;
    else y = e.clientY;
    dropLine.style.left = (card.left + 16) + "px"; dropLine.style.width = Math.max(0, card.width - 32) + "px"; dropLine.style.top = (y - 2) + "px";
    dropLine.hidden = false;
    ext.before = tg.before ? tg.before.id.replace("zone-", "") : null;
  }
  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    var btn = e.target.closest && e.target.closest(".wc-el");
    if (!btn || btn.classList.contains("on")) return;
    ext = { key: btn.getAttribute("data-add-el"), x: e.clientX, y: e.clientY, active: false, inside: false, before: null, label: btn.querySelector("b").textContent };
  });
  document.addEventListener("pointermove", function (e) {
    if (!ext) return;
    if (!ext.active) {
      if (Math.abs(e.clientX - ext.x) + Math.abs(e.clientY - ext.y) < 8) return;
      ext.active = true;
      ghost = document.createElement("div"); ghost.className = "wc-ghost"; ghost.textContent = "＋ " + ext.label;
      document.body.appendChild(ghost); document.body.classList.add("wc-drag-mode");
    }
    extUpdate(e);
  });
  function extEnd(commit) {
    if (!ext) return;
    var x = ext; ext = null;
    if (!x.active) return;
    if (ghost) { ghost.remove(); ghost = null; }
    document.body.classList.remove("wc-drag-mode"); dropLine.hidden = true;
    suppressClick = true; setTimeout(function () { suppressClick = false; }, 60);
    if (commit && x.inside) { closeSide(); addElement(x.key, x.before); }
  }
  document.addEventListener("pointerup", function () { extEnd(true); });
  document.addEventListener("pointercancel", function () { extEnd(false); });
  var pendingAdd = null, pendingBefore = null;
  // Az újonnan hozzáadott elem helye: a megadott elem elé (húzásnál), különben a kép legelőre, a díszítő elem a nevek
  // mögé, minden más az oldal aljára; utána odagörgetünk. A sorrend azonnal mentődik.
  function placeAdded(k, beforeKey) {
    var zone = document.getElementById("zone-" + k);
    if (!zone) return;
    var prev = zoneKeys(), rest = prev.filter(function (x) { return x !== k; }), idx;
    if (beforeKey && rest.indexOf(beforeKey) > -1) idx = rest.indexOf(beforeKey);
    else if (k === "photo") idx = 0;
    else if (k === "divider") idx = rest.indexOf("names") + 1;
    else idx = rest.length;
    rest.splice(idx, 0, k);
    if (rest.join() !== prev.join()) { applyOrder(rest); saveOrder(rest, prev); }
    zone.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function addElement(k, beforeKey) {
    var zone = document.getElementById("zone-" + k);
    if (zone) { zone.scrollIntoView({ behavior: "smooth", block: "center" }); openPanel("panel-" + k); return; }
    if (k === "divider") {
      postSection({ section: "divider", elvalaszto: "ag" })
        .then(function () { return refresh(); })
        .then(function () { placeAdded("divider", beforeKey); toast(COPY.saved); })
        .catch(function () { toast(COPY.saveFailed, true); });
      return;
    }
    pendingAdd = k; pendingBefore = beforeKey || null;
    openPanel("panel-" + k);
    if (k === "countdown") { var cb = document.querySelector('#panel-countdown [name="vissza_be"]'); if (cb) cb.checked = true; }
    if (k === "story" && !document.querySelector(".wc-story-row")) storyAdd("");
  }
  function removeElement(k) {
    if (!window.confirm(COPY.removeConfirm2)) return;
    var keep = zoneKeys().filter(function (x) { return x !== k; });
    var job;
    if (k === "photo") {
      var b = new FormData();
      b.append("par_id", document.querySelector(".wc-bar").getAttribute("data-par-id"));
      job = fetch("/api/couple-photo-delete", { method: "POST", body: b, credentials: "same-origin" }).then(function (r) { if (!r.ok) throw new Error("del"); });
    } else if (k === "divider") {
      job = postSection({ section: "divider", elvalaszto: "nincs" });
    } else {
      // Üres mentés = az elem törlése; utána a maradék sorrendje mentődik (az eltávolított a végére kerül).
      job = postSection({ section: k }).then(function () { return postSection({ section: "order", sorrend: keep }); });
    }
    job.then(function () { return refresh(); }).then(function () { toast(COPY.saved); }).catch(function () { toast(COPY.saveFailed, true); });
  }
  function storyRandId() {
    var a = new Uint8Array(4);
    crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  function storyToggleAdd() {
    var list = document.querySelector(".wc-story-list"), add = document.querySelector("[data-story-add]");
    if (list && add) add.hidden = list.children.length >= 8;
  }
  function storyAdd(cim) {
    var list = document.querySelector(".wc-story-list"), tpl = document.getElementById("wc-story-row-tpl");
    if (!list || !tpl || list.children.length >= 8) return null;
    var row = tpl.content.firstElementChild.cloneNode(true);
    row.querySelector('[name="story_id"]').value = storyRandId();
    if (cim) row.querySelector('[name="story_cim"]').value = cim;
    list.appendChild(row);
    storyToggleAdd();
    return row;
  }
  function playOpening() { playEnvelope(); }
  function playEnvelope() {
    var tpl = document.getElementById("wc-env-tpl");
    if (!tpl || !window.wcEnvelopeInit) return;
    [].forEach.call(document.querySelectorAll("#wc-env"), function (o) { o.remove(); });
    var root = tpl.content.cloneNode(true).querySelector("#wc-env");
    var parts = ((document.querySelector(".names") || {}).textContent || "").split("&");
    function ini(x) { var c = Array.from((x || "").trim())[0]; return c ? c.toLocaleUpperCase() : "\u2665"; }
    root.querySelector(".env-mono").innerHTML = ini(parts[0]) + "<i>&amp;</i>" + ini(parts[1]);
    var cardNames = root.querySelector(".env-card-names"), cardDate = root.querySelector(".env-card-date");
    if (cardNames) cardNames.textContent = ((document.querySelector(".names") || {}).textContent || "").trim();
    var faceNames = root.querySelector(".env-names");
    if (faceNames) faceNames.textContent = ((document.querySelector(".names") || {}).textContent || "").trim();
    var envCard = root.querySelector(".env-card"), envPhoto = root.querySelector(".env-card-photo"), coverImg = document.querySelector(".cover-photo");
    if (coverImg) {
      if (!envPhoto) { envPhoto = document.createElement("img"); envPhoto.className = "env-card-photo"; envPhoto.alt = ""; envCard.insertBefore(envPhoto, envCard.firstChild); }
      envPhoto.src = coverImg.src; envPhoto.style.objectPosition = coverImg.style.objectPosition || "50% 40%";
      envCard.classList.add("has-photo");
    } else {
      if (envPhoto) envPhoto.remove();
      envCard.classList.remove("has-photo");
    }
    var msgEl = root.querySelector(".env-message"), msgIn = document.getElementById("wc-nyito-szoveg");
    if (msgEl && msgIn) { msgEl.textContent = msgIn.value.trim(); msgEl.hidden = !msgIn.value.trim(); }
    if (cardDate) cardDate.textContent = ((document.querySelector(".date") || {}).textContent || "").trim();
    var st = STYLES.filter(function (x) { return x.id === document.getElementById("wc-stilus").value; })[0];
    if (st) {
      var envFont = (st.font === "sans" ? FONTS["serif-i"] : FONTS[st.font]) || FONTS["serif-i"];
      if (cardNames) cardNames.style.cssText = envFont.recipe;
      if (faceNames) faceNames.style.cssText = envFont.recipe;
      var pal = envelopePalette(st.accent, st.bg);
      root.style.setProperty("--env-paper", pal.paper); root.style.setProperty("--env-paper2", pal.paper2);
      root.style.setProperty("--env-orn", pal.orn); root.style.setProperty("--env-seal", pal.seal); root.style.setProperty("--env-seal-fg", pal.sealFg);
    }
    // Az előnézet a mentett oldal tiszta (szerkesztő-elemek nélküli) másolatát használja a kicsúszó kártyához.
    var prevLink = document.querySelector(".wc-bar a");
    function startPreview(cardEl) {
      document.body.appendChild(root);
      window.wcEnvelopeInit(root, { preview: true, card: cardEl, target: document.querySelector(".card") });
    }
    if (prevLink) {
      fetch(prevLink.getAttribute("href"), { credentials: "same-origin" })
        .then(function (r) { return r.text(); })
        .then(function (html) { startPreview(new DOMParser().parseFromString(html, "text/html").querySelector(".card")); })
        .catch(function () { startPreview(null); });
    } else startPreview(null);
  }
  function closeNonModal(d) {
    if (!d || !d.open) return;
    d.close();
    if (d.id === "panel-design") revertDesign();
  }
  var currentId = document.getElementById("wc-stilus").value;
  var currentEnv = document.getElementById("wc-nyito").checked;
  var currentEnvMsg = document.getElementById("wc-nyito-szoveg").value;

  // Minden eseménykezelő delegált (a document-en), mert mentés után a kártya és a
  // panelek a szerverről frissen betöltött példányra cserélődnek (refresh()).
  function snapshot(d) {
    var f = d.querySelector("form");
    return f ? new URLSearchParams(new FormData(f)).toString() : "";
  }
  function isDirty(d) { return NONMODAL.indexOf(d.id) < 0 && d.__snap !== undefined && snapshot(d) !== d.__snap; }
  function tryClose(d) {
    if (isDirty(d) && !window.confirm(COPY.unsaved)) return false;
    d.close();
    return true;
  }
  function openPanel(id) {
    var d = document.getElementById(id);
    if (!d || d.open) return;
    d.__snap = snapshot(d);
    if (NONMODAL.indexOf(id) > -1) {
      NONMODAL.forEach(function (other) { if (other !== id) closeNonModal(document.getElementById(other)); });
      d.show();
    } else {
      NONMODAL.forEach(function (other) { closeNonModal(document.getElementById(other)); });
      d.showModal();
    }
  }
  function validUrl(v) {
    v = v.trim();
    if (!/^(https?:|mailto:)/i.test(v)) v = "https://" + v;
    try {
      var u = new URL(v);
      if (u.protocol === "mailto:") return u.pathname.indexOf("@") > -1;
      return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.indexOf(".") > -1;
    } catch (err) { return false; }
  }
  function validateForm(form) {
    var section = form.querySelector('[name="section"]').value, i;
    if (section === "buttons") {
      var rows = form.querySelectorAll(".wc-button-row");
      for (i = 0; i < rows.length; i++) {
        var l = rows[i].querySelector('[name="gomb_label"]').value.trim(), u = rows[i].querySelector('[name="gomb_url"]').value.trim();
        if (!!l !== !!u) return COPY.errButton;
        if (u && !validUrl(u)) return COPY.errUrl;
      }
    } else if (section === "program") {
      var ev = form.querySelectorAll(".wc-event-row");
      for (i = 0; i < ev.length; i++) {
        if (ev[i].querySelector('[name="esemeny_ido"]').value && !ev[i].querySelector('[name="esemeny_nev"]').value.trim()) return COPY.errEvent;
      }
    } else if (section === "location") {
      var maps = form.querySelectorAll('[name="hely_terkep"]');
      for (i = 0; i < maps.length; i++) { if (maps[i].value.trim() && !validUrl(maps[i].value)) return COPY.errUrl; }
    }
    return "";
  }
  function cropFromEvent(w, e) {
    var r = w.getBoundingClientRect();
    var x = Math.max(0, Math.min(100, Math.round((e.clientX - r.left) / r.width * 100)));
    var y = Math.max(0, Math.min(100, Math.round((e.clientY - r.top) / r.height * 100)));
    document.getElementById("wc-foto-x").value = x;
    document.getElementById("wc-foto-y").value = y;
    w.querySelector(".wc-crop-img").style.objectPosition = x + "% " + y + "%";
    var dot = w.querySelector(".wc-crop-dot"); dot.style.left = x + "%"; dot.style.top = y + "%";
  }
  var cropDrag = null;
  document.addEventListener("pointerdown", function (e) {
    var w = e.target.closest && e.target.closest(".wc-crop");
    if (!w || document.getElementById("wc-arany").value === "orig") return;
    cropDrag = w; cropFromEvent(w, e);
  });
  document.addEventListener("pointermove", function (e) { if (cropDrag) cropFromEvent(cropDrag, e); });
  document.addEventListener("pointerup", function () { cropDrag = null; });
  // Szekciók húzása közvetlenül az oldalon (fogantyú: .wc-drag): a zóna követi az ujjat/egeret,
  // a beszúrási vonal jelzi a célhelyet, elengedéskor átrendeződik és azonnal mentődik.
  var SORTABLE = ["photo", "names", "divider", "message", "countdown", "story", "location", "program", "buttons"];
  var drag = null;
  var dropLine = document.getElementById("wc-drop-line");
  function sortableZones() {
    return Array.prototype.filter.call(document.querySelectorAll(".card .wc-zone"), function (z) { return SORTABLE.indexOf(z.id.replace("zone-", "")) > -1; });
  }
  function zoneKeys() { return sortableZones().map(function (z) { return z.id.replace("zone-", ""); }); }
  function applyOrder(keys) {
    var card = document.querySelector(".card");
    if (!card) return;
    keys.forEach(function (k) {
      var el = document.getElementById("zone-" + k);
      if (el) card.appendChild(el);
    });
  }
  function saveOrder(keys, prevKeys) {
    var body = new FormData();
    body.append("par_id", document.querySelector(".wc-bar").getAttribute("data-par-id"));
    body.append("section", "order");
    keys.forEach(function (k) { body.append("sorrend", k); });
    return fetch("/api/couple-section-update", { method: "POST", body: body, headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("order"); toast(COPY.saved); })
      .catch(function () { applyOrder(prevKeys); toast(COPY.saveFailed, true); });
  }
  function dragTarget() {
    var others = sortableZones().filter(function (z) { return z !== drag.zone; });
    for (var i = 0; i < others.length; i++) {
      var r = others[i].getBoundingClientRect();
      if (drag.lastY < r.top + r.height / 2) return { before: others[i], others: others };
    }
    return { before: null, others: others };
  }
  function updateDrag() {
    var dy = drag.lastY - drag.startY + (window.scrollY - drag.startScroll);
    drag.zone.style.transform = "translateY(" + dy + "px)";
    var tg = dragTarget(), card = document.querySelector(".card").getBoundingClientRect(), y;
    if (tg.before) y = tg.before.getBoundingClientRect().top - 15;
    else if (tg.others.length) y = tg.others[tg.others.length - 1].getBoundingClientRect().bottom + 15;
    else y = drag.lastY;
    dropLine.style.left = (card.left + 16) + "px"; dropLine.style.width = Math.max(0, card.width - 32) + "px"; dropLine.style.top = (y - 2) + "px";
    dropLine.hidden = false;
    drag.target = tg;
  }
  function dragLoop() {
    if (!drag) return;
    var y = drag.lastY, vh = window.innerHeight, d = 0;
    if (y < 100) d = -Math.min(16, (100 - y) / 4 + 2);
    else if (y > vh - 70) d = Math.min(16, (y - (vh - 70)) / 4 + 2);
    if (d) window.scrollBy(0, d);
    updateDrag();
    drag.raf = requestAnimationFrame(dragLoop);
  }
  function endDrag(commit) {
    if (!drag) return;
    if (commit) updateDrag(); // a legutolsó egérállás szerinti célhely (nem a legutóbbi képkocka)
    var dg = drag; drag = null;
    cancelAnimationFrame(dg.raf);
    dg.zone.style.transform = ""; dg.zone.classList.remove("wc-dragging");
    document.body.classList.remove("wc-drag-mode"); dropLine.hidden = true;
    if (!commit || !dg.target) return;
    var prev = dg.prevKeys;
    if (dg.target.before) dg.target.before.before(dg.zone);
    else if (dg.target.others.length) dg.target.others[dg.target.others.length - 1].after(dg.zone);
    var now = zoneKeys();
    if (now.join() !== prev.join()) saveOrder(now, prev);
  }
  document.addEventListener("pointerdown", function (e) {
    var h = e.target.closest && e.target.closest(".wc-drag");
    if (!h) return;
    e.preventDefault();
    var zone = h.closest(".wc-zone");
    drag = { zone: zone, startY: e.clientY, lastY: e.clientY, startScroll: window.scrollY, pid: e.pointerId, prevKeys: zoneKeys(), target: null, raf: 0 };
    zone.classList.add("wc-dragging"); document.body.classList.add("wc-drag-mode");
    try { h.setPointerCapture(e.pointerId); } catch (err) {}
    hideTip();
    dragLoop();
  });
  document.addEventListener("pointermove", function (e) { if (drag && e.pointerId === drag.pid) drag.lastY = e.clientY; });
  document.addEventListener("pointerup", function (e) { if (drag && e.pointerId === drag.pid) { drag.lastY = e.clientY; endDrag(true); } });
  document.addEventListener("pointercancel", function () { endDrag(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drag) { endDrag(false); return; }
    if (e.key === "Escape" && ext && ext.active) { extEnd(false); return; }
    var h = e.target.closest && e.target.closest(".wc-drag");
    if (!h || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    var keys = zoneKeys(), prev = keys.slice(), k = h.closest(".wc-zone").id.replace("zone-", ""), i = keys.indexOf(k), j = i + (e.key === "ArrowUp" ? -1 : 1);
    if (j < 0 || j >= keys.length) return;
    keys.splice(i, 1); keys.splice(j, 0, k);
    applyOrder(keys); h.focus();
    saveOrder(keys, prev);
  });
  document.addEventListener("cancel", function (e) {
    var d = e.target;
    if (d.matches && d.matches("dialog.wc-dlg") && isDirty(d) && !window.confirm(COPY.unsaved)) e.preventDefault();
  }, true);
  var tip = document.getElementById("wc-tip");
  function hideTip() {
    if (tip) tip.hidden = true;
    try { localStorage.setItem("wc_editor_tip", "1"); } catch (err) {}
  }
  try { if (tip && !localStorage.getItem("wc_editor_tip")) setTimeout(function () { tip.hidden = false; }, 700); } catch (err) { if (tip) tip.hidden = false; }
  function toast(msg, isError) {
    var el = document.createElement("div");
    el.className = "wc-toast" + (isError ? " error" : ""); el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }
  function applyStyle(id) {
    var s = STYLES.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    root.style.setProperty("--bg", s.bg);
    root.style.setProperty("--fg", s.fg);
    root.style.setProperty("--accent", s.accent);
    root.style.setProperty("--accent-text", s.accentText);
    root.style.setProperty("--btn-fg", s.btnFg);
    var f = FONTS[s.font] || FONTS.sans;
    var names = document.querySelector(".names");
    if (names) names.style.cssText = f.recipe + " font-size:" + f.size + ";";
  }
  function revertDesign() {
    applyStyle(currentId);
    document.getElementById("wc-stilus").value = currentId;
    document.getElementById("wc-nyito").checked = currentEnv;
    document.getElementById("wc-nyito-szoveg").value = currentEnvMsg;
    document.querySelectorAll(".wc-style").forEach(function (x) { x.classList.toggle("selected", x.getAttribute("data-style") === currentId); });
  }
  function firstEmpty(rows, field) {
    for (var i = 0; i < rows.length; i++) {
      var input = rows[i].querySelector('[name="' + field + '"]');
      if (input && !input.value.trim()) { rows[i].hidden = false; return input; }
    }
    return null;
  }

  // Mentés után a szerverről frissen betöltött kártya + panelek beemelése (oldal-újratöltés nélkül).
  function refresh(reopenId) {
    return fetch(location.pathname + "?szerkesztes=1", { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("refresh"); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var card = document.querySelector(".card"), fresh = doc.querySelector(".card");
        if (!card || !fresh) throw new Error("refresh");
        card.innerHTML = fresh.innerHTML;
        doc.querySelectorAll("dialog.wc-dlg").forEach(function (nd) {
          if (NONMODAL.indexOf(nd.id) > -1) return;
          var od = document.getElementById(nd.id);
          if (od) { if (od.open) od.close(); od.replaceWith(nd); }
        });
        document.title = doc.title;
        applyStyle(currentId);
        updateSidebar();
        if (reopenId) openPanel(reopenId);
      });
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest(".wc-drag")) return;
    var delBtn = t.closest("[data-remove-el]");
    if (delBtn) { e.preventDefault(); removeElement(delBtn.getAttribute("data-remove-el")); return; }
    if (t.closest("[data-toggle-side]")) { side.classList.toggle("open"); sideBackdrop.classList.toggle("open", side.classList.contains("open")); return; }
    if (t === sideBackdrop) { closeSide(); return; }
    var addEl = t.closest("[data-add-el]");
    if (addEl) { if (suppressClick) return; closeSide(); addElement(addEl.getAttribute("data-add-el")); return; }
    if (t.closest("[data-play-envelope]")) { playOpening(); return; }
    var sadd = t.closest("[data-story-add]");
    if (sadd) { var nr = storyAdd(""); if (nr) nr.querySelector('[name="story_datum"]').focus(); return; }
    var sfill = t.closest("[data-fill-story]");
    if (sfill) { var fr = storyAdd(sfill.getAttribute("data-fill-story")); if (fr) fr.querySelector('[name="story_datum"]').focus(); return; }
    var srem = t.closest("[data-story-remove]");
    if (srem) { srem.closest(".wc-story-row").remove(); storyToggleAdd(); return; }
    var smove = t.closest("[data-story-move]");
    if (smove) {
      var srow = smove.closest(".wc-story-row"), sdir = parseInt(smove.getAttribute("data-story-move"), 10);
      if (sdir < 0 && srow.previousElementSibling) srow.parentNode.insertBefore(srow, srow.previousElementSibling);
      else if (sdir > 0 && srow.nextElementSibling) srow.parentNode.insertBefore(srow.nextElementSibling, srow);
      return;
    }
    if (t.closest("[data-tip-close]")) { hideTip(); return; }
    var opener = t.closest("[data-open]");
    if (opener) { e.preventDefault(); hideTip(); openPanel(opener.getAttribute("data-open")); return; }
    if (t.matches("dialog.wc-dlg") && NONMODAL.indexOf(t.id) < 0) { tryClose(t); return; }
    var closer = t.closest("[data-close]");
    if (closer) {
      var dlg = closer.closest("dialog");
      if (dlg && NONMODAL.indexOf(dlg.id) > -1) closeNonModal(dlg);
      else if (dlg) tryClose(dlg);
      return;
    }
    var ratio = t.closest("[data-ratio]");
    if (ratio) {
      var rv = ratio.getAttribute("data-ratio"), frm = ratio.closest("form"), im = frm.querySelector(".wc-crop-img"), dot = frm.querySelector(".wc-crop-dot");
      frm.querySelectorAll("[data-ratio]").forEach(function (x) { x.classList.toggle("selected", x === ratio); });
      document.getElementById("wc-arany").value = rv;
      im.style.aspectRatio = rv === "orig" ? "" : rv;
      im.style.objectFit = rv === "orig" ? "" : "cover";
      im.style.objectPosition = rv === "orig" ? "" : document.getElementById("wc-foto-x").value + "% " + document.getElementById("wc-foto-y").value + "%";
      dot.hidden = rv === "orig";
      dot.style.left = document.getElementById("wc-foto-x").value + "%"; dot.style.top = document.getElementById("wc-foto-y").value + "%";
      return;
    }
    var st = t.closest(".wc-style");
    if (st) {
      document.querySelectorAll(".wc-style").forEach(function (x) { x.classList.remove("selected"); });
      st.classList.add("selected");
      document.getElementById("wc-stilus").value = st.getAttribute("data-style");
      applyStyle(st.getAttribute("data-style"));
      return;
    }
    var chip;
    if ((chip = t.closest("[data-fill-message]"))) { chip.closest("form").querySelector("textarea").value = chip.getAttribute("data-fill-message"); return; }
    if ((chip = t.closest("[data-fill-event]"))) {
      var ei = firstEmpty(chip.closest("form").querySelectorAll(".wc-event-row"), "esemeny_nev");
      if (ei) { ei.value = chip.getAttribute("data-fill-event"); ei.focus(); }
      return;
    }
    if ((chip = t.closest("[data-fill]"))) {
      var bi = firstEmpty(chip.closest("form").querySelectorAll(".wc-button-row"), "gomb_label");
      if (bi) { bi.value = chip.getAttribute("data-fill"); bi.focus(); }
      return;
    }
    var add = t.closest("[data-add-row]");
    if (add) {
      var hidden = add.closest("form").querySelectorAll(add.getAttribute("data-add-row") + "[hidden]");
      if (hidden.length) { hidden[0].hidden = false; hidden[0].querySelector("input").focus(); }
      if (hidden.length <= 1) add.hidden = true;
      return;
    }
    if (t.closest("#wc-photo-remove")) {
      if (!window.confirm(COPY.removeConfirm)) return;
      var body = new FormData();
      body.append("par_id", document.getElementById("wc-photo").getAttribute("data-par-id"));
      fetch("/api/couple-photo-delete", { method: "POST", body: body })
        .then(function (r) { if (!r.ok) throw new Error("delete"); return refresh(); })
        .then(function () { toast(COPY.saved); })
        .catch(function () { toast(COPY.saveFailed, true); });
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var opener = e.target.closest && e.target.closest("[data-open]");
    if (opener && opener === e.target) { e.preventDefault(); openPanel(opener.getAttribute("data-open")); }
  });

  // Szekció-mentés fetch-csel: siker esetén frissítés a szerverről, hiba esetén a panel nyitva marad.
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form.matches || !form.matches("form.wc-form")) return;
    e.preventDefault();
    var errBox = form.querySelector(".wc-error");
    var problem = validateForm(form);
    if (errBox) { errBox.hidden = !problem; errBox.textContent = problem; }
    if (problem) return;
    var btn = form.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;
    var sectionName = form.querySelector('[name="section"]').value;
    var isStyle = sectionName === "style";
    fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("save"); return r.json(); })
      .then(function () {
        if (isStyle) { currentId = document.getElementById("wc-stilus").value; currentEnv = document.getElementById("wc-nyito").checked; currentEnvMsg = document.getElementById("wc-nyito-szoveg").value; designPanel.close(); toast(COPY.saved); return; }
        return refresh().then(function () {
          if (pendingAdd && pendingAdd === sectionName) placeAdded(pendingAdd, pendingBefore);
          pendingAdd = null; pendingBefore = null;
          toast(COPY.saved);
        });
      })
      .catch(function () { toast(COPY.saveFailed, true); })
      .then(function () { if (btn) btn.disabled = false; });
  });

  // Borítókép: a böngészőben átméretezve/WebP-re alakítva megy fel.
  document.addEventListener("change", function (e) {
    if (e.target.id !== "wc-photo-input") return;
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var status = document.getElementById("wc-photo-status");
    status.className = "wc-status"; status.textContent = COPY.uploading;
    resizeImageToWebp(file).then(function (blob) {
      var body = new FormData();
      body.append("par_id", document.getElementById("wc-photo").getAttribute("data-par-id"));
      body.append("fenykep", blob, "cover.webp");
      return fetch("/api/couple-photo-upload", { method: "POST", body: body });
    }).then(function (r) { if (!r.ok) throw new Error("upload"); return refresh("panel-photo"); })
      .then(function () { toast(COPY.saved); })
      .catch(function () { status.className = "wc-status error"; status.textContent = COPY.uploadError; });
  });

  updateSidebar();

  // JS nélküli mentés utáni visszatérés jelzése (?mentve=1).
  var q = new URLSearchParams(location.search);
  if (q.get("mentve")) {
    toast(COPY.saved);
    q.delete("mentve");
    history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q.toString() : "") + location.hash);
  }
</script>`;
}

const ELEMENTS = [
  ["photo", "📷", "editorTitlePhoto"],
  ["divider", "✨", "editorTitleDivider"],
  ["countdown", "⏳", "editorTitleCountdown"],
  ["story", "📖", "editorTitleStory"],
  ["location", "📍", "editorTitleLocation"],
  ["program", "🕒", "editorTitleProgram"],
  ["buttons", "🔗", "editorTitleButtons"],
];

function sidebar({ t }) {
  return `<aside class="wc-side" id="wc-side" aria-label="${escapeHtml(t.editorElements)}">
    <h2>${escapeHtml(t.editorElements)}</h2>
    <p class="wc-hint">${escapeHtml(t.editorElementsHint)}</p>
    ${ELEMENTS.map(
      ([k, ico, nameKey]) =>
        `<button type="button" class="wc-el" data-add-el="${k}"><span class="wc-el-ico" aria-hidden="true">${ico}</span><span class="wc-el-txt"><b>${escapeHtml(t[nameKey])}</b><small>${escapeHtml(t.editorElDescs[k])}</small></span><span class="wc-el-state" aria-hidden="true">＋</span></button>`
    ).join("")}
  </aside>
  <div class="wc-side-backdrop" id="wc-side-backdrop"></div>`;
}

// A teljes szerkesztő réteg a </body> elé: eszköztár + panelek + szkript.
export function editorLayer(opts) {
  return `${toolbar(opts)}\n${sidebar(opts)}\n${panels(opts)}\n<div id="wc-drop-line" hidden></div>\n<div class="wc-tip" id="wc-tip" hidden><span>${escapeHtml(opts.t.editorHint)}</span><button type="button" data-tip-close aria-label="×">✕</button></div>\n${script(opts)}`;
}
