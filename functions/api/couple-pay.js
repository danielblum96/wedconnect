import { getSessionReseller, dashboardHref } from "../_utils/auth.js";
import { getPricing } from "../_utils/i18n.js";
import { createCheckoutSession } from "../_utils/stripe.js";

// Egy már élő, de MÉG NEM rendezett (parok.rendeles_id IS NULL) esküvői oldal
// önálló kifizetése - a dashboard "Fizetés" gombja hívja. Ugyanaz a
// Stripe-alapú mintázat, mint az order-save-the-date.js-nél: előbb egy
// 'Fizetésre vár' rendelesek-sor, majd Stripe Checkout Session, a tényleges
// rendezés (parok.rendeles_id beállítása) a webhook/success_url-en keresztül,
// ld. _utils/paymentFulfillment.js.
export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  const dashboardUrl = new URL(dashboardHref(reseller.fiok_tipus), request.url).href;

  function backWithError(code) {
    return Response.redirect(`${dashboardUrl}?stderror=${code}`, 303);
  }

  if (!parId) return backWithError("invalid");

  const par = await env.DB.prepare("SELECT id, par_neve, rendeles_id FROM parok WHERE id = ? AND viszontelado_id = ?")
    .bind(parId, reseller.id)
    .first();
  if (!par) return backWithError("invalid");
  if (par.rendeles_id) return Response.redirect(dashboardUrl, 303); // már rendezve van

  const lang = reseller.nyelv || "de";
  const pricing = getPricing(lang, reseller.fiok_tipus);

  const insert = await env.DB.prepare(
    `INSERT INTO rendelesek (viszontelado_id, par_id, csomag, mennyiseg, ar_osszesen, penznem, allapot,
       adoszam, szamlazasi_utca, szamlazasi_irsz, szamlazasi_varos, szamlazasi_orszag)
     VALUES (?, ?, ?, 1, ?, ?, 'Fizetésre vár', ?, ?, ?, ?, ?)`
  )
    .bind(
      reseller.id,
      par.id,
      pricing.pageLabel,
      pricing.pagePrice,
      pricing.currency,
      reseller.adoszam || null,
      reseller.szamlazasi_utca || null,
      reseller.szamlazasi_irsz || null,
      reseller.szamlazasi_varos || null,
      reseller.szamlazasi_orszag || null
    )
    .run();

  const rendelesId = insert.meta.last_row_id;

  try {
    const session = await createCheckoutSession(env, {
      currency: pricing.currency,
      amount: pricing.pagePrice,
      productName: `${pricing.pageLabel} – ${par.par_neve}`,
      locale: lang,
      successUrl: `${dashboardUrl}?stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${dashboardUrl}?stripe_cancelled=oldal`,
      customerEmail: reseller.email,
      metadata: { rendeles_id: String(rendelesId), tipus: "oldal", par_id: String(par.id) },
    });
    await env.DB.prepare("UPDATE rendelesek SET stripe_session_id = ? WHERE id = ?").bind(session.id, rendelesId).run();
    return Response.redirect(session.url, 303);
  } catch (e) {
    console.error(`couple-pay: Stripe session létrehozása sikertelen (rendeles_id=${rendelesId}): ${e.message}`);
    return backWithError("stripe_error");
  }
}
