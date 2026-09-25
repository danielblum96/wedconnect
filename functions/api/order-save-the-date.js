import { getSessionReseller, dashboardHref } from "../_utils/auth.js";
import { recordEvent, browserContext, buildMetaUser, accountType } from "../_utils/measurement.js";
import { parseStoredAttribution } from "../_utils/attribution.js";
import { getPricing } from "../_utils/i18n.js";
import { createCheckoutSession } from "../_utils/stripe.js";

export async function onRequestPost(context) {
  // Save the Date (2026-09-25): a partneres modellben nincs ilyen termék, a végpont ki van vezetve.
  return new Response("Not found", { status: 404 });
  const { request, env, waitUntil } = context;
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

  function backWithError(code) {
    return Response.redirect(`${new URL(dashboardHref(reseller.fiok_tipus), request.url).href}?stderror=${code}`, 303);
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
  const pricing = getPricing(lang, reseller.fiok_tipus);
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
      szallitasi_utca, szallitasi_irsz, szallitasi_varos, szallitasi_orszag
    ) VALUES (?, ?, ?, ?, ?, ?, 'Fizetésre vár', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      wantsStd ? shipping.orszag || null : null
    )
    .run();

  const rendelesId = insert.meta.last_row_id;
  const dashboardUrl = new URL(dashboardHref(reseller.fiok_tipus), request.url).href;

  try {
    const session = await createCheckoutSession(env, {
      currency: pricing.currency,
      amount: total,
      productName: csomag,
      locale: lang,
      successUrl: `${dashboardUrl}?stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${dashboardUrl}?stripe_cancelled=std`,
      customerEmail: reseller.email,
      metadata: { rendeles_id: String(rendelesId), tipus: wantsStd ? "std" : "oldal", par_id: String(par.id) },
    });
    // A böngésző FRISS adata a rendeléshez mentve (ld. couple-pay.js).
    const consent = reseller.marketing_hozzajarulas === 1;
    const impersonated = !!reseller.admin_impersonalt;
    const context_ = consent && !impersonated ? browserContext(request) : null;
    await env.DB.prepare("UPDATE rendelesek SET stripe_session_id = ?, mero_kontextus = ? WHERE id = ?")
      .bind(session.id, context_ ? JSON.stringify(context_) : null, rendelesId)
      .run();
    const productType = wantsStd ? "save_the_date" : "wedding_website";
    const quantity = wantsStd ? mennyiseg : 1;
    waitUntil(
      recordEvent(env, {
        eventId: `checkout_${rendelesId}`,
        name: "checkout_started",
        metaEventName: "InitiateCheckout",
        viszonteladoId: reseller.id,
        parId: par.id,
        rendelesId,
        value: total,
        currency: pricing.currency,
        data: { account_type: accountType(reseller.fiok_tipus), product_type: productType, quantity, country: reseller.orszag },
        consent,
        impersonated,
        eventSourceUrl: dashboardUrl,
        customData: {
          value: total,
          currency: pricing.currency,
          order_id: String(rendelesId),
          account_type: accountType(reseller.fiok_tipus),
          product_type: productType,
          quantity,
          country: reseller.orszag,
        },
        user: buildMetaUser(reseller, parseStoredAttribution(reseller.attribucio), context_),
      })
    );
    return Response.redirect(session.url, 303);
  } catch (e) {
    console.error(`order-save-the-date: Stripe session létrehozása sikertelen (rendeles_id=${rendelesId}): ${e.message}`);
    return backWithError("stripe_error");
  }
}
