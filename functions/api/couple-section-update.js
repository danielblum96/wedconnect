import { getSessionReseller, dashboardHref } from "../_utils/auth.js";
import { getStyle } from "../_utils/styles.js";
import { normalizeUrl } from "../_utils/html.js";
import { DIVIDER_KEYS } from "../_utils/dividers.js";
import { normalizeOrder } from "../_utils/sectionOrder.js";

// Az oldalon belüli szerkesztő (functions/_utils/pageEditor.js) EGYETLEN szekciót
// ment: az üzenetet, a programot, a gombokat vagy a stílust - a többi mezőhöz
// nem nyúl (a couple-update.js mindent egyszerre ír felül, a popupos
// szerkesztőhöz). A borítókép külön végpontokon megy (couple-photo-upload/-delete).
const MAX_MESSAGE = 1000;
const MAX_BUTTONS = 5;
const MAX_EVENTS = 8;
const MAX_LOCATIONS = 2;
const MAX_STORY = 8;
const CROP_RATIOS = ["3/2", "4/3", "1/1", "16/9"];

// A link akkor érvényes, ha http(s)/mailto, és http(s) esetén a gépnév tartalmaz pontot
// (a normalizeUrl a séma nélküli "pelda.hu"-hoz https://-t fűz).
function validUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "mailto:") return u.pathname.includes("@");
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch (e) {
    return false;
  }
}

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
    // A nevek fölötti felirat: üres = nincs felirat; a mező hiánya (régi kliens) nem módosítja.
    if (formData.has("felirat")) {
      const felirat = (formData.get("felirat") || "").toString().trim().slice(0, 40);
      await env.DB.prepare("UPDATE parok SET nev1 = ?, nev2 = ?, par_neve = ?, eskuvo_datuma = ?, felirat = ? WHERE id = ?")
        .bind(nev1, nev2, `${nev1} & ${nev2}`, datum, felirat, parId)
        .run();
    } else {
      await env.DB.prepare("UPDATE parok SET nev1 = ?, nev2 = ?, par_neve = ?, eskuvo_datuma = ? WHERE id = ?")
        .bind(nev1, nev2, `${nev1} & ${nev2}`, datum, parId)
        .run();
    }
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
      const terkep = normalizeUrl(terkepek[i]).slice(0, 500);
      if (wantsJson && terkep && !validUrl(terkep)) return fail("invalid_url", 400);
      helyek.push({
        cimke: (labels[i] || "").toString().trim().slice(0, 40),
        nev,
        cim,
        terkep,
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
      if (!nev && ido && wantsJson) return fail("event_name_missing", 400);
      if (nev) esemenyek.push({ ido, nev });
    }
    // Időrendbe rendezés: az időponttal rendelkező események a saját "helyeiken" belül
    // rendeződnek időpont szerint, az időpont nélküliek a helyükön maradnak.
    const timed = esemenyek.filter((e) => e.ido).sort((a, b) => a.ido.localeCompare(b.ido));
    let k = 0;
    const sorted = esemenyek.map((e) => (e.ido ? timed[k++] : e));
    await env.DB.prepare("UPDATE parok SET esemenyek = ? WHERE id = ?")
      .bind(sorted.length ? JSON.stringify(sorted) : null, parId)
      .run();
  } else if (section === "buttons") {
    const labels = formData.getAll("gomb_label");
    const urls = formData.getAll("gomb_url");
    const gombok = [];
    for (let i = 0; i < labels.length && gombok.length < MAX_BUTTONS; i++) {
      const label = (labels[i] || "").toString().trim().slice(0, 60);
      const url = normalizeUrl(urls[i]).slice(0, 500);
      if (wantsJson && (!!label !== !!url)) return fail("button_incomplete", 400);
      if (wantsJson && url && !validUrl(url)) return fail("invalid_url", 400);
      if (label && url) gombok.push({ label, url });
    }
    await env.DB.prepare("UPDATE parok SET egyedi_gombok = ? WHERE id = ?")
      .bind(gombok.length ? JSON.stringify(gombok) : null, parId)
      .run();
  } else if (section === "order") {
    const sorrend = normalizeOrder(formData.getAll("sorrend").map((v) => v.toString()));
    await env.DB.prepare("UPDATE parok SET szekcio_sorrend = ? WHERE id = ?").bind(JSON.stringify(sorrend), parId).run();
  } else if (section === "story") {
    const ids = formData.getAll("story_id");
    const datumok = formData.getAll("story_datum");
    const cimek = formData.getAll("story_cim");
    const szovegek = formData.getAll("story_szoveg");
    const items = [];
    const seen = new Set();
    for (let i = 0; i < ids.length && items.length < MAX_STORY; i++) {
      const cim = (cimek[i] || "").toString().trim().slice(0, 100);
      const szoveg = (szovegek[i] || "").toString().trim().slice(0, 500);
      let datum = (datumok[i] || "").toString().trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || Number.isNaN(Date.parse(datum))) datum = "";
      if (!cim && !szoveg && !datum) continue;
      let id = (ids[i] || "").toString();
      if (!/^[a-f0-9]{8}$/.test(id) || seen.has(id)) id = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("");
      seen.add(id);
      items.push({ id, datum, cim, szoveg });
    }
    // Időrendbe rendezés: a dátummal rendelkező állomások a saját "helyeiken" belül rendeződnek
    // dátum szerint, a dátum nélküliek a helyükön maradnak.
    const dated = items.filter((x) => x.datum).sort((a, b) => a.datum.localeCompare(b.datum));
    let k = 0;
    const sorted = items.map((x) => (x.datum ? dated[k++] : x));
    await env.DB.prepare("UPDATE parok SET tortenet = ? WHERE id = ?").bind(sorted.length ? JSON.stringify(sorted) : null, parId).run();
  } else if (section === "countdown") {
    let ido = (formData.get("vissza_ido") || "").toString().trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(ido)) ido = "";
    await env.DB.prepare("UPDATE parok SET visszaszamlalo = ? WHERE id = ?")
      .bind(formData.get("vissza_be") === "1" ? JSON.stringify({ ido }) : null, parId)
      .run();
  } else if (section === "divider") {
    const v = (formData.get("elvalaszto") || "").toString();
    await env.DB.prepare("UPDATE parok SET elvalaszto = ? WHERE id = ?").bind(DIVIDER_KEYS.includes(v) ? v : null, parId).run();
  } else if (section === "photo") {
    const arany = (formData.get("foto_arany") || "").toString();
    const clamp = (v) => Math.max(0, Math.min(100, Math.round(Number(v)) || 0));
    const beallitas = CROP_RATIOS.includes(arany)
      ? JSON.stringify({ arany, x: clamp(formData.get("foto_x") ?? 50), y: clamp(formData.get("foto_y") ?? 50) })
      : null;
    await env.DB.prepare("UPDATE parok SET foto_beallitas = ? WHERE id = ?").bind(beallitas, parId).run();
  } else if (section === "style") {
    const style = getStyle((formData.get("stilus") || "").toString().trim());
    // A Design panel a nyitó animáció kapcsolóját is ide küldi (nyito_mezo = jelen van a mező).
    if (formData.get("nyito_mezo")) {
      const nyito = formData.get("nyito") === "1" ? "boritek" : null;
      await env.DB.prepare("UPDATE parok SET valasztott_stilus = ?, nyito_animacio = ? WHERE id = ?").bind(style.id, nyito, parId).run();
    } else {
      await env.DB.prepare("UPDATE parok SET valasztott_stilus = ? WHERE id = ?").bind(style.id, parId).run();
    }
  } else {
    if (wantsJson) return Response.json({ error: "invalid_section" }, { status: 400 });
    return Response.redirect(`${new URL(`/${par.slug}`, request.url).href}?szerkesztes=1`, 303);
  }

  if (wantsJson) return Response.json({ ok: true });
  const anchor = section === "style" ? "" : `#zone-${section}`;
  return Response.redirect(`${new URL(`/${par.slug}`, request.url).href}?szerkesztes=1&mentve=1${anchor}`, 303);
}
