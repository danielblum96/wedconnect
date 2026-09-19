import { hashPassword, newSessionToken, sessionCookie } from "../_utils/auth.js";
import { checkRateLimit, clientIp } from "../_utils/rateLimit.js";
import { recordEvent } from "../_utils/measurement.js";
import { readAttribution } from "../_utils/attribution.js";

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
  const { request, env, waitUntil } = context;
  const formData = await request.formData();
  const vezeteknev = (formData.get("vezeteknev") || "").toString().trim();
  const keresztnev = (formData.get("keresztnev") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const telefon = (formData.get("telefon") || "").toString().trim();
  const jelszo = (formData.get("jelszo") || "").toString();
  const adatkezeles = formData.get("adatkezeles");
  const { marketingConsent, attribution } = readAttribution(formData, request);

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

  if (!vezeteknev || !keresztnev || !email || !telefon) return backWithError("missing_fields");
  if (!/^[0-9+()\s-]{7,20}$/.test(telefon)) return backWithError("invalid_phone");
  if (jelszo.length < 8) return backWithError("weak_password");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return backWithError("invalid_email");
  if (!adatkezeles) return backWithError("privacy_required");

  const existing = await env.DB.prepare("SELECT id FROM viszontelado WHERE email = ?").bind(email).first();
  if (existing) return backWithError("email_exists");

  const jelszoHash = await hashPassword(jelszo);
  const insert = await env.DB.prepare(
    "INSERT INTO viszontelado (ceg_nev, vezeteknev, keresztnev, email, telefon, jelszo_hash, orszag, nyelv, fiok_tipus, adatkezeles_elfogadva, marketing_hozzajarulas, attribucio) VALUES (?, ?, ?, ?, ?, ?, 'HU', 'hu', 'maganszemely', datetime('now'), ?, ?)"
  )
    .bind(
      `${vezeteknev} ${keresztnev}`,
      vezeteknev,
      keresztnev,
      email,
      telefon,
      jelszoHash,
      marketingConsent ? 1 : 0,
      attribution ? JSON.stringify(attribution) : null
    )
    .run();

  const viszonteladoId = insert.meta.last_row_id;
  const token = newSessionToken();
  const lejar = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, viszontelado_id, lejar) VALUES (?, ?, ?)")
    .bind(token, viszonteladoId, lejar)
    .run();

  // Saját eseménynapló + Meta Conversions API (utóbbi CSAK marketing-hozzájárulással,
  // ld. _utils/measurement.js). A válasz küldését nem várja meg (waitUntil).
  const a = attribution || {};
  waitUntil(
    recordEvent(env, {
      eventId: `registration_${viszonteladoId}`,
      name: "account_registered",
      metaEventName: "CompleteRegistration",
      viszonteladoId,
      data: { account_type: "individual", country: "HU" },
      consent: marketingConsent,
      eventSourceUrl: new URL("/hu/sajat-oldal", request.url).href,
      customData: { account_type: "individual", country: "HU" },
      user: {
        email,
        phone: telefon,
        country: "HU",
        firstName: keresztnev,
        lastName: vezeteknev,
        externalId: viszonteladoId,
        fbp: a.fbp,
        fbc: a.fbc,
        clientIp: a.client_ip,
        clientUserAgent: a.client_user_agent,
      },
    })
  );

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/sajat/dashboard", request.url).href,
      "Set-Cookie": sessionCookie(token, SESSION_MAX_AGE),
    },
  });
}
