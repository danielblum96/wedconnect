import { getSessionReseller } from "../_utils/auth.js";
import { STYLES, FONT_RECIPES, getStyleName, resolveStyleByStoredValue } from "../_utils/styles.js";
import { escapeHtml, safeHref } from "../_utils/html.js";
import { getCopy } from "../_utils/i18n.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const { results: parok } = await env.DB.prepare(
    "SELECT id, par_neve, eskuvo_datuma, slug, allapot, valasztott_stilus, egyedi_uzenet, egyedi_gombok FROM parok WHERE viszontelado_id = ? ORDER BY eskuvo_datuma DESC"
  )
    .bind(reseller.id)
    .all();

  const url = new URL(request.url);
  const saved = url.searchParams.get("saved");
  const error = url.searchParams.get("error");

  const defaultMessage = getCopy(reseller.nyelv || "de").defaultMessage;

  const stylePicker = STYLES.map((s) => {
    return `
      <label class="style-swatch" style="--bg:${s.bg}; --fg:${s.fg}; --accent:${s.accent}; --accent-text:${s.accentText}; --btn-fg:${s.btnFg};">
        <input type="radio" name="stilus" value="${s.id}" required>
        <span class="swatch-mock"></span>
        <span class="swatch-name">${escapeHtml(getStyleName(s, "de"))}</span>
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
              <input type="text" name="gomb_label" placeholder="Button-Beschriftung" value="${escapeHtml(g.label)}">
              <input type="url" name="gomb_url" placeholder="https://..." value="${escapeHtml(g.url)}">
            </div>`;
        })
        .join("");

      const pageUrl = `https://wedconnect.eu/${p.slug}`;
      const styleName = getStyleName(resolveStyleByStoredValue(p.valasztott_stilus), "de");

      return `
        <div class="couple">
          <div class="couple-head">
            <div>
              <div class="couple-name">${escapeHtml(p.par_neve)}</div>
              <div class="couple-meta">${escapeHtml(p.eskuvo_datuma)} · ${escapeHtml(styleName)} · <span class="status">${escapeHtml(p.allapot)}</span></div>
              <a class="couple-link" href="${safeHref(pageUrl)}" target="_blank" rel="noopener">${escapeHtml(pageUrl)}</a>
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
          </div>
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
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
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
  .style-swatch:has(input:checked) { border-color:#b48b56; box-shadow:0 0 0 3px rgba(180,139,86,0.3); }
  .style-picker-hint { font-size:0.78rem; color:var(--muted); margin:-2px 0 16px; }
  .step-label { font-size:0.78rem; font-weight:600; letter-spacing:0.04em; color:var(--accent); text-transform:uppercase; margin:0 0 16px; }
  .hint-inline { font-weight:400; text-transform:none; letter-spacing:0; color:var(--muted); font-size:0.78rem; }
  .wizard-nav { display:flex; gap:12px; margin-top:8px; }
  .btn-back { padding:10px 24px; border:1px solid #ddd6c9; border-radius:999px; background:none; color:var(--fg); font-weight:600; font-size:0.85rem; cursor:pointer; font-family:inherit; }
  .btn-next { padding:10px 24px; border:none; border-radius:999px; background:var(--accent); color:#1a1408; font-weight:600; font-size:0.85rem; cursor:pointer; font-family:inherit; }
  .btn-row { display:flex; gap:8px; align-items:center; }
  .btn-remove-row { flex:none; border:none; background:none; color:var(--muted); font-size:1.2rem; line-height:1; cursor:pointer; padding:0 4px 14px; }
  .btn-add-row { border:1px dashed #ddd6c9; background:none; color:var(--accent); border-radius:8px; padding:9px 14px; font-size:0.85rem; font-weight:600; cursor:pointer; font-family:inherit; margin-bottom:20px; }
</style>
</head>
<body>
<header>
  <div class="brand">Wed<span>Connect</span> Partner</div>
  <div style="display:flex; align-items:center; gap:16px;">
    <span class="who">${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</span>
    <form class="logout-form" method="POST" action="/api/reseller-logout"><button type="submit">Abmelden</button></form>
  </div>
</header>
<main>
  ${error ? `<div class="error-box">Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.</div>` : ""}
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
            <input type="text" name="gomb_label" placeholder="Button-Beschriftung">
            <input type="url" name="gomb_url" placeholder="https://...">
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
  ${rows || '<p class="empty">Noch kein Brautpaar angelegt. Fügen Sie oben das erste hinzu!</p>'}
</main>
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
      '<input type="text" name="gomb_label" placeholder="Button-Beschriftung">' +
      '<input type="url" name="gomb_url" placeholder="https://...">' +
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

    var labels = Array.prototype.map.call(document.getElementsByName("gomb_label"), function (el) {
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
})();
</script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
