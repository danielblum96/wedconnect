import { hashPassword, newSessionToken, sessionCookie } from "../_utils/auth.js";
import { countryToLang } from "../_utils/i18n.js";
import { checkRateLimit, clientIp } from "../_utils/rateLimit.js";
import { sendMetaCapiEvent } from "../_utils/metaCapi.js";
import { readAttribution } from "../_utils/attribution.js";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
  const formData = await request.formData();
  const cegNev = (formData.get("ceg_nev") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const telefon = (formData.get("telefon") || "").toString().trim();
  const jelszo = (formData.get("jelszo") || "").toString();
  const adatkezeles = formData.get("adatkezeles");
  const { marketingConsent, attribution } = readAttribution(formData, request);
  const orszag = (formData.get("orszag") || "").toString().trim();
  const adoszam = (formData.get("adoszam") || "").toString().trim();
  const szamlazasiUtca = (formData.get("szamlazasi_utca") || "").toString().trim();
  const szamlazasiIrsz = (formData.get("szamlazasi_irsz") || "").toString().trim();
  const szamlazasiVaros = (formData.get("szamlazasi_varos") || "").toString().trim();
  const szamlazasiOrszag = (formData.get("szamlazasi_orszag") || "").toString().trim();
  const szallitasAzonos = formData.get("szallitas_azonos") ? 1 : 0;
  const alapSzallitasiUtca = szallitasAzonos ? "" : (formData.get("alap_szallitasi_utca") || "").toString().trim();
  const alapSzallitasiIrsz = szallitasAzonos ? "" : (formData.get("alap_szallitasi_irsz") || "").toString().trim();
  const alapSzallitasiVaros = szallitasAzonos ? "" : (formData.get("alap_szallitasi_varos") || "").toString().trim();
  const alapSzallitasiOrszag = szallitasAzonos ? "" : (formData.get("alap_szallitasi_orszag") || "").toString().trim();
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

  if (!cegNev || !email || !telefon || !orszag) return backWithError("missing_fields");
  if (!/^[0-9+()\s-]{7,20}$/.test(telefon)) return backWithError("invalid_phone");
  if (jelszo.length < 8) return backWithError("weak_password");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return backWithError("invalid_email");
  if (!adatkezeles) return backWithError("privacy_required");

  const existing = await env.DB.prepare("SELECT id FROM viszontelado WHERE email = ?").bind(email).first();
  if (existing) return backWithError("email_exists");

  const jelszoHash = await hashPassword(jelszo);
  const nyelv = countryToLang(orszag);
  const insert = await env.DB.prepare(
    `INSERT INTO viszontelado (
      ceg_nev, email, telefon, jelszo_hash, orszag, nyelv,
      adoszam, szamlazasi_utca, szamlazasi_irsz, szamlazasi_varos, szamlazasi_orszag,
      szallitas_azonos, alap_szallitasi_utca, alap_szallitasi_irsz, alap_szallitasi_varos, alap_szallitasi_orszag,
      adatkezeles_elfogadva, marketing_hozzajarulas, attribucio
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)`
  )
    .bind(
      cegNev,
      email,
      telefon,
      jelszoHash,
      orszag,
      nyelv,
      adoszam || null,
      szamlazasiUtca || null,
      szamlazasiIrsz || null,
      szamlazasiVaros || null,
      szamlazasiOrszag || null,
      szallitasAzonos,
      alapSzallitasiUtca || null,
      alapSzallitasiIrsz || null,
      alapSzallitasiVaros || null,
      alapSzallitasiOrszag || null,
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

  // Meta Conversions API - CSAK marketing-hozzájárulással, a válasz küldését
  // nem várva (waitUntil).
  if (marketingConsent) {
    waitUntil(
      sendMetaCapiEvent(env, {
        eventName: "CompleteRegistration",
        eventId: `registration_${viszonteladoId}`,
        eventSourceUrl: new URL(redirectBase, request.url).href,
        customData: { account_type: "reseller", country: orszag },
        user: {
          email,
          phone: telefon,
          country: orszag,
          externalId: viszonteladoId,
          fbp: attribution.fbp,
          fbc: attribution.fbc,
          clientIp: attribution.client_ip,
          clientUserAgent: attribution.client_user_agent,
        },
      })
    );
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/partner/dashboard", request.url).href,
      "Set-Cookie": sessionCookie(token, SESSION_MAX_AGE),
    },
  });
}
