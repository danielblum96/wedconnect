import { getAdminSession } from "../_utils/adminAuth.js";
import { purgePage } from "../_utils/pageLifecycle.js";
import { recordEvent } from "../_utils/measurement.js";

// Fiók (viszonteladó vagy magánszemély) VÉGLEGES törlése az admin felületről, pl.
// kamu regisztrációk eltávolítására. Nem vonható vissza.
//
// VÉDELEM: ha a fióknak van fizetett (vagy bármilyen, nem "Fizetésre vár")
// rendelése, NEM törölhető - az számviteli bizonylat, aminek a megőrzése jogi
// kötelezettség. A fizetésre váró rendelések a fiókkal együtt törlődnek.
// A törlés sorrendje a körkörös idegen kulcsok (parok <-> rendelesek) miatt fontos.
export async function onRequestPost(context) {
  const { request, env } = context;
  const session = await getAdminSession(request, env.DB);
  if (!session) return Response.redirect(new URL("/admin/login", request.url).href, 303);

  const formData = await request.formData();
  const id = parseInt((formData.get("viszontelado_id") || "").toString(), 10);
  const list = (formData.get("vissza") || "").toString() === "maganszemelyek" ? "maganszemelyek" : "viszonteladok";
  const back = (query) => Response.redirect(new URL(`/admin/${list}${query}`, request.url).href, 303);

  if (!id) return back("");
  const account = await env.DB.prepare("SELECT id, fiok_tipus, letrehozva FROM viszontelado WHERE id = ?").bind(id).first();
  if (!account) return back("");

  const blocking = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM rendelesek WHERE viszontelado_id = ? AND allapot != 'Fizetésre vár'"
  )
    .bind(id)
    .first();
  if (blocking && blocking.n > 0) return back("?hiba=fizetett_rendeles");

  const { results: pages } = await env.DB.prepare("SELECT id, slug FROM parok WHERE viszontelado_id = ?").bind(id).all();
  for (const p of pages || []) await purgePage(env, p);

  await env.DB.prepare("DELETE FROM rendelesek WHERE viszontelado_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM email_kuldesek WHERE viszontelado_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM measurement_events WHERE viszontelado_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM sessions WHERE viszontelado_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM password_resets WHERE viszontelado_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM viszontelado WHERE id = ?").bind(id).run();

  // Személyes adat nélküli naplósor, hogy a törlések száma követhető legyen.
  await recordEvent(env, {
    eventId: `account_deleted_${id}`,
    name: "account_deleted_by_admin",
    data: { account_type: account.fiok_tipus, registered: account.letrehozva, oldalak: (pages || []).length },
  });

  return back("?torolve=1");
}
