// Közös, idempotens "fizetés beérkezett" logika - ezt hívja meg MIND a Stripe
// webhook (functions/api/stripe-webhook.js), MIND a dashboard success_url
// visszaellenőrzése (functions/partner/dashboard.js), mivel a kettő közül
// bármelyik érkezhet előbb, és mindkettőnek biztonságosnak kell lennie akkor
// is, ha a másik már lefutott.
//
// Üzleti szabály (a user döntése alapján, 2026-08-27): egy új esküvői oldal
// AZONNAL, fizetés nélkül élesedik (couple-create.js), de 24 órán belül vagy
// ki kell fizetni (functions/api/couple-pay.js), VAGY le kell adni egy 50+ db-os
// Save the Date rendelést (order-save-the-date.js) - ez utóbbi esetén az oldal
// díja elengedésre kerül ("ajándékba jár"). A `parok.rendeles_id` mező jelzi,
// hogy az oldal RENDEZETT-e (bármelyik úton) - amíg NULL, a 24 órás határidő
// fut, és a dashboard/[slug].js lejáratkor törli/elrejti az oldalt.
import { escapeHtml } from "./html.js";
import { sendEmail } from "./mailer.js";
import { generateSVG } from "./saveTheDate.js";
import { countryLabel } from "./countries.js";
import { getPricing, formatPrice } from "./i18n.js";

export const PAYMENT_DEADLINE_HOURS = 24;

function createdAtMs(p) {
  return new Date(`${p.letrehozva.replace(" ", "T")}Z`).getTime();
}

// Egy pár csak akkor esik a 24 órás fizetési határidő alá, ha VAN
// viszonteladója (a régi, kézzel épített demo-rekordoknál, pl. "Lili & Márk",
// nincs viszontelado_id - ezek sosem mentek át a fizetős flow-n, nem tartoznak
// ide) ÉS még nincs rendezve (rendeles_id NULL).
export function isExpiredUnpaid(p, now) {
  return !!p.viszontelado_id && !p.rendeles_id && now - createdAtMs(p) > PAYMENT_DEADLINE_HOURS * 3600000;
}

