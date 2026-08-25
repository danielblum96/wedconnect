// A pár nyilvános oldalának alapértelmezett (nem-egyedi) szövegei, nyelvenként.
// A `parok.nyelv` mező dönti el, melyik készletet használjuk – ez a régi,
// kézzel épített rekordoknál (pl. Lili & Márk) 'hu'-ra van beállítva
// (DEFAULT 'hu' az ALTER TABLE-nél), új, DACH-viszonteladó által létrehozott
// pároknál pedig 'de'-re.
export const PUBLIC_COPY = {
  hu: {
    eyebrow: "Esküvő",
    defaultMessage: "Köszönjük, hogy velünk ünnepled életünk egyik legszebb napját!",
    notFoundTitle: "Oldal nem található",
    notFoundBody: "Ez az oldal nem található.",
  },
  de: {
    eyebrow: "Hochzeit",
    defaultMessage: "Vielen Dank, dass du diesen besonderen Tag mit uns feierst!",
    notFoundTitle: "Seite nicht gefunden",
    notFoundBody: "Diese Seite existiert nicht.",
  },
};

export function getCopy(lang) {
  return PUBLIC_COPY[lang] || PUBLIC_COPY.hu;
}

export function countryToLang(orszag) {
  const map = { DE: "de", AT: "de", CH: "de" };
  return map[(orszag || "").toUpperCase()] || "de";
}

// A `parok.allapot` mező belső (magyar) érték marad az adatbázisban - csak a
// MEGJELENÍTÉS fordítódik, ugyanaz a minta, mint a stílusoknál (id vs. nevek).
const STATUS_LABELS = {
  Új: { hu: "Új", de: "Neu" },
  Aktív: { hu: "Aktív", de: "Aktiv" },
};

export function getStatusLabel(status, lang) {
  const entry = STATUS_LABELS[status];
  if (!entry) return status || "";
  return entry[lang] || entry.hu;
}
