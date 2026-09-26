// Az oldal összes szekciója átrendezhető. A tárolt sorrend (parok.szekcio_sorrend) ezek kulcsait
// tartalmazza; a hiányzókat kiegészítjük: a fejléc-elemek (kép, nevek, díszítő elem) HA nem szerepelnek
// a tárolt listában (régi, csak a 6 tartalmi szekciót ismerő mentés), az elejére kerülnek, az újabb
// tartalmi szekciók a végére.
export const SECTION_KEYS = ["photo", "names", "divider", "message", "countdown", "story", "location", "program", "buttons"];
const HEAD = ["photo", "names", "divider"];

export function normalizeOrder(saved) {
  const valid = (Array.isArray(saved) ? saved : []).filter((k, i, a) => SECTION_KEYS.includes(k) && a.indexOf(k) === i);
  const head = HEAD.filter((k) => !valid.includes(k));
  const rest = SECTION_KEYS.filter((k) => !head.includes(k) && !valid.includes(k));
  return [...head, ...valid, ...rest];
}
