import { getSessionReseller } from "../_utils/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.json({ error: "unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  if (!parId) return Response.json({ error: "missing_par_id" }, { status: 400 });

  const par = await env.DB.prepare("SELECT id, slug FROM parok WHERE id = ? AND viszontelado_id = ?")
    .bind(parId, reseller.id)
    .first();
  if (!par) return Response.json({ error: "not_found" }, { status: 404 });

  await env.PHOTOS.delete(`parok/${par.slug}.webp`);
  await env.DB.prepare("UPDATE parok SET fenykep_frissitve = NULL WHERE id = ?").bind(parId).run();

  return Response.json({ ok: true });
}
