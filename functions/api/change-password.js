import { getSessionReseller, verifyPassword, hashPassword } from "../_utils/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const formData = await request.formData();
  const jelenlegi = (formData.get("jelenlegi_jelszo") || "").toString();
  const uj = (formData.get("uj_jelszo") || "").toString();
  const uj2 = (formData.get("uj_jelszo2") || "").toString();

  function backWithError(code) {
    return Response.redirect(`${new URL("/partner/account", request.url).href}?pwerror=${code}`, 303);
  }

  const user = await env.DB.prepare("SELECT jelszo_hash FROM viszontelado WHERE id = ?").bind(reseller.id).first();
  const ok = await verifyPassword(jelenlegi, user.jelszo_hash);
  if (!ok) return backWithError("wrong_current");
  if (uj.length < 8) return backWithError("weak_password");
  if (uj !== uj2) return backWithError("mismatch");

  const hash = await hashPassword(uj);
  await env.DB.prepare("UPDATE viszontelado SET jelszo_hash = ? WHERE id = ?").bind(hash, reseller.id).run();

  return Response.redirect(`${new URL("/partner/account", request.url).href}?pwchanged=1`, 303);
}
