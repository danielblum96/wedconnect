import { getSessionReseller } from "../_utils/auth.js";
import { getPricing } from "../_utils/i18n.js";
import { createCheckoutSession } from "../_utils/stripe.js";
import { decodeBase64Png } from "../_utils/previewImage.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  const mennyisegRaw = (formData.get("mennyiseg") || "").toString().trim();
  const mennyiseg = mennyisegRaw === "" ? 0 : parseInt(mennyisegRaw, 10);
  const megjegyzes = (formData.get("megjegyzes") || "").toString().trim();
  const adoszam = (formData.get("adoszam") || "").toString().trim();

  const billing = {
    utca: (formData.get("szamlazasi_utca") || "").toString().trim(),
    irsz: (formData.get("szamlazasi_irsz") || "").toString().trim(),
    varos: (formData.get("szamlazasi_varos") || "").toString().trim(),
    orszag: (formData.get("szamlazasi_orszag") || "").toString().trim(),
  };
  const shipping = {
    utca: (formData.get("szallitasi_utca") || "").toString().trim(),
    irsz: (formData.get("szallitasi_irsz") || "").toString().trim(),
    varos: (formData.get("szallitasi_varos") || "").toString().trim(),
    orszag: (formData.get("szallitasi_orszag") || "").toString().trim(),
  };
  const wantsStd = mennyiseg > 0;
  // A user kérésére a csak-oldal fizetésnél NE jelenjen meg semmilyen kép a
  // Stripe checkout oldalán - a termékkép csak a Save the Date rendelésnél
  // (naptár + oldal együtt) marad meg.
  const previewKep = wantsStd ? decodeBase64Png((formData.get("preview_kep") || "").toString()) : null;

  function backWithError(code) {
    return Response.redirect(`${new URL("/partner/dashboard", request.url).href}?stderror=${code}`, 303);
  }

  if (!parId || isNaN(mennyiseg) || mennyiseg < 0 || mennyiseg > 9999) return backWithError("invalid");
  if (wantsStd && mennyiseg < 50) return backWithError("min_quantity");
  if (!billing.utca || !billing.irsz || !billing.varos) return backWithError("missing_billing");
  if (wantsStd && (!shipping.utca || !shipping.irsz || !shipping.varos)) return backWithError("missing_address");

  const par = await env.DB.prepare("SELECT id, par_neve FROM parok WHERE id = ? AND viszontelado_id = ?")
    .bind(parId, reseller.id)
    .first();
  if (!par) return backWithError("invalid");

  const lang = reseller.nyelv || "de";
  const pricing = getPricing(lang);
  const PAGE_PRICE = pricing.pagePrice;
  const STD_PRICE = pricing.stdPrice;

  const stdSubtotal = mennyiseg * STD_PRICE;
  const pageFee = wantsStd ? 0 : PAGE_PRICE;
  const total = pageFee + stdSubtotal;
  const csomag = wantsStd ? pricing.stdProduct : pricing.pageOnlyProduct;

  const insert = await env.DB.prepare(
    `INSERT INTO rendelesek (
      viszontelado_id, par_id, csomag, mennyiseg, ar_osszesen, penznem, allapot, megjegyzes,
      adoszam, szamlazasi_utca, szamlazasi_irsz, szamlazasi_varos, szamlazasi_orszag,
      szallitasi_utca, szallitasi_irsz, szallitasi_varos, szallitasi_orszag, preview_kep
    ) VALUES (?, ?, ?, ?, ?, ?, 'Fizetésre vár', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      reseller.id,
      par.id,
      csomag,
      wantsStd ? mennyiseg : 1,
      total,
      pricing.currency,
      megjegyzes || null,
      adoszam || null,
      billing.utca,
      billing.irsz,
      billing.varos,
      billing.orszag || null,
      wantsStd ? shipping.utca : null,
      wantsStd ? shipping.irsz : null,
      wantsStd ? shipping.varos : null,
      wantsStd ? shipping.orszag || null : null,
      previewKep
    )
    .run();

  const rendelesId = insert.meta.last_row_id;
  const dashboardUrl = new URL("/partner/dashboard", request.url).href;
  const imageUrl = previewKep ? `${new URL("/api/checkout-preview", request.url).href}?rendeles_id=${rendelesId}` : undefined;

  try {
    const session = await createCheckoutSession(env, {
      currency: pricing.currency,
      amount: total,
      productName: csomag,
      imageUrl,
      successUrl: `${dashboardUrl}?stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${dashboardUrl}?stripe_cancelled=std`,
      customerEmail: reseller.email,
      metadata: { rendeles_id: String(rendelesId), tipus: "std", par_id: String(par.id) },
    });
    await env.DB.prepare("UPDATE rendelesek SET stripe_session_id = ? WHERE id = ?").bind(session.id, rendelesId).run();
    return Response.redirect(session.url, 303);
  } catch (e) {
    console.error(`order-save-the-date: Stripe session létrehozása sikertelen (rendeles_id=${rendelesId}): ${e.message}`);
    return backWithError("stripe_error");
  }
}
