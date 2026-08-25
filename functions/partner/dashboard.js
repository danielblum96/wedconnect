import { getSessionReseller } from "../_utils/auth.js";
import { STYLES, getStyleName, resolveStyleByStoredValue } from "../_utils/styles.js";
import { escapeHtml, safeHref } from "../_utils/html.js";

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

  const styleOptions = STYLES.map((s) => `<option value="${s.id}">${escapeHtml(getStyleName(s, "de"))}</option>`).join("");

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
    <form method="POST" action="/api/couple-create">
      <div class="field-row">
        <div><label>Name der Braut</label><input type="text" name="nev1" required></div>
        <div><label>Name des Bräutigams</label><input type="text" name="nev2" required></div>
      </div>
      <div class="field-row">
        <div><label>Hochzeitsdatum</label><input type="date" name="eskuvo_datuma" required></div>
        <div><label>Stil</label><select name="stilus" required>${styleOptions}</select></div>
      </div>
      <button type="submit">Seite erstellen</button>
    </form>
  </div>

  <h2>Ihre Brautpaare</h2>
  ${rows || '<p class="empty">Noch kein Brautpaar angelegt. Fügen Sie oben das erste hinzu!</p>'}
</main>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
