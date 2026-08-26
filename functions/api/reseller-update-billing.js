import { getSessionReseller } from "../_utils/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const formData = await request.formData();
  const szamlazasiCim = (formData.get("szamlazasi_cim") || "").toString().trim();
  const szallitasAzonos = formData.get("szallitas_azonos") ? 1 : 0;
  const alapSzallitasiCim = szallitasAzonos ? "" : (formData.get("alap_szallitasi_cim") || "").toString().trim();

  if (!szamlazasiCim) {
    return Response.redirect(`${new URL("/partner/account", request.url).href}?billingerror=missing_billing`, 303);
  }

  await env.DB.prepare("UPDATE viszontelado SET szamlazasi_cim = ?, alap_szallitasi_cim = ?, szallitas_azonos = ? WHERE id = ?")
    .bind(szamlazasiCim, alapSzallitasiCim || null, szallitasAzonos, reseller.id)
    .run();

  return Response.redirect(`${new URL("/partner/account", request.url).href}?billingsaved=1`, 303);
}