export function hoursLeft(p, now) {
  const remainingMs = PAYMENT_DEADLINE_HOURS * 3600000 - (now - createdAtMs(p));
  return Math.max(1, Math.ceil(remainingMs / 3600000));
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function formatAddressHtml({ utca, irsz, varos, orszag }) {
  return `${escapeHtml(utca)}<br>${escapeHtml(irsz)} ${escapeHtml(varos)}<br>${escapeHtml(countryLabel(orszag, "hu"))}`;
}

// A megadott rendelés-id-jű `rendelesek` sort dolgozza fel - visszatér
// false-szal, ha nem található, vagy már korábban feldolgozásra került
// (idempotencia: sem a webhook, sem a success_url visszaellenőrzés nem
// futtathatja le kétszer a mellékhatásokat, pl. duplikált emailt).
export async function fulfillStripeOrder(env, rendelesId) {
  const rendeles = await env.DB.prepare(
    `SELECT id, viszontelado_id, csomag, mennyiseg, ar_osszesen, penznem, allapot, par_id,
            megjegyzes, adoszam, szamlazasi_utca, szamlazasi_irsz, szamlazasi_varos, szamlazasi_orszag,
            szallitasi_utca, szallitasi_irsz, szallitasi_varos, szallitasi_orszag
     FROM rendelesek WHERE id = ?`
  )
    .bind(rendelesId)
    .first();
  if (!rendeles || rendeles.allapot === "Fizetve") return false;

  await env.DB.prepare("UPDATE rendelesek SET allapot = 'Fizetve' WHERE id = ?").bind(rendelesId).run();

  // Bármelyik, párhoz kötött rendelés rendezi az oldal fizetési kötelezettségét -
  // vagy mert maga az oldal díja volt (mennyiseg=1, couple-pay.js), vagy mert
  // 50+ darabos Save the Date rendelés (ami az oldal díját elengedi). A jelenlegi
  // üzleti szabályok mellett köztes (2-49 db) rendelés párhoz kötve nem létezik.
  if (rendeles.par_id) {
    await env.DB.prepare("UPDATE parok SET rendeles_id = ? WHERE id = ? AND rendeles_id IS NULL")
      .bind(rendelesId, rendeles.par_id)
      .run();
  }

  if (!rendeles.par_id) return true; // önálló oldal-fizetés (couple-pay.js) - nincs email/SVG teendő

  try {
    const reseller = await env.DB.prepare("SELECT ceg_nev, email FROM viszontelado WHERE id = ?")
      .bind(rendeles.viszontelado_id)
      .first();
    const par = await env.DB.prepare("SELECT par_neve, nev1, nev2, eskuvo_datuma, slug, nyelv FROM parok WHERE id = ?")
      .bind(rendeles.par_id)
      .first();
    if (!reseller || !par) return true;

    const lang = par.nyelv || "hu";
    const pricing = getPricing(lang);
    const wantsStd = rendeles.mennyiseg >= 50;

    let stdBlock = "";
    let attachments = [];

    if (wantsStd) {
      const [year, month, day] = (par.eskuvo_datuma || "").split("-").map(Number);
      const nev1 = par.nev1 || (par.par_neve || "").split(" & ")[0] || "";
      const nev2 = par.nev2 || (par.par_neve || "").split(" & ")[1] || "";
      const svg = generateSVG(nev1, nev2, year, month, day, par.nyelv || "hu");
      const filename = `${par.slug}-save-the-date.svg`;
      attachments = [{ filename, content: utf8ToBase64(svg) }];
      const stdSubtotal = rendeles.mennyiseg * pricing.stdPrice;
      stdBlock = `
        <p><strong>Esküvői oldal:</strong> ingyenes (50+ db Save the Date rendelésnél)</p>
        <p><strong>Save the Date:</strong> ${rendeles.mennyiseg} db × ${formatPrice(pricing.stdPrice, lang)} = ${formatPrice(stdSubtotal, lang)}</p>
        <p><strong>Szállítási cím:</strong><br>${formatAddressHtml({
          utca: rendeles.szallitasi_utca,
          irsz: rendeles.szallitasi_irsz,
          varos: rendeles.szallitasi_varos,
          orszag: rendeles.szallitasi_orszag,
        })}</p>
        <p>A pontos, lézervágásra kész SVG-fájl csatolva.</p>
      `;
    } else {
      stdBlock = `<p><strong>Esküvői oldal (egyszeri):</strong> ${formatPrice(rendeles.ar_osszesen, lang)}</p>`;
    }

    const html = `
      <h2>Új rendelés kifizetve</h2>
      <p><strong>Viszonteladó:</strong> ${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</p>
      <p><strong>Pár:</strong> ${escapeHtml(par.par_neve)} · ${escapeHtml(par.eskuvo_datuma)}</p>
      ${stdBlock}
      <p><strong>Összesen (kifizetve Stripe-on keresztül):</strong> ${formatPrice(rendeles.ar_osszesen, lang)}</p>
      <p><strong>Számlázási cím:</strong><br>${formatAddressHtml({
        utca: rendeles.szamlazasi_utca,
        irsz: rendeles.szamlazasi_irsz,
        varos: rendeles.szamlazasi_varos,
        orszag: rendeles.szamlazasi_orszag,
      })}</p>
      ${rendeles.adoszam ? `<p><strong>Adószám:</strong> ${escapeHtml(rendeles.adoszam)}</p>` : ""}
      ${rendeles.megjegyzes ? `<p><strong>Megjegyzés:</strong><br>${escapeHtml(rendeles.megjegyzes).replace(/\n/g, "<br>")}</p>` : ""}
      <p><a href="https://wedconnect.eu/${escapeHtml(par.slug)}">A pár nyilvános oldala</a></p>
    `;

    await sendEmail(env, {
      to: env.ADMIN_EMAIL,
      subject: `Kifizetett rendelés (${formatPrice(rendeles.ar_osszesen, lang)}) – ${par.par_neve}`,
      html,
      attachments,
    });
  } catch (e) {
    console.error(`fulfillStripeOrder: email küldése sikertelen (rendeles_id=${rendelesId}): ${e.message}`);
  }

  return true;
}
