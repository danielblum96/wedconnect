import { getSessionReseller } from "../_utils/auth.js";
import { escapeHtml } from "../_utils/html.js";
import { sendEmail } from "../_utils/mailer.js";
import { generateSVG } from "../_utils/saveTheDate.js";

const PAGE_PRICE_EUR = 50;
const STD_PRICE_EUR = 4;

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  const mennyisegRaw = (formData.get("mennyiseg") || "").toString().trim();
  const mennyiseg = mennyisegRaw === "" ? 0 : parseInt(mennyisegRaw, 10);
  const szallitasiCim = (formData.get("szallitasi_cim") || "").toString().trim();
  const szamlazasiCim = (formData.get("szamlazasi_cim") || "").toString().trim();
  const megjegyzes = (formData.get("megjegyzes") || "").toString().trim();
  const wantsStd = mennyiseg > 0;

  function backWithError(code) {
    return Response.redirect(`${new URL("/partner/dashboard", request.url).href}?stderror=${code}`, 303);
  }

  if (!parId || isNaN(mennyiseg) || mennyiseg < 0 || mennyiseg > 9999) return backWithError("invalid");
  if (wantsStd && mennyiseg < 50) return backWithError("min_quantity");
  if (!szamlazasiCim) return backWithError("missing_billing");
  if (wantsStd && !szallitasiCim) return backWithError("missing_address");

  const par = await env.DB.prepare(
    "SELECT id, par_neve, nev1, nev2, eskuvo_datuma, slug, nyelv FROM parok WHERE id = ? AND viszontelado_id = ?"
  )
    .bind(parId, reseller.id)
    .first();
  if (!par) return backWithError("invalid");

  const stdSubtotal = mennyiseg * STD_PRICE_EUR;
  const pageFee = wantsStd ? 0 : PAGE_PRICE_EUR;
  const total = pageFee + stdSubtotal;

  if (wantsStd) {
    await env.DB.prepare(
      "INSERT INTO rendelesek (viszontelado_id, par_id, csomag, mennyiseg, szallitasi_cim, szamlazasi_cim, megjegyzes) VALUES (?, ?, 'Save the Date naptár (Seite inklusive)', ?, ?, ?, ?)"
    )
      .bind(reseller.id, par.id, mennyiseg, szallitasiCim, szamlazasiCim, megjegyzes || null)
      .run();
  } else {
    await env.DB.prepare(
      "INSERT INTO rendelesek (viszontelado_id, par_id, csomag, mennyiseg, szallitasi_cim, szamlazasi_cim, megjegyzes) VALUES (?, ?, 'Hochzeitsseite (ohne Save the Date)', 1, ?, ?, ?)"
    )
      .bind(reseller.id, par.id, szallitasiCim || null, szamlazasiCim, megjegyzes || null)
      .run();
  }

  try {
    const html = wantsStd
      ? (() => {
          const [year, month, day] = (par.eskuvo_datuma || "").split("-").map(Number);
          const nev1 = par.nev1 || (par.par_neve || "").split(" & ")[0] || "";
          const nev2 = par.nev2 || (par.par_neve || "").split(" & ")[1] || "";
          const svg = generateSVG(nev1, nev2, year, month, day, par.nyelv || "hu");
          const filename = `${par.slug}-save-the-date.svg`;
          return {
            html: `
              <h2>Új rendelés (Bestellung abschließen)</h2>
              <p><strong>Viszonteladó:</strong> ${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</p>
              <p><strong>Pár:</strong> ${escapeHtml(par.par_neve)} · ${escapeHtml(par.eskuvo_datuma)}</p>
              <p><strong>Hochzeitsseite:</strong> kostenlos (Save the Date-Bestellung ab 50 Stück)</p>
              <p><strong>Save the Date:</strong> ${mennyiseg} db × ${STD_PRICE_EUR.toFixed(2)} € = ${stdSubtotal.toFixed(2)} €</p>
              <p><strong>Összesen:</strong> ${total.toFixed(2)} € (fizetés még nincs beszedve – Stripe folyamatban)</p>
              <p><strong>Számlázási cím:</strong><br>${escapeHtml(szamlazasiCim).replace(/\n/g, "<br>")}</p>
              <p><strong>Szállítási cím:</strong><br>${escapeHtml(szallitasiCim).replace(/\n/g, "<br>")}</p>
              ${megjegyzes ? `<p><strong>Megjegyzés:</strong><br>${escapeHtml(megjegyzes).replace(/\n/g, "<br>")}</p>` : ""}
              <p>A pontos, lézervágásra kész SVG-fájl csatolva.</p>
              <p><a href="https://wedconnect.eu/${escapeHtml(par.slug)}">A pár nyilvános oldala</a></p>
            `,
            attachments: [{ filename, content: utf8ToBase64(svg) }],
          };
        })()
      : {
          html: `
            <h2>Új rendelés (Bestellung abschließen)</h2>
            <p><strong>Viszonteladó:</strong> ${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</p>
            <p><strong>Pár:</strong> ${escapeHtml(par.par_neve)} · ${escapeHtml(par.eskuvo_datuma)}</p>
            <p><strong>Hochzeitsseite (einmalig):</strong> ${PAGE_PRICE_EUR.toFixed(2)} €</p>
            <p><strong>Összesen:</strong> ${total.toFixed(2)} € (fizetés még nincs beszedve – Stripe folyamatban)</p>
            <p><strong>Számlázási cím:</strong><br>${escapeHtml(szamlazasiCim).replace(/\n/g, "<br>")}</p>
            ${megjegyzes ? `<p><strong>Megjegyzés:</strong><br>${escapeHtml(megjegyzes).replace(/\n/g, "<br>")}</p>` : ""}
            <p><a href="https://wedconnect.eu/${escapeHtml(par.slug)}">A pár nyilvános oldala</a></p>
          `,
          attachments: [],
        };

    await sendEmail(env, {
      to: env.ADMIN_EMAIL,
      subject: `Bestellung abschließen (${total.toFixed(2)} €) – ${par.par_neve}`,
      html: html.html,
      attachments: html.attachments,
    });
  } catch (e) {
    console.error(`order-save-the-date: email küldése sikertelen: ${e.message}`);
  }

  return Response.redirect(`${new URL("/partner/dashboard", request.url).href}?stdordered=1`, 303);
}
