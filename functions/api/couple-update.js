import { getSessionReseller, dashboardHref } from "../_utils/auth.js";
import { getStyle } from "../_utils/styles.js";
import { normalizeUrl } from "../_utils/html.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);
  const dashboardUrl = dashboardHref(reseller.fiok_tipus);

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  const uzenet = (formData.get("egyedi_uzenet") || "").toString().trim();
  const stilusId = (formData.get("stilus") || "").toString().trim();
  const labels = formData.getAll("gomb_label");
  const urls = formData.getAll("gomb_url");

  if (!parId) return Response.redirect(new URL(dashboardUrl, request.url).href, 303);

  const owned = await env.DB.prepare("SELECT id FROM parok WHERE id = ? AND viszontelado_id = ?")
    .bind(parId, reseller.id)
    .first();
  if (!owned) return Response.redirect(new URL(dashboardUrl, request.url).href, 303);

  const gombok = [];
  for (let i = 0; i < labels.length; i++) {
    const label = (labels[i] || "").toString().trim();
    const url = normalizeUrl(urls[i]);
    if (label && url) gombok.push({ label, url });
  }

  const style = getStyle(stilusId);

  await env.DB.prepare("UPDATE parok SET egyedi_uzenet = ?, egyedi_gombok = ?, valasztott_stilus = ? WHERE id = ?")
    .bind(uzenet || null, gombok.length ? JSON.stringify(gombok) : null, style.id, parId)
    .run();

  return Response.redirect(`${new URL(dashboardUrl, request.url).href}?saved=${parId}`, 303);
}
