// Leiratkozás az emlékeztető emailekről. A GET csak egy megerősítő oldalt mutat
// (a levélbiztonsági szűrők link-előolvasása így nem iratkoztat le senkit), a
// leiratkozás POST-ra történik - ugyanezt használja a List-Unsubscribe-Post
// (egykattintásos) levelezőkliens-funkció is.
function page(title, bodyHtml) {
  const html = `<!DOCTYPE html>
<html lang="hu"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex, nofollow"><title>${title} — WedConnect</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:#faf7f2; color:#2b2620; font-family:Arial,Helvetica,sans-serif; }
  .card { background:#fff; max-width:440px; width:100%; padding:36px 32px; border-radius:12px; box-shadow:0 20px 50px -20px rgba(0,0,0,0.15); }
  .brand { font-family:Georgia,serif; font-size:1.5rem; font-weight:600; margin-bottom:18px; }
  .brand span { color:#b48b56; }
  p { line-height:1.6; }
  button { border:none; background:#b48b56; color:#fff; font-weight:bold; font-size:1rem; padding:12px 26px; border-radius:999px; cursor:pointer; }
  a { color:#8c6d34; }
</style></head><body><div class="card"><div class="brand">Wed<span>Connect</span></div>${bodyHtml}</div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
}

async function findRow(env, token) {
  return env.DB.prepare("SELECT id, viszontelado_id FROM email_kuldesek WHERE token = ?").bind(token).first();
}

export async function onRequestGet(context) {
  const { env, params } = context;
  const row = await findRow(env, params.token);
  if (!row) return page("Leiratkozás", "<p>Ez a hivatkozás érvénytelen vagy lejárt.</p>");
  return page(
    "Leiratkozás",
    `<p>Ha leiratkozol, nem küldünk több emlékeztetőt az esküvői oldalad fizetési határidejéről.</p>
     <form method="POST"><button type="submit">Leiratkozom</button></form>`
  );
}

export async function onRequestPost(context) {
  const { env, params } = context;
  const row = await findRow(env, params.token);
  if (!row) return page("Leiratkozás", "<p>Ez a hivatkozás érvénytelen vagy lejárt.</p>");
  await env.DB.prepare("UPDATE viszontelado SET emlekezteto_tiltva = 1 WHERE id = ?").bind(row.viszontelado_id).run();
  return page("Leiratkoztál", "<p>Leiratkoztál, a továbbiakban nem küldünk emlékeztetőt az esküvői oldalad fizetési határidejéről.</p>");
}
