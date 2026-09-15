import { getSessionReseller } from "../_utils/auth.js";

// A borítókép mindig a pár slugja alatt tárolódik az R2-ben
// ("parok/{slug}.webp") - ez determinisztikus, ezért nincs szükség külön
// kulcs-oszlopra a D1-ben; a parok.fenykep_frissitve mező csak azt jelzi, VAN-e
// kép (NULL = nincs), és a publikus oldalon cache-busting verziószámként
// szolgál (ld. functions/[slug].js).
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.json({ error: "unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  const file = formData.get("fenykep");

  if (!parId) return Response.json({ error: "missing_par_id" }, { status: 400 });
  if (!(file instanceof File)) return Response.json({ error: "missing_file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return Response.json({ error: "invalid_type" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "too_large" }, { status: 400 });

  const par = await env.DB.prepare("SELECT id, slug FROM parok WHERE id = ? AND viszontelado_id = ?")
    .bind(parId, reseller.id)
    .first();
  if (!par) return Response.json({ error: "not_found" }, { status: 404 });

  const buffer = await file.arrayBuffer();
  await env.PHOTOS.put(`parok/${par.slug}.webp`, buffer, {
    httpMetadata: { contentType: "image/webp" },
  });

  const version = String(Date.now());
  await env.DB.prepare("UPDATE parok SET fenykep_frissitve = ? WHERE id = ?").bind(version, parId).run();

  return Response.json({ ok: true, version });
}
