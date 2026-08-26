import { newSessionToken } from "../_utils/auth.js";
import { sendEmail } from "../_utils/mailer.js";
import { checkRateLimit, clientIp } from "../_utils/rateLimit.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();

  const allowed = await checkRateLimit(
    env,
    `forgot-password:${clientIp(request)}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_SECONDS
  );
  if (!allowed) {
    return Response.redirect(`${new URL("/partner/forgot-password", request.url).href}?error=rate_limited`, 303);
  }

  if (email) {
    const reseller = await env.DB.prepare("SELECT id FROM viszontelado WHERE email = ?").bind(email).first();
    if (reseller) {
      const token = newSessionToken();
      const lejar = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
      await env.DB.prepare("INSERT INTO password_resets (token, viszontelado_id, lejar) VALUES (?, ?, ?)")
        .bind(token, reseller.id, lejar)
        .run();

      const resetUrl = `${new URL("/partner/reset-password", request.url).href}?token=${token}`;
      try {
        await sendEmail(env, {
          to: email,
          subject: "Passwort zurücksetzen – WedConnect",
          html: `<p>Sie haben eine Passwort-Zurücksetzung für Ihr WedConnect-Partnerkonto angefordert.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Der Link ist 1 Stunde gültig. Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail einfach.</p>`,
        });
      } catch (e) {
        // a KLIENSNEK adott válasz szándékosan mindig ugyanaz marad (anti-
        // enumeráció), de a hibát szerveroldalon naplózzuk, hogy debug-olható
        // legyen (ld. `wrangler pages deployment tail`).
        console.error(`forgot-password: email küldése sikertelen (${email}): ${e.message}`);
      }
    }
  }

  return Response.redirect(`${new URL("/partner/forgot-password", request.url).href}?sent=1`, 303);
}
