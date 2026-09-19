import { recordEvent } from "../_utils/measurement.js";

// Az emlékeztető emailekben lévő gomb: naplózza a kattintást, majd a dashboardra
// irányít. Az UTM itt nem használható, mert a dashboardon a süti-kezelő szkript
// nem fut, az UTM elveszne. A levélbiztonsági szűrők (link-előolvasók) is
// "kattintásnak" számíthatnak, ezért a szám felső becslés.
export async function onRequestGet(context) {
  const { request, env, params, waitUntil } = context;
  const row = await env.DB.prepare("SELECT id, viszontelado_id, par_id, tipus FROM email_kuldesek WHERE token = ?")
    .bind(params.token)
    .first();
  if (row) {
    await env.DB.prepare(
      "UPDATE email_kuldesek SET kattintasok = kattintasok + 1, kattintva = COALESCE(kattintva, datetime('now')) WHERE id = ?"
    )
      .bind(row.id)
      .run();
    waitUntil(
      recordEvent(env, {
        eventId: `email_click_${row.id}`,
        name: "reminder_email_clicked",
        viszonteladoId: row.viszontelado_id,
        parId: row.par_id,
        data: { tipus: row.tipus },
      })
    );
  }
  return Response.redirect(new URL("/sajat/dashboard", request.url).href, 302);
}
