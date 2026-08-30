import { hashPassword, newSessionToken, sessionCookie } from "../_utils/auth.js";
import { checkRateLimit, clientIp } from "../_utils/rateLimit.js";

// Magánszemélyeknek szóló, leegyszerűsített regisztráció - a viszonteladói
// `viszontelado` táblát/session-rendszert/dashboardot használja újra
// (fiok_tipus='maganszemely' megkülönböztetéssel), de nincs cégnév/adószám/cím
// mező, mert a fizetéshez (couple-pay.js, order-save-the-date.js) egyáltalán
// nem szükséges cégadat egy magánszemélynél - csak a Save the Date fizikai
// rendelésnél kér majd szállítási/számlázási címet, ugyanúgy, mint bárkitől.
// Egyelőre csak magyar nyelven érhető el (ld. hu/index.html CTA-ja).
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();
  const nev = (formData.get("nev") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const jelszo = (formData.get("jelszo") || "").toString();

  function backWithError(code) {
    return Response.redirect(`${new URL("/hu/sajat-oldal", request.url).href}?error=${code}`, 303);
  }

  const allowed = await checkRateLimit(
    env,
    `register:${clientIp(request)}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) return backWithError("rate_limited");

  if (!nev || !email) return backWithError("missing_fields");
  if (jelszo.length < 8) return backWithError("weak_password");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return backWithError("invalid_email");

  const existing = await env.DB.prepare("SELECT id FROM viszontelado WHERE email = ?").bind(email).first();
  if (existing) return backWithError("email_exists");

  const jelszoHash = await hashPassword(jelszo);
  const insert = await env.DB.prepare(
    "INSERT INTO viszontelado (ceg_nev, email, jelszo_hash, orszag, nyelv, fiok_tipus) VALUES (?, ?, ?, 'HU', 'hu', 'maganszemely')"
  )
    .bind(nev, email, jelszoHash)
    .run();

  const viszonteladoId = insert.meta.last_row_id;
  const token = newSessionToken();
  const lejar = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, viszontelado_id, lejar) VALUES (?, ?, ?)")
    .bind(token, viszonteladoId, lejar)
    .run();

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/sajat/dashboard", request.url).href,
      "Set-Cookie": sessionCookie(token, SESSION_MAX_AGE),
    },
  });
}
