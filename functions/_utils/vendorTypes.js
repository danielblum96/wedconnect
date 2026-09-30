// Esküvői szolgáltató típusa (2026-10-01): a partner regisztrációkor választja ki legördülőből.
// A tárolt ÉRTÉK (kulcs) nyelvfüggetlen, a felirat nyelvenként más - így az admin felület
// (mindig magyar) és a regisztrációs űrlapok (hu/de/en) ugyanazt az adatot mutatják, csak fordítva.
export const VENDOR_TYPE_KEYS = [
  "szervezo",
  "helyszin",
  "fotos",
  "videos",
  "etkeztetes",
  "zene_dj",
  "dekoracio",
  "papirtermek",
  "ruha",
  "szepsegipar",
  "tortasutemeny",
  "technika",
  "egyeb",
];

export const VENDOR_TYPE_LABELS = {
  hu: {
    szervezo: "Esküvőszervező",
    helyszin: "Helyszín / rendezvényhely",
    fotos: "Fotós",
    videos: "Videós",
    etkeztetes: "Catering / étterem",
    zene_dj: "Zenekar / DJ",
    dekoracio: "Virág és dekoráció",
    papirtermek: "Meghívó / papírtermékek",
    ruha: "Esküvői ruha / öltöny",
    szepsegipar: "Smink / fodrász",
    tortasutemeny: "Torta / édességek",
    technika: "Hang- és fénytechnika",
    egyeb: "Egyéb esküvői szolgáltató",
  },
  de: {
    szervezo: "Hochzeitsplaner:in",
    helyszin: "Location / Veranstaltungsort",
    fotos: "Fotograf:in",
    videos: "Videograf:in",
    etkeztetes: "Catering / Restaurant",
    zene_dj: "Band / DJ",
    dekoracio: "Blumen & Dekoration",
    papirtermek: "Einladungen / Papeterie",
    ruha: "Brautmode / Anzüge",
    szepsegipar: "Make-up / Frisur",
    tortasutemeny: "Hochzeitstorte / Süßes",
    technika: "Ton- & Lichttechnik",
    egyeb: "Sonstiger Hochzeitsdienstleister",
  },
  en: {
    szervezo: "Wedding planner",
    helyszin: "Venue",
    fotos: "Photographer",
    videos: "Videographer",
    etkeztetes: "Catering / restaurant",
    zene_dj: "Band / DJ",
    dekoracio: "Flowers & decor",
    papirtermek: "Invitations / stationery",
    ruha: "Bridal & suit wear",
    szepsegipar: "Hair & makeup",
    tortasutemeny: "Cake & sweets",
    technika: "Sound & lighting",
    egyeb: "Other wedding vendor",
  },
};

export function vendorTypeLabel(key, lang) {
  const set = VENDOR_TYPE_LABELS[lang] || VENDOR_TYPE_LABELS.hu;
  return set[key] || null;
}
