// Meta (Facebook) Conversions API - szerver-oldali eseményküldés a Meta Pixel
// mellé. A böngésző-oldali Pixel önmagában (iOS/ITP, hirdetésblokkolók,
// süti-elutasítás miatt) túl sok konverziót veszít el, a Pixel + CAPI páros a
// jelenlegi ajánlott megoldás. A böngésző-oldali Pixel alapkód (PageView) az
// assets/cookie-consent.js fájlban van.
//
// HOZZÁJÁRULÁS: ezt a függvényt CSAK akkor szabad meghívni, ha a felhasználó
// marketing-hozzájárulást adott (ld. functions/_utils/attribution.js,
// viszontelado.marketing_hozzajarulas). A függvény maga nem ellenőrzi.
//
// Szándékosan NINCS kliens-oldali egyedi esemény ugyanezekhez (nincs dedup,
// event_id-egyeztetés): a regisztráció/vásárlás eseményeket KIZÁRÓLAG a szerver
// küldi, a kliens Pixel csak PageView-t.
//
// A hozzáférési token a Cloudflare Pages "META_CAPI_ACCESS_TOKEN" secret-jében
// van (nem a kódban, nem git-ben) - ha hiányzik, a küldés kihagyva, nem dob hibát.
const META_PIXEL_ID = "1069938152514040";
const META_GRAPH_VERSION = "v21.0";

const CALLING_CODES = { HU: "36", DE: "49", AT: "43", CH: "41" };

async function sha256Hash(value) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Meta elvárása: csak számjegyek, országhívóval, vezető 0/+ nélkül. Nemzeti
// formátumnál ("06 30..." / "0151...") az ország hívószámát a fiók országából
// pótoljuk; ha ez nem ismert, inkább kihagyjuk, mint rossz értéket küldeni.
function normalizePhone(phone, country) {
  if (!phone) return null;
  const raw = phone.trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  const code = CALLING_CODES[country];
  if (!code) return null;
  if (country === "HU" && digits.startsWith("06")) return code + digits.slice(2);
  if (digits.startsWith("0")) return code + digits.slice(1);
  return digits.startsWith(code) ? digits : code + digits;
}

function randomEventId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// eventId: az ÜZLETI esemény determinisztikus azonosítója (pl. purchase_<rendelés-id>);
// ha nincs megadva, véletlen UUID (dedup nem lehetséges).
// user: { email, phone, country, firstName, lastName, externalId,
//         fbp, fbc, clientIp, clientUserAgent }
// A személyes adatokat SHA-256-tal hash-eljük (Meta követelménye), az fbp/fbc,
// IP és User-Agent a specifikáció szerint NEM hash-elt.
export async function sendMetaCapiEvent(env, { eventName, eventId, eventSourceUrl, customData, user }) {
  if (!env.META_CAPI_ACCESS_TOKEN) {
    console.error("sendMetaCapiEvent: META_CAPI_ACCESS_TOKEN nincs beállítva, küldés kihagyva.");
    return;
  }
  try {
    const u = user || {};
    const userData = {};
    if (u.email) userData.em = [await sha256Hash(u.email)];
    const phone = normalizePhone(u.phone, u.country);
    if (phone) userData.ph = [await sha256Hash(phone)];
    if (u.firstName) userData.fn = [await sha256Hash(u.firstName)];
    if (u.lastName) userData.ln = [await sha256Hash(u.lastName)];
    if (u.externalId) userData.external_id = [await sha256Hash(String(u.externalId))];
    if (u.fbp) userData.fbp = u.fbp;
    if (u.fbc) userData.fbc = u.fbc;
    if (u.clientIp) userData.client_ip_address = u.clientIp;
    if (u.clientUserAgent) userData.client_user_agent = u.clientUserAgent;

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId || randomEventId(),
          event_source_url: eventSourceUrl,
          action_source: "website",
          user_data: userData,
          custom_data: customData || undefined,
        },
      ],
    };

    // Teszteléshez: ha a META_CAPI_TEST_EVENT_CODE be van állítva (Events Manager ->
    // Test Events), az esemény a Test Events fülön jelenik meg. ÉLES üzemben NE
    // legyen beállítva.
    if (env.META_CAPI_TEST_EVENT_CODE) payload.test_event_code = env.META_CAPI_TEST_EVENT_CODE;

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_ACCESS_TOKEN)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`sendMetaCapiEvent: Meta API hiba ${response.status} - ${body}`);
    } else if (env.META_CAPI_TEST_EVENT_CODE) {
      // Csak teszt-módban: a Meta válasza (events_received, figyelmeztetések).
      console.log(`sendMetaCapiEvent [TESZT] ${eventName}: ${await response.text()}`);
    }
  } catch (e) {
    console.error(`sendMetaCapiEvent: küldés sikertelen (${eventName}): ${e.message}`);
  }
}
