import { hashPassword, newSessionToken, sessionCookie } from "../_utils/auth.js";
import { countryToLang } from "../_utils/i18n.js";
import { checkRateLimit, clientIp } from "../_utils/rateLimit.js";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();
  const cegNev = (formData.get("ceg_nev") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const jelszo = (formData.get("jelszo") || "").toString();
  const orszag = (formData.get("orszag") || "").toString().trim();
  const szamlazasiCim = (formData.get("szamlazasi_cim") || "").toString().trim();
  const szallitasAzonos = formData.get("szallitas_azonos") ? 1 : 0;
  const alapSzallitasiCim = szallitasAzonos ? "" : (formData.get("alap_szallitasi_cim") || "").toString().trim();
  const redirectBase = (formData.get("redirect_back") || "/de/registrieren").toString();

  function backWithError(code) {
    return Response.redirect(`${new URL(redirectBase, request.url).href}?error=${code}`, 303);
  }

  const allowed = await checkRateLimit(
    env,
    `register:${clientIp(request)}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) return backWithError("rate_limited");

  if (!cegNev || !email || !orszag) return backWithError("missing_fields");
  if (jelszo.length < 8) return backWithError("weak_password");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return backWithError("invalid_email");

  const existing = await env.DB.prepare("SELECT id FROM viszontelado WHERE email = ?").bind(email).first();
  if (existing) return backWithError("email_exists");

  const jelszoHash = await hashPassword(jelszo);
  const nyelv = countryToLang(orszag);
  const insert = await env.DB.prepare(
    "INSERT INTO viszontelado (ceg_nev, email, jelszo_hash, orszag, nyelv, szamlazasi_cim, alap_szallitasi_cim, szallitas_azonos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(cegNev, email, jelszoHash, orszag, nyelv, szamlazasiCim || null, alapSzallitasiCim || null, szallitasAzonos)
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
      Location: new URL("/partner/dashboard", request.url).href,
      "Set-Cookie": sessionCookie(token, SESSION_MAX_AGE),
    },
  });
}
