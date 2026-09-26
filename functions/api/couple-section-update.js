import { getSessionReseller, dashboardHref } from "../_utils/auth.js";
import { getStyle } from "../_utils/styles.js";
import { normalizeUrl } from "../_utils/html.js";

// Az oldalon belüli szerkesztő (functions/_utils/pageEditor.js) EGYETLEN szekciót
// ment: az üzenetet, a programot, a gombokat vagy a stílust - a többi mezőhöz
// nem nyúl (a couple-update.js mindent egyszerre ír felül, a popupos
// szerkesztőhöz). A borítókép külön végpontokon megy (couple-photo-upload/-delete).
const MAX_MESSAGE = 1000;
const MAX_BUTTONS = 5;
const MAX_EVENTS = 8;
const MAX_LOCATIONS = 2;

export async function onRequestPost(context) {
  const { request, env } = context;
  // A szerkesztő mód (fetch) JSON-választ kér, a JS nélküli űrlap-beküldés átirányítást kap.
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");
  const fail = (code, status) => (wantsJson ? Response.json({ error: code }, { status }) : null);

  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return fail("unauthorized", 401) || Response.redirect(new URL("/partner/login", request.url).href, 303);
  const dashboardUrl = dashboardHref(reseller.fiok_tipus);

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  const section = (formData.get("section") || "").toString();
  if (!parId) return fail("invalid", 400) || Response.redirect(new URL(dashboardUrl, request.url).href, 303);

  const par = await env.DB.prepare("SELECT id, slug FROM parok WHERE id = ? AND viszontelado_id = ?")
    .bind(parId, reseller.id)
    .first();
  if (!par) return fail("not_found", 404) || Response.redirect(new URL(dashboardUrl, request.url).href, 303);

  if (section === "names") {
    const nev1 = (formData.get("nev1") || "").toString().trim().slice(0, 60);
    const nev2 = (formData.get("nev2") || "").toString().trim().slice(0, 60);
    const datum = (formData.get("eskuvo_datuma") || "").toString().trim();
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(datum) && !Number.isNaN(Date.parse(datum));
    if (!nev1 || !nev2 || !validDate) return fail("invalid", 400) || Response.redirect(`${new URL(`/${par.slug}`, request.url).href}?szerkesztes=1`, 303);
    // A slug (és vele a link, a QR-kód, a fotó R2-kulcsa) szándékosan NEM változik.
    await env.DB.prepare("UPDATE parok SET nev1 = ?, nev2 = ?, par_neve = ?, eskuvo_datuma = ? WHERE id = ?")
      .bind(nev1, nev2, `${nev1} & ${nev2}`, datum, parId)
      .run();
  } else if (section === "location") {
    const labels = formData.getAll("hely_cimke");
    const nevek = formData.getAll("hely_nev");
    const cimek = formData.getAll("hely_cim");
    const terkepek = formData.getAll("hely_terkep");
    const helyek = [];
    for (let i = 0; i < nevek.length && helyek.length < MAX_LOCATIONS; i++) {
      const nev = (nevek[i] || "").toString().trim().slice(0, 100);
      const cim = (cimek[i] || "").toString().trim().slice(0, 200);
      if (!nev && !cim) continue;
      helyek.push({
        cimke: (labels[i] || "").toString().trim().slice(0, 40),
        nev,
        cim,
        terkep: normalizeUrl(terkepek[i]).slice(0, 500),
      });
    }
    await env.DB.prepare("UPDATE parok SET helyszin = ? WHERE id = ?")
      .bind(helyek.length ? JSON.stringify(helyek) : null, parId)
      .run();
  } else if (section === "message") {
    const uzenet = (formData.get("egyedi_uzenet") || "").toString().trim().slice(0, MAX_MESSAGE);
    await env.DB.prepare("UPDATE parok SET egyedi_uzenet = ? WHERE id = ?").bind(uzenet || null, parId).run();
  } else if (section === "program") {
    const times = formData.getAll("esemeny_ido");
    const names = formData.getAll("esemeny_nev");
    const esemenyek = [];
    for (let i = 0; i < names.length && esemenyek.length < MAX_EVENTS; i++) {
      const nev = (names[i] || "").toString().trim().slice(0, 100);
      const ido = (times[i] || "").toString().trim().slice(0, 10);
      if (nev) esemenyek.push({ ido, nev });
    }
    await env.DB.prepare("UPDATE parok SET esemenyek = ? WHERE id = ?")
      .bind(esemenyek.length ? JSON.stringify(esemenyek) : null, parId)
      .run();
  } else if (section === "buttons") {
    const labels = formData.getAll("gomb_label");
    const urls = formData.getAll("gomb_url");
    const gombok = [];
    for (let i = 0; i < labels.length && gombok.length < MAX_BUTTONS; i++) {
      const label = (labels[i] || "").toString().trim().slice(0, 60);
      const url = normalizeUrl(urls[i]).slice(0, 500);
      if (label && url) gombok.push({ label, url });
    }
    await env.DB.prepare("UPDATE parok SET egyedi_gombok = ? WHERE id = ?")
      .bind(gombok.length ? JSON.stringify(gombok) : null, parId)
      .run();
  } else if (section === "style") {
    const style = getStyle((formData.get("stilus") || "").toString().trim());
    await env.DB.prepare("UPDATE parok SET valasztott_stilus = ? WHERE id = ?").bind(style.id, parId).run();
  } else {
    if (wantsJson) return Response.json({ error: "invalid_section" }, { status: 400 });
    return Response.redirect(`${new URL(`/${par.slug}`, request.url).href}?szerkesztes=1`, 303);
  }

  if (wantsJson) return Response.json({ ok: true });
  const anchor = section === "style" ? "" : `#zone-${section}`;
  return Response.redirect(`${new URL(`/${par.slug}`, request.url).href}?szerkesztes=1&mentve=1${anchor}`, 303);
}
