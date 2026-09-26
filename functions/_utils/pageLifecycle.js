// Egy esküvői oldal VÉGLEGES törlése (lejárt, ki nem fizetett oldal a visszaállítási
// ablak után). Két helyről hívódik: az ütemezett feladat (reminders.js) és a
// dashboard lazy takarítása tartalékként.
//
// A hozzá kötött rendeléseket (rendelesek.par_id) törlés előtt le kell választani -
// a par_id idegen kulcs, enélkül a DELETE FOREIGN KEY hibával elszáll (ld.
// couple-delete.js azonos mintája). A borítókép az R2-ből is törlődik, különben
// örökre bent maradna.
export async function purgePage(env, par) {
  await env.DB.prepare("UPDATE rendelesek SET par_id = NULL WHERE par_id = ?").bind(par.id).run();
  await env.DB.prepare("DELETE FROM parok WHERE id = ?").bind(par.id).run();
  if (par.slug) {
    try {
      await env.PHOTOS.delete(`parok/${par.slug}.webp`);
    } catch (e) {
      console.error(`purgePage: borítókép törlése sikertelen (slug=${par.slug}): ${e.message}`);
    }
  }
}
