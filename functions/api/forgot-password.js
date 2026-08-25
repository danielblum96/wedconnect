import { newSessionToken } from "../_utils/auth.js";
import { sendEmail } from "../_utils/mailer.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();

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
        // szándékosan elnyelve - a válasz mindig ugyanaz, hogy ne lehessen
        // kitalálni egy email-cím alapján, hogy létezik-e hozzá fiók.
      }
    }
  }

  return Response.redirect(`${new URL("/partner/forgot-password", request.url).href}?sent=1`, 303);
}
