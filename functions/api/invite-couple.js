import { getSessionReseller, dashboardHref, newSessionToken } from "../_utils/auth.js";
import { getResellerCopy } from "../_utils/i18n.js";
import { sendEmail } from "../_utils/mailer.js";
import { checkRateLimit, clientIp } from "../_utils/rateLimit.js";
import { escapeHtml } from "../_utils/html.js";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);
  const dashboardUrl = dashboardHref(reseller.fiok_tipus);

  function backWithError(code) {
    return Response.redirect(`${new URL(dashboardUrl, request.url).href}?meghivo_hiba=${code}`, 303);
  }

  // Magánszemélyes fiók nem hívhat meg senkit (ő maga a pár, saját fiókkal) -
  // a dashboard UI ezt már elrejti, ez a szerver-oldali védőháló.
  if (reseller.fiok_tipus === "maganszemely") return backWithError("limit_reached");

  const formData = await request.formData();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return backWithError("invalid_email");

  const allowed = await checkRateLimit(
    env,
    `invite-couple:${reseller.id}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) return backWithError("rate_limited");

  const token = newSessionToken();
  const lejar = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  await env.DB.prepare("INSERT INTO meghivasok (token, viszontelado_id, email, lejar) VALUES (?, ?, ?, ?)")
    .bind(token, reseller.id, email, lejar)
    .run();

  const inviteUrl = `${new URL("/par-urlap", request.url).href}?token=${token}`;
  const t = getResellerCopy(reseller.nyelv || "de").inviteForm;
  const heading = t.heading(escapeHtml(reseller.ceg_nev));
  const privacyUrl = new URL(t.consentLinkHref, request.url).href;
  try {
    await sendEmail(env, {
      to: email,
      subject: t.title,
      html: `<p>${heading}</p><p>${t.emailIntro}</p><p><a href="${inviteUrl}">${inviteUrl}</a></p><p style="color:#7a7266;font-size:13px;">${t.emailPrivacyIntro} <a href="${privacyUrl}">${t.consentLinkText}</a>.</p>`,
    });
  } catch (e) {
    console.error(`invite-couple: email küldése sikertelen (${email}): ${e.message}`);
    return backWithError("generic");
  }

  return Response.redirect(`${new URL(dashboardUrl, request.url).href}?meghivo_elkuldve=1`, 303);
}
