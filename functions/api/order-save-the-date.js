import { getSessionReseller } from "../_utils/auth.js";
import { escapeHtml } from "../_utils/html.js";
import { sendEmail } from "../_utils/mailer.js";
import { generateMockupSVG } from "../_utils/saveTheDate.js";

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
  const mennyiseg = parseInt((formData.get("mennyiseg") || "").toString(), 10);
  const szallitasiCim = (formData.get("szallitasi_cim") || "").toString().trim();
  const megjegyzes = (formData.get("megjegyzes") || "").toString().trim();

  function backWithError(code) {
    return Response.redirect(`${new URL("/partner/dashboard", request.url).href}?stderror=${code}`, 303);
  }

  if (!parId || !mennyiseg || mennyiseg < 1 || mennyiseg > 9999) return backWithError("invalid");
  if (!szallitasiCim) return backWithError("missing_address");

  const par = await env.DB.prepare(
    "SELECT id, par_neve, nev1, nev2, eskuvo_datuma, slug FROM parok WHERE id = ? AND viszontelado_id = ?"
  )
    .bind(parId, reseller.id)
    .first();
  if (!par) return backWithError("invalid");

  await env.DB.prepare(
    "INSERT INTO rendelesek (viszontelado_id, par_id, csomag, mennyiseg, szallitasi_cim, megjegyzes) VALUES (?, ?, 'Save the Date naptár', ?, ?, ?)"
  )
    .bind(reseller.id, par.id, mennyiseg, szallitasiCim, megjegyzes || null)
    .run();

  try {
    const [year, month, day] = (par.eskuvo_datuma || "").split("-").map(Number);
    const nev1 = par.nev1 || (par.par_neve || "").split(" & ")[0] || "";
    const nev2 = par.nev2 || (par.par_neve || "").split(" & ")[1] || "";
    const svg = generateMockupSVG(nev1, nev2, year, month, day);
    const filename = `${par.slug}-save-the-date.svg`;

    const html = `
      <h2>Új Save the Date rendelés</h2>
      <p><strong>Viszonteladó:</strong> ${escapeHtml(reseller.ceg_nev)} (${escapeHtml(reseller.email)})</p>
      <p><strong>Pár:</strong> ${escapeHtml(par.par_neve)} · ${escapeHtml(par.eskuvo_datuma)}</p>
      <p><strong>Mennyiség:</strong> ${mennyiseg} db</p>
      <p><strong>Szállítási cím:</strong><br>${escapeHtml(szallitasiCim).replace(/\n/g, "<br>")}</p>
      ${megjegyzes ? `<p><strong>Megjegyzés:</strong><br>${escapeHtml(megjegyzes).replace(/\n/g, "<br>")}</p>` : ""}
      <p>A pontos, lézervágásra kész SVG-fájl csatolva.</p>
      <p><a href="https://wedconnect.eu/${escapeHtml(par.slug)}">A pár nyilvános oldala</a></p>
    `;

    await sendEmail(env, {
      to: env.ADMIN_EMAIL,
      subject: `Save the Date rendelés – ${par.par_neve}`,
      html,
      attachments: [{ filename, content: utf8ToBase64(svg) }],
    });
  } catch (e) {
    console.error(`order-save-the-date: email küldése sikertelen: ${e.message}`);
  }

  return Response.redirect(`${new URL("/partner/dashboard", request.url).href}?stdordered=1`, 303);
}
