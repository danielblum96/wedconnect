import { sendEmail } from "./mailer.js";
import { paymentDeadlineMs, restoreDeadlineMs, PAYMENT_DEADLINE_HOURS, RESTORE_WINDOW_DAYS, AUTO_CLEANUP_ENABLED } from "./paymentFulfillment.js";
import { purgePage } from "./pageLifecycle.js";
import { recordEvent } from "./measurement.js";
import { getPricing, formatPrice } from "./i18n.js";
import { escapeHtml } from "./html.js";

// Emlékeztető emailek + lejárt oldalak takarítása. Az ütemezett Worker (worker/)
// 15 percenként meghívja a POST /api/cron-reminders végpontot, ami ezt futtatja.
//
// Az oldal életkora a parok.letrehozva-tól számít (a 24 órás fizetési határidő):
//   16-22 óra  -> "még 8 óra" emlékeztető
//   22-24 óra  -> "még 2 óra" emlékeztető
//   24 óra - 7 nap -> "lejárt, visszaállítható" értesítő (az oldal a vendégeknek
//                     már nem elérhető, de az adatai megvannak)
//   7 nap után -> "véglegesen törölve" értesítő + a tényleges törlés
// Emailt CSAK magyar magánszemély fiók kap (a user döntése, 2026-09-19); a
// takarítás minden fióktípusra érvényes. Az emlékeztető szolgáltatási értesítés
// (a user szerint), ezért tájékoztató hangú, akció nélkül.

const HOUR = 3600000;
const SITE = "https://wedconnect.eu";
const MAX_ATTEMPTS = 3;
const MAX_ACTIONS_PER_RUN = 8; // a Workers alrequest-korlátja miatt kicsi, a többi a következő futásra marad
const IN_PROGRESS_MS = 30 * 60000;

const WINDOWS = [
  { tipus: "emlekezteto_8h", from: 16, to: 22 },
  { tipus: "emlekezteto_2h", from: 22, to: PAYMENT_DEADLINE_HOURS },
  { tipus: "lejart", from: PAYMENT_DEADLINE_HOURS, to: PAYMENT_DEADLINE_HOURS + RESTORE_WINDOW_DAYS * 24 },
];

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseUtc(s) {
  return new Date(`${String(s).replace(" ", "T")}Z`).getTime();
}

