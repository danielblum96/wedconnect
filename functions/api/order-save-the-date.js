import { getSessionReseller } from "../_utils/auth.js";
import { escapeHtml } from "../_utils/html.js";
import { sendEmail } from "../_utils/mailer.js";
import { generateSVG } from "../_utils/saveTheDate.js";
import { countryLabel } from "../_utils/countries.js";
import { getPricing, formatPrice } from "../_utils/i18n.js";

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function formatAddressHtml({ utca, irsz, varos, orszag }) {
  return `${escapeHtml(utca)}<br>${escapeHtml(irsz)} ${escapeHtml(varos)}<br>${escapeHtml(countryLabel(orszag, "hu"))}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  const mennyisegRaw = (formData.get("mennyiseg") || "").toString().trim();
  const mennyiseg = mennyisegRaw === "" ? 0 : parseInt(mennyisegRaw, 10);
  const megjegyzes = (formData.get("megjegyzes") || "").toString().trim();
  const adoszam = (formData.get("adoszam") || "").toString().trim();

  const billing = {
    utca: (formData.get("szamlazasi_utca") || "").toString().trim(),
    irsz: (formData.get("szamlazasi_irsz") || "").toString().trim(),
    varos: (formData.get("szamlazasi_varos") || "").toString().trim(),
    orszag: (formData.get("szamlazasi_orszag") || "").toString().trim(),
  };
  const shipping = {
    utca: (formData.get("szallitasi_utca") || "").toString().trim(),
    irsz: (formData.get("szallitasi_irsz") || "").toString().trim(),
    varos: (formData.get("szallitasi_varos") || "").toString().trim(),
    orszag: (formData.get("szallitasi_orszag") || "").toString().trim(),
  };
  const wantsStd = mennyiseg > 0;

  function backWithError(code) {
    return Response.redirect(`${new URL("/partner/dashboard", request.url).href}?stderror=${code}`, 303);
  }

  if (!parId || isNaN(mennyiseg) || mennyiseg < 0 || mennyiseg > 9999) return backWithError("invalid");
  if (wantsStd && mennyiseg < 50) return backWithError("min_quantity");
  if (!billing.utca || !billing.irsz || !billing.varos) return backWithError("missing_billing");
  if (wantsStd && (!shipping.utca || !shipping.irsz || !shipping.varos)) return backWithError("missing_address");

  const par = await env.DB.prepare(
    "SELECT id, par_neve, nev1, nev2, eskuvo_datuma, slug, nyelv FROM parok WHERE id = ? AND viszontelado_id = ?"
  )
    .bind(parId, reseller.id)
    .first();
  if (!par) return backWithError("invalid");

  const lang = reseller.nyelv || "de";
  const pricing = getPricing(lang);
  const PAGE_PRICE = pricing.pagePrice;
  const STD_PRICE = pricing.stdPrice;

  const stdSubtotal = mennyiseg * STD_PRICE;
  const pageFee = wantsStd ? 0 : PAGE_PRICE;
  const total = pageFee + stdSubtotal;
  const csomag = wantsStd ? "Save the Date naptár (Seite inklusive)" : "Hochzeitsseite (ohne Save the Date)";

  await env.DB.prepare(
    `INSERT INTO rendelesek (
      viszontelado_id, par_id, csomag, mennyiseg, ar_osszesen, penznem, megjegyzes,
      adoszam, szamlazasi_utca, szamlazasi_irsz, szamlazasi_varos, szamlazasi_orszag,
      szallitasi_utca, szallitasi_irsz, szallitasi_varos, szallitasi_orszag
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      reseller.id,
      par.id,
      csomag,
      wantsStd ? mennyiseg : 1,
      total,
      pricing.currency,
      megjegyzes || null,
      adoszam || null,
      billing.utca,
      billing.irsz,
      billing.varos,
      billing.orszag || null,
      wantsStd ? shipping.utca : null,
      wantsStd ? shipping.irsz : null,
      wantsStd ? shipping.varos : null,
      wantsStd ? shipping.orszag || null : null
    )
    .run();

  try {
    let stdBlock = "";
    let attachments = [];

    if (wantsStd) {
      const [year, month, day] = (par.eskuvo_datuma || "").split("-").map(Number);
      const nev1 = par.nev1 || (par.par_neve || "").split(" & ")[0] || "";
      const nev2 = par.nev2 || (par.par_neve || "").split(" & ")[1] || "";
      const svg = generateSVG(nev1, nev2, year, month, day, par.nyelv || "hu");
      const filename = `${par.slug}-save-the-date.svg`;
      attachments = [{ filename, content: utf8ToBase64(svg) }];
      stdBlock = `
        <p><strong>Esküvői oldal:</strong> ingyenes (50+ db Save the Date rendelésnél)</p>
        <p><strong>Save the Date:</strong> ${mennyiseg} db × ${formatPrice(STD_PRICE, lang)} = ${formatPrice(stdSubtotal, lang)}</p>
        <p><strong>Szállítási cím:</strong><br>${formatAddressHtml(shipping)}</p>
        <p>A pontos, lézervágásra kész SVG-fájl csatolva.</p>
      `;
    } else {
      stdBlock = `<p><strong>Esküvői oldal (egyszeri):</strong> ${formatPrice(PAGE_PRICE, lang)}</p>`;
    }

    const html = `
      <h2>Új rendelés</h2>
      <p><strong>Viszonteladó:</strong> ${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</p>
      <p><strong>Pár:</strong> ${escapeHtml(par.par_neve)} · ${escapeHtml(par.eskuvo_datuma)}</p>
      ${stdBlock}
      <p><strong>Összesen:</strong> ${formatPrice(total, lang)} (fizetés még nincs beszedve – Stripe folyamatban)</p>
      <p><strong>Számlázási cím:</strong><br>${formatAddressHtml(billing)}</p>
      ${adoszam ? `<p><strong>Adószám:</strong> ${escapeHtml(adoszam)}</p>` : ""}
      ${megjegyzes ? `<p><strong>Megjegyzés:</strong><br>${escapeHtml(megjegyzes).replace(/\n/g, "<br>")}</p>` : ""}
      <p><a href="https://wedconnect.eu/${escapeHtml(par.slug)}">A pár nyilvános oldala</a></p>
    `;

    await sendEmail(env, {
      to: env.ADMIN_EMAIL,
      subject: `Új rendelés (${formatPrice(total, lang)}) – ${par.par_neve}`,
      html,
      attachments,
    });
  } catch (e) {
    console.error(`order-save-the-date: email küldése sikertelen: ${e.message}`);
  }

  return Response.redirect(`${new URL("/partner/dashboard", request.url).href}?stdordered=1`, 303);
}
