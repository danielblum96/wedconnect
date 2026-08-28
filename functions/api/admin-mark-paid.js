import { getAdminSession } from "../_utils/adminAuth.js";
import { fulfillStripeOrder } from "../_utils/paymentFulfillment.js";

// Manuális "fizetve" jelölés admin felületről (pl. készpénz vagy banki
// utalás esetén, amikor nincs Stripe-tranzakció) - a MEGLÉVŐ, a Stripe
// webhookkal és a dashboard success_url-jével azonos fulfillStripeOrder()
// segédfüggvényt hívja, ezért ugyanúgy beállítja a parok.rendeles_id-t és
// elküldi a visszaigazoló emailt is, mint egy valódi Stripe-fizetésnél.
export async function onRequestPost(context) {
  const { request, env } = context;
  const session = await getAdminSession(request, env.DB);
  if (!session) return Response.redirect(new URL("/admin/login", request.url).href, 303);

  const formData = await request.formData();
  const rendelesId = parseInt((formData.get("rendeles_id") || "").toString(), 10);
  const backUrl = new URL("/admin/rendelesek", request.url).href;

  if (!rendelesId) return Response.redirect(backUrl, 303);

  await fulfillStripeOrder(env, rendelesId);

  return Response.redirect(backUrl, 303);
}
