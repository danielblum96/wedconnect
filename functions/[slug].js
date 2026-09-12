import { FONT_RECIPES, namesFontSize, resolveStyleByStoredValue } from "./_utils/styles.js";
import { escapeHtml, safeHref } from "./_utils/html.js";
import { getCopy } from "./_utils/i18n.js";
import { isExpiredUnpaid } from "./_utils/paymentFulfillment.js";

function notFound() {
  const html = `<!DOCTYPE html>
<html lang="hu"><head><meta charset="UTF-8"><meta name="robots" content="noindex, nofollow">
<title>Oldal nem található — WedConnect</title>
<style>body{font-family:sans-serif;background:#faf7f2;color:#2b2620;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;}</style>
</head><body><div><h1>404</h1><p>Ez az oldal nem található.</p></div></body></html>`;
  return new Response(html, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Cloudflare Pages routes this single-segment catch-all BEFORE resolving a
// static folder's index.html (Functions win over implicit folder->index
// resolution here) — so any real static top-level page (e.g. /de/,
// /lili-mark-2026-08-14/) would otherwise be shadowed by this function.
// env.ASSETS.fetch() for a path with no real match silently returns the
// root index.html at 200 (same platform-wide fallback as an unmatched
// route), so we detect "no real static asset" by comparing its ETag
// against root's ETag rather than trusting the 200 status alone.
// A top-level slug can be either a folder-style page (real path is
// "/slug/", serving "slug/index.html") or a plain static FILE at the root
// (e.g. "/sitemap.xml", "/robots.txt") - appending "/" to a file breaks its
// asset lookup, so both variants are tried.
async function findRealStaticAsset(env, request, slug) {
  const [rootResp, exactResp, folderResp] = await Promise.all([
    env.ASSETS.fetch(new Request(new URL("/", request.url), { method: "GET" })),
    env.ASSETS.fetch(new Request(new URL(`/${slug}`, request.url), { method: "GET" })),
    env.ASSETS.fetch(new Request(new URL(`/${slug}/`, request.url), { method: "GET" })),
  ]);
  const rootEtag = rootResp.headers.get("etag");
  const isReal = (resp) => {
    if (resp.status !== 200) return false;
    const etag = resp.headers.get("etag");
    return !(etag && rootEtag && etag === rootEtag);
  };
  if (isReal(exactResp)) return exactResp;
  if (isReal(folderResp)) return folderResp;
  return null;
}

export async function onRequestGet(context) {
  const { params, env, request } = context;
  const slug = params.slug;
  if (!slug || Array.isArray(slug)) return notFound();

  // A real static file/folder (hand-crafted pages like /de/ or
  // /lili-mark-2026-08-14/, which may have custom content beyond what the
  // dynamic renderer below supports) ALWAYS wins, even if a D1 row with the
  // same slug also happens to exist.
  const staticResp = await findRealStaticAsset(env, request, slug);
  if (staticResp) return staticResp;

  const par = await env.DB.prepare(
    "SELECT par_neve, eskuvo_datuma, valasztott_stilus, egyedi_uzenet, egyedi_gombok, esemenyek, nyelv, letrehozva, rendeles_id, viszontelado_id FROM parok WHERE slug = ?"
  )
    .bind(slug)
    .first();

  if (!par) return notFound();
  // Ha az oldal 24 órán belül nem lett rendezve (fizetve, vagy 50+ Save the
  // Date rendeléssel elengedve), a nyilvános oldal ne legyen elérhető - a
  // tényleges törlés a viszonteladó dashboard-jának következő betöltésekor
  // történik (ld. functions/partner/dashboard.js).
  if (isExpiredUnpaid(par, Date.now())) return notFound();

  const style = resolveStyleByStoredValue(par.valasztott_stilus);
  const fontRecipe = FONT_RECIPES[style.font] || FONT_RECIPES.sans;
  const fontSize = namesFontSize(style.font);
  const copy = getCopy(par.nyelv);

  let gombok = [];
  try {
    gombok = par.egyedi_gombok ? JSON.parse(par.egyedi_gombok) : [];
  } catch (e) {
    gombok = [];
  }

  let esemenyek = [];
  try {
    esemenyek = par.esemenyek ? JSON.parse(par.esemenyek) : [];
  } catch (e) {
    esemenyek = [];
  }

  const dateParts = (par.eskuvo_datuma || "").split("-");
  const displayDate =
    dateParts.length === 3 ? `${dateParts[0]}.${dateParts[1]}.${dateParts[2]}.` : escapeHtml(par.eskuvo_datuma || "");

  const message = escapeHtml(par.egyedi_uzenet || copy.defaultMessage);

  const buttonsHtml = gombok.length
    ? `<div class="cta-row">${gombok
        .map(
          (g, i) =>
            `<a class="cta${i > 0 ? " cta-secondary" : ""}" href="${safeHref(g.url)}" target="_blank" rel="noopener">${escapeHtml(g.label)}</a>`
        )
        .join("")}</div>`
    : "";

  const timelineHtml = esemenyek.length
    ? `<div class="timeline">
        <div class="timeline-title">${escapeHtml(copy.programTitle)}</div>
        <div class="timeline-list">
          ${esemenyek
            .map(
              (ev, i) => `
            <div class="timeline-item">
              <div class="timeline-time">${escapeHtml(ev.ido || "")}</div>
              <div class="timeline-marker">
                <span class="timeline-dot"></span>
                ${i < esemenyek.length - 1 ? '<span class="timeline-connector"></span>' : ""}
              </div>
              <div class="timeline-name">${escapeHtml(ev.nev)}</div>
            </div>`
            )
            .join("")}
        </div>
      </div>`
    : "";

  const lang = ["de", "en", "hu"].includes(par.nyelv) ? par.nyelv : "hu";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(copy.pageTitle(par.par_neve))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Great+Vibes&family=Cinzel:wght@500;600&family=Poppins:wght@400;500;600&family=Caveat:wght@500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: ${style.bg};
    --fg: ${style.fg};
    --accent: ${style.accent};
    --accent-text: ${style.accentText};
    --btn-fg: ${style.btnFg};
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    font-family: "Cormorant Garamond", serif;
    background: var(--bg);
    color: var(--fg);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
    text-align: center;
  }
  .card {
    max-width: 640px;
    width: 100%;
    padding: 56px 40px 48px;
    position: relative;
  }
  .card::before {
    content: "";
    position: absolute;
    inset: 0;
    border: 1px solid var(--accent);
    opacity: 0.55;
    pointer-events: none;
  }
  .card::after {
    content: "";
    position: absolute;
    inset: 10px;
    border: 1px solid var(--accent);
    opacity: 0.3;
    pointer-events: none;
  }
  .eyebrow {
    font-family: "Poppins", sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: var(--accent-text);
    margin-bottom: 22px;
  }
  .names {
    ${fontRecipe}
    font-size: ${fontSize};
    line-height: 1.15;
    color: var(--fg);
    margin: 0 0 10px;
    overflow-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
  }
  .date {
    font-family: "Poppins", sans-serif;
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    color: var(--accent-text);
    margin-bottom: 30px;
  }
  .divider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin: 0 auto 30px;
    max-width: 260px;
  }
  .divider .line { flex: 1; height: 1px; background: var(--accent); opacity: 0.5; }
  .divider .mark { color: var(--accent-text); font-size: 1.1rem; transform: rotate(45deg); }
  .message {
    font-size: 1.4rem;
    font-style: italic;
    line-height: 1.55;
    color: var(--fg);
    margin: 0 0 14px;
  }
  .cta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-top: 20px;
  }
  .cta {
    display: inline-block;
    padding: 14px 34px;
    background: var(--accent);
    color: var(--btn-fg);
    border-radius: 999px;
    font-family: "Poppins", sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-decoration: none;
    box-shadow: 0 8px 18px -8px rgba(20, 20, 20, 0.35);
  }
  .cta-secondary {
    background: transparent;
    color: var(--accent-text);
    box-shadow: none;
    border: 1.5px solid var(--accent);
  }
  .timeline {
    margin: 8px 0 30px;
    text-align: left;
  }
  .timeline-title {
    font-family: "Poppins", sans-serif;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--accent-text);
    text-align: center;
    margin-bottom: 20px;
  }
  .timeline-item {
    display: grid;
    grid-template-columns: 64px 20px 1fr;
    column-gap: 14px;
  }
  .timeline-time {
    font-family: "Poppins", sans-serif;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--accent-text);
    text-align: right;
    padding-top: 3px;
    white-space: nowrap;
  }
  .timeline-marker {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .timeline-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--accent);
    flex: none;
    margin-top: 6px;
  }
  .timeline-connector {
    width: 1px;
    flex: 1;
    min-height: 18px;
    background: var(--accent);
    opacity: 0.35;
    margin-top: 2px;
  }
  .timeline-name {
    font-family: "Cormorant Garamond", serif;
    font-size: 1.2rem;
    font-weight: 500;
    color: var(--fg);
    padding-bottom: 22px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">${escapeHtml(copy.eyebrow)}</div>
    <h1 class="names">${escapeHtml(par.par_neve)}</h1>
    <div class="date">${displayDate}</div>
    <div class="divider"><span class="line"></span><span class="mark">❖</span><span class="line"></span></div>
    <p class="message">${message}</p>
    ${timelineHtml}
    ${buttonsHtml}
  </div>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
