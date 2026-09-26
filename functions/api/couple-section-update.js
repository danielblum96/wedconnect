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

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);
  const dashboardUrl = dashboardHref(reseller.fiok_tipus);

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  const section = (formData.get("section") || "").toString();
  if (!parId) return Response.redirect(new URL(dashboardUrl, request.url).href, 303);

  const par = await env.DB.prepare("SELECT id, slug FROM parok WHERE id = ? AND viszontelado_id = ?")
    .bind(parId, reseller.id)
    .first();
  if (!par) return Response.redirect(new URL(dashboardUrl, request.url).href, 303);

  if (section === "message") {
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
    return Response.redirect(`${new URL(`/${par.slug}`, request.url).href}?szerkesztes=1`, 303);
  }

  const anchor = section === "style" ? "" : `#zone-${section}`;
  return Response.redirect(`${new URL(`/${par.slug}`, request.url).href}?szerkesztes=1&mentve=1${anchor}`, 303);
}
