import { getSessionReseller } from "../_utils/auth.js";
import { slugify } from "../_utils/slug.js";
import { getStyle } from "../_utils/styles.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const formData = await request.formData();
  const nev1 = (formData.get("nev1") || "").toString().trim();
  const nev2 = (formData.get("nev2") || "").toString().trim();
  const datum = (formData.get("eskuvo_datuma") || "").toString().trim();
  const stilusId = (formData.get("stilus") || "").toString().trim();

  function backWithError(code) {
    return Response.redirect(`${new URL("/partner/dashboard", request.url).href}?error=${code}`, 303);
  }

  if (!nev1 || !nev2 || !datum || !stilusId) return backWithError("missing_fields");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return backWithError("invalid_date");

  const style = getStyle(stilusId);
  const baseSlug = `${slugify(nev1)}-${slugify(nev2)}-${datum}`;

  let slug = baseSlug;
  let suffix = 2;
  while (await env.DB.prepare("SELECT id FROM parok WHERE slug = ?").bind(slug).first()) {
    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }

  await env.DB.prepare(
    "INSERT INTO parok (par_neve, eskuvo_datuma, slug, allapot, valasztott_stilus, viszontelado_id, nyelv) VALUES (?, ?, ?, 'Aktív', ?, ?, ?)"
  )
    .bind(`${nev1} & ${nev2}`, datum, slug, style.id, reseller.id, reseller.nyelv || "de")
    .run();

  return Response.redirect(new URL("/partner/dashboard", request.url).href, 303);
}
