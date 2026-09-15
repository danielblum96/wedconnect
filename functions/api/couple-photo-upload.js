import { getSessionReseller } from "../_utils/auth.js";
import { checkRateLimit, clientIp } from "../_utils/rateLimit.js";

// A borítókép mindig a pár slugja alatt tárolódik az R2-ben
// ("parok/{slug}.webp") - ez determinisztikus, ezért nincs szükség külön
// kulcs-oszlopra a D1-ben; a parok.fenykep_frissitve mező csak azt jelzi, VAN-e
// kép (NULL = nincs), és a publikus oldalon cache-busting verziószámként
// szolgál (ld. functions/[slug].js).
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

// A kliens a feltöltés előtt MINDIG átméretezi és WebP-vé konvertálja a képet
// (ld. assets/photo-upload.js), DE ez csak a böngészőben fut - egy
// szerkesztett/szkriptelt kérés simán elküldhetne bármilyen bájtsorozatot
// "image/webp" típusként (a File.type-ot a feltöltő teljesen szabadon
// állíthatja). Mivel a Workers-futtatókörnyezet nem tud képet dekódolni,
// a méretet/arányt itt nem lehet ellenőrizni, de a fájl ELEJÉN lévő "magic
// bytes" alapján kiszűrhető, ha valaki egyáltalán NEM kép tartalmat próbál
// betölteni (pl. HTML/JS, hogy a wedconnect.eu domain-t tetszőleges fájlok
// tárolására/terjesztésére használja) - ez nem 100%-os védelem, de a
// legegyszerűbb visszaélési formát kizárja.
function looksLikeImage(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true; // JPEG
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true; // PNG
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return true; // WebP (RIFF....WEBP)
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true; // GIF87a/GIF89a
  return false;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.json({ error: "unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(
    env,
    `photo-upload:${clientIp(request)}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) return Response.json({ error: "rate_limited" }, { status: 429 });

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
  const bytes = new Uint8Array(buffer.slice(0, 12));
  if (!looksLikeImage(bytes)) return Response.json({ error: "invalid_content" }, { status: 400 });

  await env.PHOTOS.put(`parok/${par.slug}.webp`, buffer, {
    httpMetadata: { contentType: "image/webp" },
  });

  const version = String(Date.now());
  await env.DB.prepare("UPDATE parok SET fenykep_frissitve = ? WHERE id = ?").bind(version, parId).run();

  return Response.json({ ok: true, version });
}