function fmt(ms) {
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function buildEmail(tipus, p, token) {
  const name = p.keresztnev ? escapeHtml(p.keresztnev) : "Esküvői Pár";
  const par = escapeHtml(p.par_neve || "");
  const price = formatPrice(getPricing("hu", "maganszemely").pagePrice, "hu");
  const deadline = fmt(paymentDeadlineMs(p));
  const restore = fmt(restoreDeadlineMs(p));
  const ctaUrl = `${SITE}/e/${token}`;

  const content = {
    emlekezteto_8h: {
      subject: "Még 8 óra: az esküvői oldalatok fizetési határideje",
      paragraphs: [
        `Az esküvői oldalatok (<strong>${par}</strong>) fizetési határideje <strong>${deadline}</strong>, vagyis nagyjából 8 óra múlva jár le. Addig az oldal él, és elérhető a vendégeitek számára.`,
        `A határidőig kifizetheted az oldalt (${price}), vagy leadhatsz egy legalább 50 darabos Save the Date rendelést, ekkor az oldal díja elmarad.`,
        `Ha ez nem történik meg, az oldal a vendégeknek elérhetetlenné válik, de az adataitokat még <strong>${restore}</strong>-ig megőrizzük, és addig fizetéssel visszaállíthatod.`,
      ],
      cta: "Az oldal rendezése",
    },
    emlekezteto_2h: {
      subject: "Már csak 2 óra: az esküvői oldalatok hamarosan lejár",
      paragraphs: [
        `Az esküvői oldalatok (<strong>${par}</strong>) fizetési határideje <strong>${deadline}</strong>, ez nagyjából 2 óra múlva van.`,
        `Kifizetheted az oldalt (${price}), vagy leadhatsz egy legalább 50 darabos Save the Date rendelést, ekkor az oldal díja elmarad.`,
        `Ha a határidőig nem rendeződik, az oldal a vendégeknek elérhetetlenné válik, de <strong>${restore}</strong>-ig még visszaállíthatod fizetéssel.`,
      ],
      cta: "Az oldal rendezése",
    },
    lejart: {
      subject: "Az esküvői oldalatok lejárt – 7 napig visszaállíthatod",
      paragraphs: [
        `Az esküvői oldalatok (<strong>${par}</strong>) fizetési határideje lejárt, ezért az oldal jelenleg nem elérhető a vendégeitek számára.`,
        `Az adataitokat (képek, program, üzenet) még nem töröltük. <strong>${restore}</strong>-ig visszaállíthatod az oldalt: kifizetéssel (${price}) vagy egy legalább 50 darabos Save the Date rendeléssel. Ezután az oldalt véglegesen töröljük.`,
      ],
      cta: "Az oldal visszaállítása",
    },
    torolve: {
      subject: "Az esküvői oldalatok véglegesen törölve lett",
      paragraphs: [
        `Az esküvői oldalatok (<strong>${par}</strong>) visszaállítási ideje lejárt, ezért az oldalt és a hozzá tartozó adatokat (képek, program, üzenet) véglegesen töröltük.`,
        `Ha később mégis szeretnétek esküvői oldalt, bármikor készíthettek egy újat.`,
      ],
      cta: "Új oldal készítése",
    },
  }[tipus];

  const unsubscribeUrl = `${SITE}/e/${token}/leiratkozas`;
  const paragraphsHtml = content.paragraphs
    .map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2b2620;">${t}</p>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="hu"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px 30px;">
        <tr><td>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#2b2620;margin-bottom:22px;">Wed<span style="color:#b48b56;">Connect</span></div>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2b2620;">Kedves ${name}!</p>
          ${paragraphsHtml}
          <p style="margin:22px 0;"><a href="${ctaUrl}" style="display:inline-block;background:#b48b56;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 26px;border-radius:999px;">${content.cta}</a></p>
          <p style="margin:0;font-size:12px;line-height:1.5;color:#7a7266;border-top:1px solid #eee6d6;padding-top:14px;">Ezt a szolgáltatási értesítést azért kapod, mert esküvői oldalt hoztál létre a WedConnecten, és az oldal fizetési határidejéről tájékoztatunk. <a href="${unsubscribeUrl}" style="color:#7a7266;">Nem kérek több emlékeztetőt</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject: content.subject, html, unsubscribeUrl };
}

