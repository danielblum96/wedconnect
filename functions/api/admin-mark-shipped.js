import { getAdminSession } from "../_utils/adminAuth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const session = await getAdminSession(request, env.DB);
  if (!session) return Response.redirect(new URL("/admin/login", request.url).href, 303);

  const formData = await request.formData();
  const rendelesId = parseInt((formData.get("rendeles_id") || "").toString(), 10);
  const action = (formData.get("action") || "").toString();
  const backUrl = new URL("/admin/rendelesek", request.url).href;

  if (!rendelesId) return Response.redirect(backUrl, 303);

  const kiszallitvaDatum = action === "ship" ? new Date().toISOString() : null;
  await env.DB.prepare("UPDATE rendelesek SET kiszallitva_datum = ? WHERE id = ?").bind(kiszallitvaDatum, rendelesId).run();

  return Response.redirect(backUrl, 303);
}
