import { clientIp } from "./rateLimit.js";

const ALLOWED_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "fbc",
  "fbp",
  "landing_url",
  "referrer",
];

// A regisztrációs űrlap "attribution" rejtett mezőjét (ld. assets/cookie-consent.js)
// olvassa ki. A kliens állítása a marketing-hozzájárulásról: csak akkor
// tárolunk attribúciós adatot / küldhetünk Meta-eseményt, ha ez true.
// Hozzájárulás nélkül SEMMILYEN attribúciót nem őrzünk meg (még az IP-t/UA-t sem).
export function readAttribution(formData, request) {
  let parsed = {};
  try {
    const raw = (formData.get("attribution") || "").toString();
    if (raw.length > 4000) return { marketingConsent: false, attribution: null };
    parsed = JSON.parse(raw);
  } catch (e) {
    return { marketingConsent: false, attribution: null };
  }
  if (!parsed || parsed.consent_marketing !== true) {
    return { marketingConsent: false, attribution: null };
  }
  const attribution = {};
  for (const key of ALLOWED_KEYS) {
    if (typeof parsed[key] === "string" && parsed[key]) attribution[key] = parsed[key].slice(0, 300);
  }
  const ip = clientIp(request);
  if (ip && ip !== "unknown") attribution.client_ip = ip;
  const ua = request.headers.get("user-agent");
  if (ua) attribution.client_user_agent = ua.slice(0, 500);
  return { marketingConsent: true, attribution };
}

export function parseStoredAttribution(json) {
  try {
    return json ? JSON.parse(json) : {};
  } catch (e) {
    return {};
  }
}
