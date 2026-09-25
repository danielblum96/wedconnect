import { getSessionReseller, dashboardHref } from "../_utils/auth.js";
import { getPricing } from "../_utils/i18n.js";
import { createCheckoutSession } from "../_utils/stripe.js";
import { recordEvent, browserContext, buildMetaUser, accountType } from "../_utils/measurement.js";
import { parseStoredAttribution } from "../_utils/attribution.js";
import { sendEmail } from "../_utils/mailer.js";
import { escapeHtml } from "../_utils/html.js";

// Egy VÁZLAT (parok.rendeles_id IS NULL) PUBLIKÁLÁSA - a dashboard "Publikálás"
// gombja hívja. A partner ELSŐ publikált oldala INGYENES (0 Ft-os 'Ingyenes'
// rendelés), minden további Stripe-fizetéssel jár. Ugyanaz a
// Stripe-alapú mintázat, mint az order-save-the-date.js-nél: előbb egy
// 'Fizetésre vár' rendelesek-sor, majd Stripe Checkout Session, a tényleges
// rendezés (parok.rendeles_id beállítása) a webhook/success_url-en keresztül,
// ld. _utils/paymentFulfillment.js.
export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
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

  // Az első publikált oldal INGYENES a partnereknek (a user döntése, 2026-09-25). A
  // magánszemély fiókok (régi modell) nem kapnak ingyenes oldalt.
  if (reseller.fiok_tipus !== "maganszemely") {
    const already = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM parok WHERE viszontelado_id = ? AND rendeles_id IS NOT NULL"
    )
      .bind(reseller.id)
      .first();
    if (already && already.n === 0) {
      const orderIns = await env.DB.prepare(
        "INSERT INTO rendelesek (viszontelado_id, par_id, csomag, mennyiseg, ar_osszesen, penznem, allapot) VALUES (?, ?, ?, 1, 0, ?, 'Ingyenes')"
      )
        .bind(reseller.id, par.id, `${pricing.pageLabel} (ingyenes)`, pricing.currency)
        .run();
      const orderId = orderIns.meta.last_row_id;
      // Atomi átvétel (dupla kattintás ellen): csak az a kérés publikál, amelyik módosít sort.
      const claim = await env.DB.prepare(
        "UPDATE parok SET rendeles_id = ?, publikalva = datetime('now') WHERE id = ? AND rendeles_id IS NULL"
      )
        .bind(orderId, par.id)
        .run();
      // Egyidejű kérések (két vázlat egyszerre) esetén a KISEBB rendelés-azonosítójú
      // kérés kapja az ingyenes helyet, a másik fizetősre vált (nem lehet két ingyenes).
      const earlierFree = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM rendelesek WHERE viszontelado_id = ? AND allapot = 'Ingyenes' AND id < ?"
      )
        .bind(reseller.id, orderId)
        .first();
      if (!claim.meta.changes || (earlierFree && earlierFree.n > 0)) {
        // Vagy már publikálva volt, vagy egy másik, egyidejű kérés már elvitte az ingyenes helyet.
        if (claim.meta.changes) {
          await env.DB.prepare("UPDATE parok SET rendeles_id = NULL, publikalva = NULL WHERE id = ?").bind(par.id).run();
        }
        await env.DB.prepare("DELETE FROM rendelesek WHERE id = ?").bind(orderId).run();
        if (!claim.meta.changes) return Response.redirect(dashboardUrl, 303);
      } else {
        const slugRow = await env.DB.prepare("SELECT slug FROM parok WHERE id = ?").bind(par.id).first();
        const slug = slugRow ? slugRow.slug : "";
        waitUntil(
          recordEvent(env, {
            eventId: `published_${par.id}`,
            name: "wedding_page_published",
            metaEventName: "WeddingPagePublished",
            viszonteladoId: reseller.id,
            parId: par.id,
            rendelesId: orderId,
            data: { account_type: accountType(reseller.fiok_tipus), free: true, country: reseller.orszag },
            consent: reseller.marketing_hozzajarulas === 1,
            impersonated: !!reseller.admin_impersonalt,
            eventSourceUrl: dashboardUrl,
            customData: { account_type: accountType(reseller.fiok_tipus), free: true, country: reseller.orszag },
            user: buildMetaUser(reseller, parseStoredAttribution(reseller.attribucio), browserContext(request)),
          })
        );
        waitUntil(
          (async () => {
            try {
              await sendEmail(env, {
                to: env.ADMIN_EMAIL,
                subject: `Ingyenes publikálás – ${reseller.ceg_nev}`,
                html: `<h2>Egy partner publikálta az első (ingyenes) oldalát</h2>
                  <p><strong>Partner:</strong> ${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</p>
                  <p><strong>Oldal:</strong> <a href="https://wedconnect.eu/${escapeHtml(slug)}">${escapeHtml(par.par_neve)}</a></p>`,
              });
            } catch (e) {
              console.error(`couple-pay: admin email (ingyenes publikálás) sikertelen: ${e.message}`);
            }
          })()
        );
        return Response.redirect(`${dashboardUrl}?published=1`, 303);
      }
    }
  }

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
    // A böngésző FRISS adata (IP, User-Agent, _fbp/_fbc) a rendeléshez mentve, hogy a
    // későbbi, webhookból érkező Purchase ezt használja a regisztrációkori helyett.
    // Csak hozzájárulással és nem admin-megtekintésből.
    const consent = reseller.marketing_hozzajarulas === 1;
    const impersonated = !!reseller.admin_impersonalt;
    const context_ = consent && !impersonated ? browserContext(request) : null;
    await env.DB.prepare("UPDATE rendelesek SET stripe_session_id = ?, mero_kontextus = ? WHERE id = ?")
      .bind(session.id, context_ ? JSON.stringify(context_) : null, rendelesId)
      .run();
    waitUntil(
      recordEvent(env, {
        eventId: `checkout_${rendelesId}`,
        name: "checkout_started",
        metaEventName: "InitiateCheckout",
        viszonteladoId: reseller.id,
        parId: par.id,
        rendelesId,
        value: pricing.pagePrice,
        currency: pricing.currency,
        data: { account_type: accountType(reseller.fiok_tipus), product_type: "wedding_website", quantity: 1, country: reseller.orszag },
        consent,
        impersonated,
        eventSourceUrl: dashboardUrl,
        customData: {
          value: pricing.pagePrice,
          currency: pricing.currency,
          order_id: String(rendelesId),
          account_type: accountType(reseller.fiok_tipus),
          product_type: "wedding_website",
          quantity: 1,
          country: reseller.orszag,
        },
        user: buildMetaUser(reseller, parseStoredAttribution(reseller.attribucio), context_),
      })
    );
    return Response.redirect(session.url, 303);
  } catch (e) {
    console.error(`couple-pay: Stripe session létrehozása sikertelen (rendeles_id=${rendelesId}): ${e.message}`);
    return backWithError("stripe_error");
  }
}
