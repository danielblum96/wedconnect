import { getSessionReseller } from "../_utils/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  if (!parId) return Response.redirect(new URL("/partner/dashboard", request.url).href, 303);

  await env.DB.prepare("DELETE FROM parok WHERE id = ? AND viszontelado_id = ?").bind(parId, reseller.id).run();

  return Response.redirect(`${new URL("/partner/dashboard", request.url).href}?deleted=1`, 303);
}