// Egy (oldal, típus) email kiküldése, naplózva és idempotensen. Visszatérés:
// "elkuldve" | "mar_elkuldve" | "hiba" (a következő futáskor újrapróbálja) |
// "vegleges_hiba" (a próbálkozások elfogytak) | "folyamatban".
async function deliver(env, p, tipus, opts) {
  const now = Date.now();
  const token = randomToken();
  const ins = await env.DB.prepare(
    "INSERT OR IGNORE INTO email_kuldesek (par_id, viszontelado_id, tipus, token) VALUES (?, ?, ?, ?)"
  )
    .bind(p.id, p.viszontelado_id, tipus, token)
    .run();

  let rowId;
  let rowToken;
  let attempts = 0;
  if (ins.meta.changes) {
    rowId = ins.meta.last_row_id;
    rowToken = token;
  } else {
    const ex = await env.DB.prepare(
      "SELECT id, token, statusz, kiserletek, utolso_kiserlet FROM email_kuldesek WHERE par_id = ? AND tipus = ?"
    )
      .bind(p.id, tipus)
      .first();
    if (!ex) return "hiba";
    if (ex.statusz === "elkuldve") return "mar_elkuldve";
    if (ex.kiserletek >= MAX_ATTEMPTS) return "vegleges_hiba";
    if (ex.statusz === "fuggoben" && ex.utolso_kiserlet && now - parseUtc(ex.utolso_kiserlet) < IN_PROGRESS_MS) {
      return "folyamatban";
    }
    rowId = ex.id;
    rowToken = ex.token;
    attempts = ex.kiserletek;
  }

  attempts += 1;
  await env.DB.prepare("UPDATE email_kuldesek SET kiserletek = ?, utolso_kiserlet = datetime('now') WHERE id = ?")
    .bind(attempts, rowId)
    .run();

  try {
    const mail = buildEmail(tipus, p, rowToken);
    await sendEmail(env, {
      to: opts.tesztCimzett || p.email,
      subject: (opts.tesztCimzett ? "[TESZT] " : "") + mail.subject,
      html: mail.html,
      headers: {
        "List-Unsubscribe": `<${mail.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    await env.DB.prepare("UPDATE email_kuldesek SET statusz = 'elkuldve', kuldve = datetime('now'), hiba = NULL WHERE id = ?")
      .bind(rowId)
      .run();
    await recordEvent(env, {
      eventId: `email_${rowId}`,
      name: "reminder_email_sent",
      viszonteladoId: p.viszontelado_id,
      parId: p.id,
      data: { tipus },
    });
    return "elkuldve";
  } catch (e) {
    await env.DB.prepare("UPDATE email_kuldesek SET statusz = 'hiba', hiba = ? WHERE id = ?")
      .bind(String(e.message).slice(0, 300), rowId)
      .run();
    console.error(`reminders: email küldése sikertelen (par=${p.id}, ${tipus}): ${e.message}`);
    return attempts >= MAX_ATTEMPTS ? "vegleges_hiba" : "hiba";
  }
}

// opts: { tesztCimzett, csakParId, maxActions } - a teszt-cím felülírja a címzettet
// (csak a CRON_SECRET-tel hívható végponton át érhető el).
export async function runReminderJob(env, opts = {}) {
  // Szüneteltetve (ld. AUTO_CLEANUP_ENABLED): sem email, sem törlés.
  if (!AUTO_CLEANUP_ENABLED) return { szunetel: true, elkuldve: 0, hiba: 0, torolve: 0, kihagyva: 0 };
  const now = Date.now();
  const params = [];
  let where = "p.rendeles_id IS NULL AND p.viszontelado_id IS NOT NULL";
  if (opts.csakParId) {
    where += " AND p.id = ?";
    params.push(opts.csakParId);
  }
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.slug, p.par_neve, p.letrehozva, p.viszontelado_id, p.rendeles_id,
            v.email, v.keresztnev, v.fiok_tipus, v.nyelv, v.emlekezteto_tiltva
     FROM parok p JOIN viszontelado v ON v.id = p.viszontelado_id
     WHERE ${where} ORDER BY p.letrehozva LIMIT 300`
  )
    .bind(...params)
    .all();

  const summary = { elkuldve: 0, hiba: 0, torolve: 0, kihagyva: 0 };
  const maxActions = opts.maxActions || MAX_ACTIONS_PER_RUN;
  let actions = 0;

  for (const p of results || []) {
    if (actions >= maxActions) break;
    const ageH = (now - (paymentDeadlineMs(p) - PAYMENT_DEADLINE_HOURS * HOUR)) / HOUR;
    if (ageH < WINDOWS[0].from) continue;
    const emailEligible = p.fiok_tipus === "maganszemely" && p.nyelv === "hu" && p.email && !p.emlekezteto_tiltva;

    if (ageH >= PAYMENT_DEADLINE_HOURS + RESTORE_WINDOW_DAYS * 24) {
      // Véglegesen törlendő: előbb a "törölve" értesítő, csak utána a törlés.
      if (emailEligible) {
        const r = await deliver(env, p, "torolve", opts);
        actions++;
        if (r === "hiba" || r === "folyamatban") {
          summary.hiba++;
          continue; // a következő futáskor újra, az oldal addig megmarad
        }
        if (r === "elkuldve") summary.elkuldve++;
      }
      await purgePage(env, p);
      await recordEvent(env, {
        eventId: `page_purged_${p.id}`,
        name: "wedding_page_purged",
        viszonteladoId: p.viszontelado_id,
        parId: p.id,
        data: {},
      });
      summary.torolve++;
      actions++;
      continue;
    }

    if (!emailEligible) {
      summary.kihagyva++;
      continue;
    }
    const w = WINDOWS.find((x) => ageH >= x.from && ageH < x.to);
    if (!w) continue;
    const r = await deliver(env, p, w.tipus, opts);
    if (r === "elkuldve") {
      summary.elkuldve++;
      actions++;
    } else if (r === "hiba") {
      summary.hiba++;
      actions++;
    }
  }
  return summary;
}
