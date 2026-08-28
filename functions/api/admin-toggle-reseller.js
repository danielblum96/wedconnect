import { getAdminSession } from "../_utils/adminAuth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const session = await getAdminSession(request, env.DB);
  if (!session) return Response.redirect(new URL("/admin/login", request.url).href, 303);

  const formData = await request.formData();
  const viszonteladoId = parseInt((formData.get("viszontelado_id") || "").toString(), 10);
  const action = (formData.get("action") || "").toString();
  const backUrl = new URL("/admin/viszonteladok", request.url).href;

  if (!viszonteladoId) return Response.redirect(backUrl, 303);

  const newAllapot = action === "activate" ? "Aktív" : "Inaktív";
  await env.DB.prepare("UPDATE viszontelado SET allapot = ? WHERE id = ?").bind(newAllapot, viszonteladoId).run();

  return Response.redirect(backUrl, 303);
}
