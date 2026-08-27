import { verifyStripeSignature } from "../_utils/stripe.js";
import { fulfillStripeOrder } from "../_utils/paymentFulfillment.js";

// A Stripe ide küldi a checkout.session.completed eseményt, miután egy
// fizetés sikeresen lezajlott. Ez az AUTORITATÍV megerősítési útvonal - a
// dashboard.js success_url visszaellenőrzése csak egy gyorsabb, opcionális
// kiegészítés ugyanahhoz a (idempotens) fulfillStripeOrder()-hez.
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error("stripe-webhook: STRIPE_WEBHOOK_SECRET nincs beállítva.");
    return new Response("webhook secret missing", { status: 500 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get("Stripe-Signature");
  const valid = await verifyStripeSignature(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    console.error("stripe-webhook: érvénytelen aláírás.");
    return new Response("invalid signature", { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return new Response("invalid payload", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data && event.data.object;
    const rendelesId = session && session.metadata && session.metadata.rendeles_id;
    if (rendelesId) {
      try {
        await fulfillStripeOrder(env, parseInt(rendelesId, 10));
      } catch (e) {
        console.error(`stripe-webhook: fulfillStripeOrder hiba (rendeles_id=${rendelesId}): ${e.message}`);
        return new Response("fulfillment error", { status: 500 });
      }
    }
  }

  return new Response("ok", { status: 200 });
}
