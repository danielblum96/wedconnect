// Tranzakciós email küldés a Resend API-n (https://resend.com) keresztül.
// A Cloudflare Pages Functions natívan nem tud SMTP-t, ezért egy HTTP-alapú
// szolgáltatásra van szükség. Az API-kulcsot a `RESEND_API_KEY` Cloudflare
// Pages secret tárolja - amíg ez nincs beállítva, a küldés csendben nem
// történik meg (nem dob hibát), hogy a fejlesztés/tesztelés se akadjon el.
export async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "WedConnect <no-reply@wedconnect.eu>",
      to,
      subject,
      html,
    }),
  });
}
