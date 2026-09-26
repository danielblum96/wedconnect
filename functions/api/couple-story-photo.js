import { getSessionReseller } from "../_utils/auth.js";
import { checkRateLimit, clientIp } from "../_utils/rateLimit.js";
import { looksLikeImage } from "../_utils/image.js";

// Egy "A mi történetünk" állomás fotójának feltöltése. A kép az R2-ben
// "parok/<slug>/tortenet/<állomás-id>.webp" kulcs alatt él; a D1-ben csak a verziószám
// (parok.tortenet JSON) van, ezt a szekció-mentés (couple-section-update, section=story)
// írja. A törölt állomások/fotók árva képeit a mentés takarítja. Az átméretezést és a
// WebP-konverziót a böngésző végzi (assets/photo-upload.js).
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.json({ error: "unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(env, `story-photo:${clientIp(request)}`, 40, 15 * 60);
  if (!allowed) return Response.json({ error: "rate_limited" }, { status: 429 });

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  const itemId = (formData.get("item_id") || "").toString();
  const file = formData.get("fenykep");

  if (!parId || !/^[a-f0-9]{8}$/.test(itemId)) return Response.json({ error: "invalid" }, { status: 400 });
  if (!(file instanceof File)) return Response.json({ error: "missing_file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return Response.json({ error: "invalid_type" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "too_large" }, { status: 400 });

  const par = await env.DB.prepare("SELECT id, slug FROM parok WHERE id = ? AND viszontelado_id = ?")
    .bind(parId, reseller.id)
    .first();
  if (!par) return Response.json({ error: "not_found" }, { status: 404 });

  const buffer = await file.arrayBuffer();
  if (!looksLikeImage(new Uint8Array(buffer.slice(0, 12)))) return Response.json({ error: "invalid_content" }, { status: 400 });

  await env.PHOTOS.put(`parok/${par.slug}/tortenet/${itemId}.webp`, buffer, { httpMetadata: { contentType: "image/webp" } });
  return Response.json({ ok: true, version: String(Date.now()) });
}
