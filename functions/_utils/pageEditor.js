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

// Egy szekció becsomagolása: szerkesztő módban kattintható zóna ceruza-címkével,
// üres szekciónál "+ hozzáadás" helykitöltővel; egyébként a tartalom változatlan.
export function editZone(name, contentHtml, { edit, empty, addLabel, penLabel, sortable, dragLabel }) {
  if (!edit) return contentHtml;
  const inner = empty ? `<div class="wc-zone-placeholder">${escapeHtml(addLabel)}</div>` : contentHtml;
  return `<div class="wc-zone${empty ? " wc-zone-empty" : ""}" id="zone-${name}" data-open="panel-${name}" role="button" tabindex="0" aria-label="${escapeHtml(penLabel)}">${inner}<span class="wc-pen">✎ ${escapeHtml(penLabel)}</span>${
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
  .wc-pen { position:absolute; top:-13px; right:-4px; z-index:5; background:#2b2620; color:#fff; border-radius:999px; padding:4px 11px; font:600 11px/1.4 "Poppins",Arial,sans-serif; letter-spacing:0.02em; box-shadow:0 3px 8px rgba(0,0,0,0.25); }
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
  .wc-zone .cover-wrap { margin-bottom: 0; }
  .wc-story-row { border:1px solid #ece4d6; border-radius:10px; padding:12px 12px 4px; margin-bottom:12px; }
  .wc-story-top { display:flex; gap:8px; align-items:flex-start; }
  .wc-story-top input { flex:1; min-width:0; }
  .wc-story-tools { display:flex; gap:4px; flex:none; }
  .wc-story-tools button { width:32px; height:40px; border:1px solid #ddd6c9; background:#fff; border-radius:8px; cursor:pointer; color:#2b2620; font-size:13px; }
  .wc-story-row textarea { min-height:64px; }
  .wc-story-photo { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:0 0 10px; }
  .wc-story-thumb { width:64px; height:48px; object-fit:cover; border-radius:6px; }
  .wc-story-thumb[hidden], .wc-story-photo [hidden] { display:none !important; }
  .wc-story-upload { cursor:pointer; }
  .wc-toast.error { background:#b1451f; }
  .wc-loc-block { border:1px solid #ece4d6; border-radius:10px; padding:12px 12px 2px; margin-bottom:10px; }
  .wc-loc-block[hidden] { display:none; }
  .wc-dlg input[type=date] { width:100%; padding:10px 12px; border:1px solid #ddd6c9; border-radius:8px; font:inherit; font-size:16px; margin-bottom:10px; background:#fff; color:#2b2620; box-sizing:border-box; }
  .wc-toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:10000; background:#2b2620; color:#fff; padding:10px 20px; border-radius:999px; font:600 13px/1.3 "Poppins",Arial,sans-serif; box-shadow:0 8px 24px rgba(0,0,0,0.3); }
  @media (max-width:520px) { .wc-bar-lbl { display:none; } .wc-bar-icon { display:inline; } .wc-bar { padding:8px 8px; gap:5px; justify-content:center; } .wc-bar a, .wc-bar button, .wc-pill { padding:8px 10px; font-size:12px; } .wc-bar-title { display:none; } body.wc-editing { padding-top:60px; } }
`;

function toolbar({ par, t, previewHref, isDraft, freeEligible }) {
  const publish = isDraft
    ? `<form method="POST" action="/api/couple-pay"><input type="hidden" name="par_id" value="${par.id}"><button type="submit" class="wc-bar-primary">${escapeHtml(freeEligible ? t.publishFree : t.publishNow)}</button></form>`
    : `<span class="wc-pill">${escapeHtml(t.editorPublished)}</span>`;
  return `<div class="wc-bar" data-par-id="${par.id}">
    <div class="wc-bar-title">✎ ${escapeHtml(t.editorBadge)}<small>${escapeHtml(t.editorBadgeHint)}${isDraft ? " · " + escapeHtml(t.draftLabel) : ""}</small></div>
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

function panels({ par, slug, t, lang, gombok, esemenyek, helyek, fotoBeallitas, nyitoOn, dividerKey, storyItems, countdownOn, countdownTime, nev1, nev2, hasPhoto, photoVersion, currentStyleId }) {
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
      <input type="hidden" name="story_foto" value="${escapeHtml(it.foto || "")}">
      <div class="wc-story-top">
        <input type="text" name="story_datum" maxlength="60" placeholder="${escapeHtml(t.editorStoryDate)}" value="${escapeHtml(it.datum || "")}" autocomplete="off">
        <span class="wc-story-tools"><button type="button" data-story-move="-1" aria-label="${escapeHtml(t.editorStoryUp)}">▲</button><button type="button" data-story-move="1" aria-label="${escapeHtml(t.editorStoryDown)}">▼</button><button type="button" data-story-remove aria-label="${escapeHtml(t.editorStoryRemove)}" title="${escapeHtml(t.editorStoryRemove)}">✕</button></span>
      </div>
      <input type="text" name="story_cim" maxlength="100" placeholder="${escapeHtml(t.editorStoryTitle)}" value="${escapeHtml(it.cim || "")}" autocomplete="off">
      <textarea name="story_szoveg" maxlength="500" rows="3" placeholder="${escapeHtml(t.editorStoryText)}">${escapeHtml(it.szoveg || "")}</textarea>
      <div class="wc-story-photo">
        <img class="wc-story-thumb" alt=""${it.foto && it.id ? ` src="/foto/${encodeURIComponent(slug)}/${encodeURIComponent(it.id)}?v=${encodeURIComponent(it.foto)}"` : " hidden"}>
        <label class="wc-chip wc-story-upload">📷 <span class="wc-story-uptxt">${escapeHtml(it.foto ? t.editorStoryPhotoChange : t.editorStoryPhoto)}</span><input type="file" accept="image/*" class="wc-story-file" hidden></label>
        <button type="button" class="wc-btn-danger" data-story-photo-remove${it.foto ? "" : " hidden"}>${escapeHtml(t.editorStoryPhotoRemove)}</button>
        <span class="wc-status"></span>
      </div>
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
        <input type="date" id="wc-datum" name="eskuvo_datuma" value="${escapeHtml(par.eskuvo_datuma)}" required>`,
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
          <label class="wc-check"><input type="checkbox" name="nyito" id="wc-nyito" value="1"${nyitoOn ? " checked" : ""}> ${escapeHtml(t.editorEnvelope)}</label>
          <button type="button" class="wc-chip" data-play-envelope>${escapeHtml(t.editorEnvelopePreview)}</button>
        </div>
        <p class="wc-hint">${escapeHtml(t.editorEnvelopeHint)}</p>`,
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
    storyPhoto: t.editorStoryPhoto,
    storyPhotoChange: t.editorStoryPhotoChange,
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
  function playEnvelope() {
    var tpl = document.getElementById("wc-env-tpl");
    if (!tpl || !window.wcEnvelopeInit) return;
    var old = document.getElementById("wc-env");
    if (old) old.remove();
    var root = tpl.content.cloneNode(true).querySelector("#wc-env");
    var parts = ((document.querySelector(".names") || {}).textContent || "").split("&");
    function ini(x) { var c = Array.from((x || "").trim())[0]; return c ? c.toLocaleUpperCase() : "\u2665"; }
    root.querySelector(".env-mono").innerHTML = ini(parts[0]) + "<i>&amp;</i>" + ini(parts[1]);
    var st = STYLES.filter(function (x) { return x.id === document.getElementById("wc-stilus").value; })[0];
    if (st) {
      var pal = envelopePalette(st.accent, st.bg);
      root.style.setProperty("--env-orn", pal.orn); root.style.setProperty("--env-seal", pal.seal); root.style.setProperty("--env-seal-fg", pal.sealFg);
    }
    document.body.appendChild(root);
    window.wcEnvelopeInit(root, { preview: true });
  }
  function closeNonModal(d) {
    if (!d || !d.open) return;
    d.close();
    if (d.id === "panel-design") revertDesign();
  }
  var currentId = document.getElementById("wc-stilus").value;
  var currentEnv = document.getElementById("wc-nyito").checked;

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
  var SORTABLE = ["message", "countdown", "story", "location", "program", "buttons"];
  var drag = null;
  var dropLine = document.getElementById("wc-drop-line");
  function sortableZones() {
    return Array.prototype.filter.call(document.querySelectorAll(".card .wc-zone"), function (z) { return SORTABLE.indexOf(z.id.replace("zone-", "")) > -1; });
  }
  function zoneKeys() { return sortableZones().map(function (z) { return z.id.replace("zone-", ""); }); }
  function applyOrder(keys) {
    var ref = document.getElementById("zone-divider") || document.querySelector(".card .divider");
    if (!ref) return;
    keys.forEach(function (k) {
      var el = document.getElementById("zone-" + k);
      if (el) { ref.after(el); ref = el; }
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
        if (reopenId) openPanel(reopenId);
      });
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest(".wc-drag")) return;
    if (t.closest("[data-play-envelope]")) { playEnvelope(); return; }
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
    var sprem = t.closest("[data-story-photo-remove]");
    if (sprem) {
      var prow = sprem.closest(".wc-story-row");
      prow.querySelector('[name="story_foto"]').value = "";
      prow.querySelector(".wc-story-thumb").hidden = true;
      prow.querySelector(".wc-story-uptxt").textContent = COPY.storyPhoto;
      sprem.hidden = true;
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
        if (isStyle) { currentId = document.getElementById("wc-stilus").value; currentEnv = document.getElementById("wc-nyito").checked; designPanel.close(); toast(COPY.saved); return; }
        return refresh().then(function () { toast(COPY.saved); });
      })
      .catch(function () { toast(COPY.saveFailed, true); })
      .then(function () { if (btn) btn.disabled = false; });
  });

  // Borítókép: a böngészőben átméretezve/WebP-re alakítva megy fel.
  document.addEventListener("change", function (e) {
    if (e.target.classList && e.target.classList.contains("wc-story-file")) {
      var sin = e.target, srow = sin.closest(".wc-story-row"), sfile = sin.files && sin.files[0];
      if (!sfile) return;
      var sstatus = srow.querySelector(".wc-status"), sid = srow.querySelector('[name="story_id"]').value;
      sstatus.className = "wc-status"; sstatus.textContent = COPY.uploading;
      resizeImageToWebp(sfile, 1400).then(function (blob) {
        var body = new FormData();
        body.append("par_id", document.querySelector(".wc-bar").getAttribute("data-par-id"));
        body.append("item_id", sid);
        body.append("fenykep", blob, "s.webp");
        return fetch("/api/couple-story-photo", { method: "POST", body: body, credentials: "same-origin" });
      }).then(function (r) { if (!r.ok) throw new Error("upload"); return r.json(); })
        .then(function (j) {
          srow.querySelector('[name="story_foto"]').value = j.version;
          var th = srow.querySelector(".wc-story-thumb");
          th.src = "/foto/" + document.getElementById("wc-photo").getAttribute("data-slug") + "/" + sid + "?v=" + j.version;
          th.hidden = false;
          srow.querySelector("[data-story-photo-remove]").hidden = false;
          srow.querySelector(".wc-story-uptxt").textContent = COPY.storyPhotoChange;
          sstatus.textContent = ""; sin.value = "";
        })
        .catch(function () { sstatus.className = "wc-status error"; sstatus.textContent = COPY.uploadError; });
      return;
    }
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

  // JS nélküli mentés utáni visszatérés jelzése (?mentve=1).
  var q = new URLSearchParams(location.search);
  if (q.get("mentve")) {
    toast(COPY.saved);
    q.delete("mentve");
    history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q.toString() : "") + location.hash);
  }
</script>`;
}

// A teljes szerkesztő réteg a </body> elé: eszköztár + panelek + szkript.
export function editorLayer(opts) {
  return `${toolbar(opts)}\n${panels(opts)}\n<div id="wc-drop-line" hidden></div>\n<div class="wc-tip" id="wc-tip" hidden><span>${escapeHtml(opts.t.editorHint)}</span><button type="button" data-tip-close aria-label="×">✕</button></div>\n${script(opts)}`;
}
