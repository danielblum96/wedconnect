import { getAdminSession } from "../_utils/adminAuth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const session = await getAdminSession(request, env.DB);
  if (!session) return Response.redirect(new URL("/admin/login", request.url).href, 303);

  const formData = await request.formData();
  const rendelesId = parseInt((formData.get("rendeles_id") || "").toString(), 10);
  const backUrl = new URL("/admin/rendelesek", request.url).href;

  if (!rendelesId) return Response.redirect(backUrl, 303);

  // A parok.rendeles_id egy VALÓDI foreign key erre a táblára - ha egy pár
  // épp erre a rendelésre hivatkozik "rendezettként", előbb le kell
  // választani, különben a törlés FK-hibával elszállna (ugyanaz a minta,
  // mint couple-delete.js-ben, csak fordított irányban).
  await env.DB.prepare("UPDATE parok SET rendeles_id = NULL WHERE rendeles_id = ?").bind(rendelesId).run();
  await env.DB.prepare("DELETE FROM rendelesek WHERE id = ?").bind(rendelesId).run();

  return Response.redirect(backUrl, 303);
}
