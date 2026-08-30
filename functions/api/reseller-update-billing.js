import { getSessionReseller, accountHref } from "../_utils/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);
  const accountUrl = accountHref(reseller.fiok_tipus);

  const formData = await request.formData();
  const adoszam = (formData.get("adoszam") || "").toString().trim();
  const szamlazasiUtca = (formData.get("szamlazasi_utca") || "").toString().trim();
  const szamlazasiIrsz = (formData.get("szamlazasi_irsz") || "").toString().trim();
  const szamlazasiVaros = (formData.get("szamlazasi_varos") || "").toString().trim();
  const szamlazasiOrszag = (formData.get("szamlazasi_orszag") || "").toString().trim();
  const szallitasAzonos = formData.get("szallitas_azonos") ? 1 : 0;
  const alapSzallitasiUtca = szallitasAzonos ? "" : (formData.get("alap_szallitasi_utca") || "").toString().trim();
  const alapSzallitasiIrsz = szallitasAzonos ? "" : (formData.get("alap_szallitasi_irsz") || "").toString().trim();
  const alapSzallitasiVaros = szallitasAzonos ? "" : (formData.get("alap_szallitasi_varos") || "").toString().trim();
  const alapSzallitasiOrszag = szallitasAzonos ? "" : (formData.get("alap_szallitasi_orszag") || "").toString().trim();

  if (!szamlazasiUtca || !szamlazasiIrsz || !szamlazasiVaros) {
    return Response.redirect(`${new URL(accountUrl, request.url).href}?billingerror=missing_billing`, 303);
  }

  await env.DB.prepare(
    `UPDATE viszontelado SET
      adoszam = ?, szamlazasi_utca = ?, szamlazasi_irsz = ?, szamlazasi_varos = ?, szamlazasi_orszag = ?,
      szallitas_azonos = ?, alap_szallitasi_utca = ?, alap_szallitasi_irsz = ?, alap_szallitasi_varos = ?, alap_szallitasi_orszag = ?
    WHERE id = ?`
  )
    .bind(
      adoszam || null,
      szamlazasiUtca,
      szamlazasiIrsz,
      szamlazasiVaros,
      szamlazasiOrszag || null,
      szallitasAzonos,
      alapSzallitasiUtca || null,
      alapSzallitasiIrsz || null,
      alapSzallitasiVaros || null,
      alapSzallitasiOrszag || null,
      reseller.id
    )
    .run();

  return Response.redirect(`${new URL(accountUrl, request.url).href}?billingsaved=1`, 303);
}
