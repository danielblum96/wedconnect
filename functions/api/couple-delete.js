import { getSessionReseller, dashboardHref } from "../_utils/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/partner/login", request.url).href, 303);
  const dashboardUrl = dashboardHref(reseller.fiok_tipus);

  const formData = await request.formData();
  const parId = parseInt((formData.get("par_id") || "").toString(), 10);
  if (!parId) return Response.redirect(new URL(dashboardUrl, request.url).href, 303);

  try {
    // A pár törlése előtt a hozzá kötött rendeléseket (rendelesek.par_id)
    // le kell választani (NULL-ra állítani) - a par_id egy idegen kulcs a
    // parok táblára, foreign key megszorítás miatt a DELETE hibát dobna, ha
    // maradna hivatkozó sor. A rendelés MAGA megmarad (nem törlődik), csak a
    // pár-hivatkozás vész el - a rendelés adatai (mennyiség, cím, megjegyzés)
    // továbbra is megvannak, csak a kapcsolódó oldal lett törölve.
    await env.DB.prepare("UPDATE rendelesek SET par_id = NULL WHERE par_id = ? AND viszontelado_id = ?")
      .bind(parId, reseller.id)
      .run();

    await env.DB.prepare("DELETE FROM parok WHERE id = ? AND viszontelado_id = ?").bind(parId, reseller.id).run();
  } catch (e) {
    console.error(`couple-delete: törlés sikertelen (par_id=${parId}): ${e.message}`);
    return Response.redirect(`${new URL(dashboardUrl, request.url).href}?error=delete_failed`, 303);
  }

  return Response.redirect(`${new URL(dashboardUrl, request.url).href}?deleted=1`, 303);
}
