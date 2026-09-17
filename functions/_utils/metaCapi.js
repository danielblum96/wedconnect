// Meta (Facebook) Conversions API - szerver-oldali eseményküldés a Meta Pixel
// mellé. 2025-re a böngésző-oldali Pixel önmagában (iOS/ITP, hirdetésblokkolók,
// süti-elutasítás miatt) túl sok konverziót veszít el ahhoz, hogy a Meta
// hirdetési algoritmusa jól tudjon optimalizálni - a Pixel + CAPI páros a
// jelenlegi ajánlott megoldás. Ez a fájl KIZÁRÓLAG a szerver-oldali CAPI-t
// adja; a böngésző-oldali Pixel alapkód (PageView) az assets/cookie-consent.js
// fájlban van, a süti-hozzájáruláshoz kötve.
//
// Szándékosan NINCS kliens-oldali egyedi esemény (pl. "Lead" a regisztrációs
// gombra kattintva) ehhez a CAPI-hoz társítva - ez elkerüli a duplikáció
// (dedup, event_id-egyeztetés) bonyolultságát: a regisztráció/vásárlás
// eseményeket KIZÁRÓLAG a szerver küldi, a kliens Pixel csak PageView-t.
//
// A hozzáférési token a Cloudflare Pages "META_CAPI_ACCESS_TOKEN" secret-jében
// van (nem a kódban, nem git-ben) - ha hiányzik, a küldés csendben kihagyva
// (nem dob hibát, hogy ez sose törje meg a regisztráció/fizetés folyamatát).
import { clientIp } from "./rateLimit.js";

const META_PIXEL_ID = "1069938152514040";
const META_GRAPH_VERSION = "v21.0";

async function sha256Hash(value) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// event_id: MINDIG adjunk egyet (akár csak egy random string), hogy Meta
// egyértelműen tudja, ez az esemény micsoda - jövőbeli, kliens-oldali
// esemény-kiegészítésnél (ha lesz) ez lesz a dedup-kulcs.
function randomEventId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// eventName: Meta standard esemény neve (pl. "CompleteRegistration", "Purchase").
// eventSourceUrl: a felhasználó által látott oldal URL-je (attribúcióhoz).
// email: nyers (nem hashelt) email - a függvény hasheli SHA-256-tal, ahogy
// Meta megköveteli, sosem küldünk nyers PII-t.
// request: az eredeti Request objektum, ha elérhető - ebből nyerjük ki a
// kliens IP-t/User-Agent-et a jobb egyezés-minőséghez (nem minden hívási
// helyen érhető el, pl. Stripe webhook esetén NEM a user böngészőjéből jön a
// kérés, ilyenkor egyszerűen kihagyjuk).
// customData: pl. { value, currency } vásárlásnál.
export async function sendMetaCapiEvent(env, { eventName, email, eventSourceUrl, request, customData }) {
  if (!env.META_CAPI_ACCESS_TOKEN) {
    console.error("sendMetaCapiEvent: META_CAPI_ACCESS_TOKEN nincs beállítva, küldés kihagyva.");
    return;
  }
  try {
    const userData = {};
    if (email) userData.em = [await sha256Hash(email)];
    if (request) {
      const ip = clientIp(request);
      const ua = request.headers.get("user-agent");
      if (ip && ip !== "unknown") userData.client_ip_address = ip;
      if (ua) userData.client_user_agent = ua;
    }

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: randomEventId(),
          event_source_url: eventSourceUrl,
          action_source: "website",
          user_data: userData,
          custom_data: customData || undefined,
        },
      ],
    };

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_ACCESS_TOKEN)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`sendMetaCapiEvent: Meta API hiba ${response.status} - ${body}`);
    }
  } catch (e) {
    // Csendes hiba - egy analitikai esemény sikertelen küldése sosem törheti
    // meg a regisztráció/fizetés tényleges folyamatát.
    console.error(`sendMetaCapiEvent: küldés sikertelen (${eventName}): ${e.message}`);
  }
}
