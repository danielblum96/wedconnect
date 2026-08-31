import { getSessionReseller, dashboardHref } from "../_utils/auth.js";
import { slugify } from "../_utils/slug.js";
import { getStyle } from "../_utils/styles.js";
import { getCopy } from "../_utils/i18n.js";
import { normalizeUrl } from "../_utils/html.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);
  const dashboardUrl = dashboardHref(reseller.fiok_tipus);

  const formData = await request.formData();
  const nev1 = (formData.get("nev1") || "").toString().trim();
  const nev2 = (formData.get("nev2") || "").toString().trim();
  const datum = (formData.get("eskuvo_datuma") || "").toString().trim();
  const stilusId = (formData.get("stilus") || "").toString().trim();
  const uzenet = (formData.get("egyedi_uzenet") || "").toString().trim();
  const labels = formData.getAll("gomb_label");
  const urls = formData.getAll("gomb_url");

  function backWithError(code) {
    return Response.redirect(`${new URL(dashboardUrl, request.url).href}?error=${code}`, 303);
  }

  if (!nev1 || !nev2 || !datum || !stilusId) return backWithError("missing_fields");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return backWithError("invalid_date");

  // Magánszemélyes fiók csak a saját (1 db) oldalát hozhatja létre - a
  // dashboard UI ezt már elrejti, ez a szerver-oldali védőháló ugyanerre,
  // ha valaki közvetlenül POST-olna az endpointra.
  if (reseller.fiok_tipus === "maganszemely") {
    const existing = await env.DB.prepare("SELECT COUNT(*) as cnt FROM parok WHERE viszontelado_id = ?")
      .bind(reseller.id)
      .first();
    if (existing && existing.cnt >= 1) return backWithError("limit_reached");
  }

  const style = getStyle(stilusId);
  const baseSlug = `${slugify(nev1)}-${slugify(nev2)}-${datum}`;

  let slug = baseSlug;
  let suffix = 2;
  while (await env.DB.prepare("SELECT id FROM parok WHERE slug = ?").bind(slug).first()) {
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }

  // A dashboard-form alapból a nyelvnek megfelelő alapszöveget mutatja - ha a
  // viszonteladó ezt változatlanul hagyja, NULL-t tárolunk (nem a szó szerinti
  // szöveget), hogy egy jövőbeli, központi szövegmódosítás is érvényesüljön
  // erre a rekordra, ugyanúgy, mint a valóban üresen hagyott egyedi üzeneteknél.
  const defaultMessage = getCopy(reseller.nyelv || "de").defaultMessage;
  const uzenetToStore = uzenet && uzenet !== defaultMessage ? uzenet : null;

  const gombok = [];
  for (let i = 0; i < labels.length; i++) {
    const label = (labels[i] || "").toString().trim();
    const url = normalizeUrl(urls[i]);
    if (label && url) gombok.push({ label, url });
  }

  await env.DB.prepare(
    "INSERT INTO parok (par_neve, nev1, nev2, eskuvo_datuma, slug, allapot, valasztott_stilus, viszontelado_id, nyelv, egyedi_uzenet, egyedi_gombok) VALUES (?, ?, ?, ?, ?, 'Aktív', ?, ?, ?, ?, ?)"
  )
    .bind(
      `${nev1} & ${nev2}`,
      nev1,
      nev2,
      datum,
      slug,
      style.id,
      reseller.id,
      reseller.nyelv || "de",
      uzenetToStore,
      gombok.length ? JSON.stringify(gombok) : null
    )
    .run();

  return Response.redirect(`${new URL(dashboardUrl, request.url).href}?created=${encodeURIComponent(slug)}`, 303);
}
