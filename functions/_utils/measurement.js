import { sendMetaCapiEvent } from "./metaCapi.js";
import { parseCookies } from "./auth.js";
import { clientIp } from "./rateLimit.js";

// Saját (first-party) eseménynapló + Meta-továbbítás. A napló az ÜZLETI események
// forrása (measurement_events): minden esemény bekerül, hozzájárulástól
// függetlenül, de KIZÁRÓLAG üzleti mezőkkel (nincs benne fbp/fbc/IP/User-Agent).
// A Metának csak marketing-hozzájárulással és nem admin-megtekintésből megy
// esemény; hogy mi történt, a meta_statusz oszlop mutatja:
//   fuggoben | elkuldve | hiba | nincs_hozzajarulas | admin_nezet | nincs_meta_esemeny
// Az event_id UNIQUE: ugyanaz az üzleti esemény kétszer nem rögzül és nem megy ki.
// A függvény SOSEM dob hibát, hogy a mérés ne törhesse meg a regisztrációt/fizetést.

// A kérésből a böngésző FRISS adata: az _fbp/_fbc sütik first-party sütik, így a
// szerver minden kérésnél megkapja őket, kliens-oldali szkript nélkül.
export function browserContext(request) {
  const cookies = parseCookies(request);
  const ip = clientIp(request);
  return {
    fbp: cookies._fbp || "",
    fbc: cookies._fbc || "",
    clientIp: ip && ip !== "unknown" ? ip : "",
    clientUserAgent: request.headers.get("user-agent") || "",
  };
}

// A Metának küldött user_data forrásai: az aktuális kérés (friss) elsőbbséget élvez,
// a regisztrációkor mentett attribúció a tartalék.
export function buildMetaUser(account, storedAttribution, context) {
  const c = context || {};
  const a = storedAttribution || {};
  return {
    email: account.email,
    phone: account.telefon,
    country: account.orszag,
    firstName: account.keresztnev,
    lastName: account.vezeteknev,
    externalId: account.id,
    fbp: c.fbp || a.fbp,
    fbc: c.fbc || a.fbc,
    clientIp: c.clientIp || a.client_ip,
    clientUserAgent: c.clientUserAgent || a.client_user_agent,
  };
}

export function accountType(fiokTipus) {
  return fiokTipus === "maganszemely" ? "individual" : "reseller";
}

export async function recordEvent(env, ev) {
  const skipReason = !ev.metaEventName
    ? "nincs_meta_esemeny"
    : ev.impersonated
      ? "admin_nezet"
      : !ev.consent
        ? "nincs_hozzajarulas"
        : null;

  let logged = false;
  try {
    const insert = await env.DB.prepare(
      `INSERT OR IGNORE INTO measurement_events
         (event_id, event_name, meta_event_name, viszontelado_id, par_id, rendeles_id, ertek, penznem, adat, meta_statusz)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        ev.eventId,
        ev.name,
        ev.metaEventName || null,
        ev.viszonteladoId || null,
        ev.parId || null,
        ev.rendelesId || null,
        ev.value ?? null,
        ev.currency || null,
        ev.data ? JSON.stringify(ev.data) : null,
        skipReason || "fuggoben"
      )
      .run();
    if (!insert.meta.changes) return { duplicate: true };
    logged = true;
  } catch (e) {
    // A napló hibája nem akadályozza a küldést (a mérés ne függjön a naplótól).
    console.error(`recordEvent: naplózás sikertelen (${ev.eventId}): ${e.message}`);
  }

  if (skipReason) return { status: skipReason };

  const result = await sendMetaCapiEvent(env, {
    eventName: ev.metaEventName,
    eventId: ev.eventId,
    eventSourceUrl: ev.eventSourceUrl,
    customData: ev.customData,
    user: ev.user,
  });

  if (logged) {
    try {
      await env.DB.prepare(
        "UPDATE measurement_events SET meta_statusz = ?, meta_kiserletek = meta_kiserletek + 1, meta_utolso_kiserlet = datetime('now'), meta_valasz = ? WHERE event_id = ?"
      )
        .bind(result.status, result.response, ev.eventId)
        .run();
    } catch (e) {
      console.error(`recordEvent: állapot-frissítés sikertelen (${ev.eventId}): ${e.message}`);
    }
  }
  return result;
}
