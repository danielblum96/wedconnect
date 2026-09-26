import { STYLES, FONT_RECIPES, namesFontSize, getStyleName } from "./styles.js";
import { escapeHtml } from "./html.js";

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
export function editZone(name, contentHtml, { edit, empty, addLabel, penLabel }) {
  if (!edit) return contentHtml;
  const inner = empty ? `<div class="wc-zone-placeholder">${escapeHtml(addLabel)}</div>` : contentHtml;
  return `<div class="wc-zone${empty ? " wc-zone-empty" : ""}" id="zone-${name}" data-open="panel-${name}" role="button" tabindex="0" aria-label="${escapeHtml(penLabel)}">${inner}<span class="wc-pen">✎ ${escapeHtml(penLabel)}</span></div>`;
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
  .wc-styles { display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; margin-bottom:6px; }
  @media (min-width:520px) { .wc-styles { grid-template-columns:repeat(3, 1fr); } }
  .wc-style { display:flex; align-items:center; gap:8px; border:2px solid transparent; outline:1px solid #ddd6c9; border-radius:10px; padding:10px; cursor:pointer; font:600 0.8rem/1.2 "Poppins",Arial,sans-serif; text-align:left; }
  .wc-style .wc-dot { width:14px; height:14px; border-radius:50%; flex:none; box-shadow:0 0 0 1px rgba(255,255,255,0.6); }
  .wc-style.selected { border-color:#b48b56; outline-color:#b48b56; }
  .wc-toast.error { background:#b1451f; }
  .wc-loc-block { border:1px solid #ece4d6; border-radius:10px; padding:12px 12px 2px; margin-bottom:10px; }
  .wc-loc-block[hidden] { display:none; }
  .wc-dlg input[type=date] { width:100%; padding:10px 12px; border:1px solid #ddd6c9; border-radius:8px; font:inherit; font-size:16px; margin-bottom:10px; background:#fff; color:#2b2620; box-sizing:border-box; }
  .wc-toast { position:fixed; left:50%; bottom:24px; transform:translateX(-50%); z-index:10000; background:#2b2620; color:#fff; padding:10px 20px; border-radius:999px; font:600 13px/1.3 "Poppins",Arial,sans-serif; box-shadow:0 8px 24px rgba(0,0,0,0.3); }
  @media (max-width:520px) { .wc-bar { padding:8px 8px; gap:5px; justify-content:center; } .wc-bar a, .wc-bar button, .wc-pill { padding:8px 10px; font-size:12px; } .wc-bar-title { display:none; } body.wc-editing { padding-top:60px; } }
`;

function toolbar({ par, t, previewHref, isDraft, freeEligible }) {
  const publish = isDraft
    ? `<form method="POST" action="/api/couple-pay"><input type="hidden" name="par_id" value="${par.id}"><button type="submit" class="wc-bar-primary">${escapeHtml(freeEligible ? t.publishFree : t.publishNow)}</button></form>`
    : `<span class="wc-pill">${escapeHtml(t.editorPublished)}</span>`;
  return `<div class="wc-bar">
    <div class="wc-bar-title">✎ ${escapeHtml(t.editorBadge)}<small>${escapeHtml(t.editorBadgeHint)}${isDraft ? " · " + escapeHtml(t.draftLabel) : ""}</small></div>
    <button type="button" data-open="panel-design">🎨 ${escapeHtml(t.editorDesign)}</button>
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
  return `<form class="wc-form" method="POST" action="/api/couple-section-update"><input type="hidden" name="par_id" value="${parId}"><input type="hidden" name="section" value="${section}">${body}${footer(t)}</form>`;
}

function panels({ par, slug, t, lang, gombok, esemenyek, helyek, nev1, nev2, hasPhoto, photoVersion, currentStyleId }) {
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

  const dlg = (id, title, body, extra = "") =>
    `<dialog class="wc-dlg" id="panel-${id}"${extra}><h3>${escapeHtml(title)}</h3>${body}</dialog>`;

  return [
    dlg(
      "photo",
      t.editorTitlePhoto,
      `<p class="wc-hint">${escapeHtml(t.photoExplain)}</p>
      <div id="wc-photo" data-par-id="${par.id}" data-slug="${escapeHtml(slug)}">
        ${hasPhoto ? `<img class="wc-photo-preview" src="/foto/${encodeURIComponent(slug)}?v=${encodeURIComponent(photoVersion)}" alt="">` : ""}
        <div class="wc-photo-drop">${escapeHtml(hasPhoto ? t.editorPhotoChange : t.photoDropHint)}<input type="file" accept="image/*" id="wc-photo-input"></div>
        <div class="wc-foot" style="justify-content:space-between">
          <span>${hasPhoto ? `<button type="button" class="wc-btn-danger" id="wc-photo-remove">${escapeHtml(t.photoRemove)}</button>` : ""} <span class="wc-status" id="wc-photo-status"></span></span>
          <button type="button" class="wc-btn-ghost" data-close>${escapeHtml(t.modalClose)}</button>
        </div>
      </div>`
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
        <div class="wc-styles">${styleButtons}</div>`,
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
  });
  return `<script type="module">
  import { resizeImageToWebp } from "/assets/photo-upload.js?v=1";
  var STYLES = ${stylesForClient};
  var FONTS = ${fontsForClient};
  var COPY = ${copyForClient};
  var root = document.documentElement;
  var designPanel = document.getElementById("panel-design");
  var currentId = document.getElementById("wc-stilus").value;

  // Minden eseménykezelő delegált (a document-en), mert mentés után a kártya és a
  // panelek a szerverről frissen betöltött példányra cserélődnek (refresh()).
  function openPanel(id) {
    var d = document.getElementById(id);
    if (!d || d.open) return;
    if (id === "panel-design") d.show(); else d.showModal();
  }
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
  function refresh() {
    return fetch(location.pathname + "?szerkesztes=1", { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("refresh"); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var card = document.querySelector(".card"), fresh = doc.querySelector(".card");
        if (!card || !fresh) throw new Error("refresh");
        card.innerHTML = fresh.innerHTML;
        doc.querySelectorAll("dialog.wc-dlg").forEach(function (nd) {
          if (nd.id === "panel-design") return;
          var od = document.getElementById(nd.id);
          if (od) { if (od.open) od.close(); od.replaceWith(nd); }
        });
        document.title = doc.title;
        applyStyle(currentId);
      });
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var opener = t.closest("[data-open]");
    if (opener) { e.preventDefault(); openPanel(opener.getAttribute("data-open")); return; }
    if (t.matches("dialog.wc-dlg") && t.id !== "panel-design") { t.close(); return; }
    var closer = t.closest("[data-close]");
    if (closer) {
      var dlg = closer.closest("dialog");
      if (dlg) dlg.close();
      if (dlg && dlg.id === "panel-design") revertDesign();
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
    var btn = form.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;
    var isStyle = form.querySelector('[name="section"]').value === "style";
    fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("save"); return r.json(); })
      .then(function () {
        if (isStyle) { currentId = document.getElementById("wc-stilus").value; designPanel.close(); toast(COPY.saved); return; }
        return refresh().then(function () { toast(COPY.saved); });
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
    }).then(function (r) { if (!r.ok) throw new Error("upload"); return refresh(); })
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
  return `${toolbar(opts)}\n${panels(opts)}\n${script(opts)}`;
}
