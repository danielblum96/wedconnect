import { escapeHtml } from "../_utils/html.js";
import { getResellerCopy } from "../_utils/i18n.js";
import { STYLES, getStyleName } from "../_utils/styles.js";
import { slugify } from "../_utils/slug.js";
import { sendEmail } from "../_utils/mailer.js";
import { recordEvent, browserContext, buildMetaUser, accountType } from "../_utils/measurement.js";
import { parseStoredAttribution } from "../_utils/attribution.js";

// Titkos előnézeti link tokenje (ugyanaz a formátum, mint api/couple-create.js-ben).
function previewToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function stylePicker(lang) {
  return STYLES.map(
    (s) => `
      <label class="style-swatch" style="--bg:${s.bg}; --accent:${s.accent};">
        <input type="radio" name="stilus" value="${s.id}" required>
        <span class="swatch-mock"></span>
        <span class="swatch-name">${escapeHtml(getStyleName(s, lang))}</span>
      </label>`
  ).join("");
}

function page({ state, lang, cegNev, token, error, values }) {
  const t = getResellerCopy(lang).inviteForm;
  const v = values || {};

  const errorMessages = {
    missing_fields: t.missingFields,
    invalid_date: t.invalidDate,
    consent_required: t.consentRequired,
  };

  let body;
  if (state === "invalid") {
    body = `<h1 class="invite-heading">${t.invalidHeading}</h1><p class="invite-hint">${t.invalidHint}</p>`;
  } else if (state === "success") {
    body = `<h1 class="invite-heading">${t.successHeading}</h1><p class="invite-hint">${t.successText(escapeHtml(cegNev))}</p>`;
  } else {
    body = `
      <h1 class="invite-heading">${t.heading(escapeHtml(cegNev))}</h1>
      <p class="invite-intro">${t.intro}</p>
      ${error ? `<div class="error-box">${escapeHtml(errorMessages[error] || "")}</div>` : ""}
      <form method="POST" action="/par-urlap">
        <input type="hidden" name="token" value="${escapeHtml(token)}">
        <div class="field-row">
          <div><label>${t.brideName}</label><input type="text" name="nev1" value="${escapeHtml(v.nev1 || "")}" required></div>
          <div><label>${t.groomName}</label><input type="text" name="nev2" value="${escapeHtml(v.nev2 || "")}" required></div>
        </div>
        <label>${t.weddingDate}</label>
        <input type="date" name="eskuvo_datuma" value="${escapeHtml(v.eskuvo_datuma || "")}" required>

        <h2 class="style-heading">${t.styleHeading}</h2>
        <p class="style-hint">${t.styleHint}</p>
        <div class="style-picker">${stylePicker(lang)}</div>

        <label class="consent-label">
          <input type="checkbox" name="adatkezeles" value="1" required>
          <span>${t.consentLabel} <a href="${t.consentLinkHref}" target="_blank" rel="noopener">${t.consentLinkText}</a>.</span>
        </label>

        <button type="submit" class="btn-submit">${t.submit}</button>
      </form>`;
  }

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${t.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --bg:#faf7f2; --fg:#2b2620; --muted:#7a7266; --accent:#b48b56; --card-bg:#ffffff; --error:#b1451f; }
  * { box-sizing: border-box; }
  html, body { margin:0; min-height:100%; }
  body { font-family:"Poppins",sans-serif; background:var(--bg); color:var(--fg); display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { background:var(--card-bg); max-width:560px; width:100%; padding:40px 36px; border-radius:12px; box-shadow:0 20px 50px -20px rgba(0,0,0,0.15); }
  .brand { font-family:"Cormorant Garamond",serif; font-weight:600; font-size:1.6rem; margin-bottom:20px; text-align:center; }
  .brand span { color:var(--accent); }
  .invite-heading { font-family:"Cormorant Garamond",serif; font-size:1.4rem; font-weight:600; margin:0 0 10px; text-align:center; }
  .invite-hint, .invite-intro { font-size:0.95rem; color:var(--muted); margin:0 0 22px; text-align:center; line-height:1.5; }
  label { display:block; font-size:0.9rem; font-weight:500; margin-bottom:6px; }
  input[type=text], input[type=date] { width:100%; padding:11px 14px; border:1px solid #ddd6c9; border-radius:8px; font-family:inherit; font-size:0.95rem; margin-bottom:16px; }
  input:focus { outline:2px solid var(--accent); outline-offset:1px; }
  .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:start; }
  .field-row > div { display:flex; flex-direction:column; }
  .field-row label { min-height:2.4em; }
  .style-heading { font-family:"Cormorant Garamond",serif; font-size:1.15rem; font-weight:600; margin:6px 0 4px; }
  .style-hint { font-size:0.88rem; color:var(--muted); margin:0 0 14px; font-style:italic; }
  .style-picker { display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:12px; margin-bottom:20px; }
  .style-swatch { position:relative; cursor:pointer; border-radius:10px; overflow:hidden; border:2px solid transparent; box-shadow:0 4px 10px rgba(0,0,0,0.1); }
  .style-swatch input { position:absolute; opacity:0; width:0; height:0; margin:0; }
  .swatch-mock { display:block; background:var(--bg); min-height:56px; border-bottom:4px solid var(--accent); }
  @media (max-width: 420px) {
    .field-row { grid-template-columns:1fr; }
    .field-row label { min-height:0; }
  }
  .swatch-name { display:block; padding:6px 4px; font-size:0.74rem; font-weight:500; text-align:center; color:#4a4038; background:#fff; }
  .style-swatch:has(input:checked) { border-color:#b48b56; box-shadow:0 0 0 3px rgba(180,139,86,0.35); }
  .consent-label { display:flex; align-items:flex-start; gap:8px; font-size:0.85rem; font-weight:400; color:var(--muted); margin-bottom:22px; }
  .consent-label input { width:16px; height:16px; margin:2px 0 0; flex:none; accent-color:var(--accent); }
  .consent-label a { color:var(--accent); }
  .btn-submit { width:100%; display:block; padding:13px; border:none; border-radius:999px; background:linear-gradient(135deg,#f0c988,#b48b56); color:#1a1408; font-family:inherit; font-weight:600; font-size:1rem; letter-spacing:0.03em; cursor:pointer; box-shadow:0 6px 16px -8px rgba(139,102,53,0.6); transition:transform 0.15s ease, box-shadow 0.15s ease; }
  .btn-submit:hover { transform:translateY(-1px); box-shadow:0 8px 20px -8px rgba(139,102,53,0.75); }
  .error-box { background:#fdeee7; color:var(--error); border:1px solid #f3c8b3; padding:10px 14px; border-radius:8px; font-size:0.95rem; margin-bottom:18px; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">Wed<span>Connect</span></div>
    ${body}
  </div>
</body>
</html>`;
}

async function loadInvite(env, token) {
  if (!token) return null;
  return env.DB.prepare(
    `SELECT m.lejar AS invite_lejar, m.felhasznalva AS invite_felhasznalva, v.*
     FROM meghivasok m JOIN viszontelado v ON v.id = m.viszontelado_id
     WHERE m.token = ?`
  )
    .bind(token)
    .first();
}

function isValidInvite(invite) {
  return !!(invite && !invite.invite_felhasznalva && new Date(invite.invite_lejar).getTime() > Date.now());
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const error = url.searchParams.get("error") || "";

  const invite = await loadInvite(env, token);
  const lang = (invite && invite.nyelv) || "hu";

  if (!isValidInvite(invite)) {
    return new Response(page({ state: "invalid", lang }), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return new Response(page({ state: "form", lang, cegNev: invite.ceg_nev, token, error }), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
  const formData = await request.formData();
  const token = (formData.get("token") || "").toString();
  const nev1 = (formData.get("nev1") || "").toString().trim();
  const nev2 = (formData.get("nev2") || "").toString().trim();
  const datum = (formData.get("eskuvo_datuma") || "").toString().trim();
  const stilusId = (formData.get("stilus") || "").toString().trim();
  const adatkezeles = formData.get("adatkezeles");

  const invite = await loadInvite(env, token);
  const lang = (invite && invite.nyelv) || "hu";

  if (!isValidInvite(invite)) {
    return new Response(page({ state: "invalid", lang }), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  function backWithError(code) {
    return new Response(
      page({
        state: "form",
        lang,
        cegNev: invite.ceg_nev,
        token,
        error: code,
        values: { nev1, nev2, eskuvo_datuma: datum },
      }),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const style = STYLES.find((s) => s.id === stilusId);
  if (!nev1 || !nev2 || !datum || !style) return backWithError("missing_fields");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return backWithError("invalid_date");
  if (!adatkezeles) return backWithError("consent_required");

  const baseSlug = `${slugify(nev1)}-${slugify(nev2)}-${datum}`;
  let slug = baseSlug;
  let suffix = 2;
  while (await env.DB.prepare("SELECT id FROM parok WHERE slug = ?").bind(slug).first()) {
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }

  const insert = await env.DB.prepare(
    "INSERT INTO parok (par_neve, nev1, nev2, eskuvo_datuma, slug, allapot, valasztott_stilus, viszontelado_id, nyelv, elonezet_token) VALUES (?, ?, ?, ?, ?, 'Aktív', ?, ?, ?, ?)"
  )
    .bind(`${nev1} & ${nev2}`, nev1, nev2, datum, slug, style.id, invite.id, invite.nyelv || "hu", previewToken())
    .run();

  const parId = insert.meta.last_row_id;
  await env.DB.prepare("UPDATE meghivasok SET felhasznalva = 1, par_id = ? WHERE token = ?").bind(parId, token).run();

  waitUntil(
    (async () => {
      try {
        await sendEmail(env, {
          to: invite.email,
          subject: `${nev1} & ${nev2} kitöltötte a meghívót – WedConnect`,
          html: `<p>${escapeHtml(nev1)} és ${escapeHtml(nev2)} kitöltötte az esküvői oldal adatait. Nézd meg és folytasd a szerkesztést a dashboardon.</p>`,
        });
      } catch (e) {
        console.error(`par-urlap: partner-értesítés sikertelen: ${e.message}`);
      }
    })()
  );

  waitUntil(
    recordEvent(env, {
      eventId: `draft_created_${parId}`,
      name: "wedding_draft_created",
      metaEventName: "DraftCreated",
      viszonteladoId: invite.id,
      parId,
      data: { account_type: accountType(invite.fiok_tipus), country: invite.orszag },
      consent: invite.marketing_hozzajarulas === 1,
      impersonated: !!invite.admin_impersonalt,
      eventSourceUrl: new URL("/par-urlap", request.url).href,
      customData: { account_type: accountType(invite.fiok_tipus), country: invite.orszag, language: invite.nyelv },
      user: buildMetaUser(invite, parseStoredAttribution(invite.attribucio), browserContext(request)),
    })
  );

  return new Response(page({ state: "success", lang, cegNev: invite.ceg_nev }), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
