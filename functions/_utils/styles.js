export const STYLES = [
  { id: "modern-minimalista", nev: "Modern minimalista", bg: "#ffffff", fg: "#161616", accent: "#161616", accentText: "#161616", btnFg: "#fbfbfa", fgMuted: "#737373", font: "sans" },
  { id: "luxury-elegans", nev: "Luxury / Elegáns", bg: "linear-gradient(160deg,#0d0d0d,#1c1a16)", fg: "#f2e6c9", accent: "#cfa64b", accentText: "#cfa74d", btnFg: "#141414", fgMuted: "#8b8474", font: "caps" },
  { id: "klasszikus", nev: "Klasszikus", bg: "#fbfaf5", fg: "#22301f", accent: "#a9833f", accentText: "#8c6d34", btnFg: "#141414", fgMuted: "#6a7366", font: "script" },
  { id: "rusztikus", nev: "Rusztikus", bg: "linear-gradient(160deg,#7a5638,#5b3f28)", fg: "#fbf1e1", accent: "#e0bd83", accentText: "#ecd6b2", btnFg: "#141414", fgMuted: "#e5d7c4", font: "hand" },
  { id: "boho", nev: "Boho", bg: "linear-gradient(160deg,#e9d3ac,#cf9a67)", fg: "#4a3320", accent: "#7c8a54", accentText: "#353b24", btnFg: "#141414", fgMuted: "#4c3521", font: "hand" },
  { id: "vintage", nev: "Vintage", bg: "#f3e6e2", fg: "#6b4a52", accent: "#b98a95", accentText: "#7e5e65", btnFg: "#141414", fgMuted: "#7d5e65", font: "script" },
  { id: "romantikus", nev: "Romantikus", bg: "linear-gradient(160deg,#fdedf0,#f6d6dc)", fg: "#7a3f4c", accent: "#d98fa0", accentText: "#80545e", btnFg: "#141414", fgMuted: "#87505c", font: "script" },
  { id: "kerti", nev: "Kerti (Garden Party)", bg: "linear-gradient(160deg,#2a3350,#3d4a70)", fg: "#f5efe0", accent: "#f2c14e", accentText: "#f2c250", btnFg: "#141414", fgMuted: "#c0bebb", font: "serif-i" },
  { id: "mediterran-toszkan", nev: "Mediterrán / Toszkán", bg: "linear-gradient(160deg,#f5e7c6,#e3bd7c)", fg: "#6b3d1f", accent: "#b1451f", accentText: "#883518", btnFg: "#fbfbfa", fgMuted: "#714426", font: "serif-i" },
  { id: "tengerparti", nev: "Tengerparti", bg: "linear-gradient(160deg,#eaf6fb,#cdeaf4)", fg: "#225063", accent: "#4a8fa8", accentText: "#386b7e", btnFg: "#141414", fgMuted: "#426b7b", font: "hand" },
  { id: "industrial", nev: "Industrial", bg: "linear-gradient(160deg,#3c3c3c,#282828)", fg: "#e9e9e9", accent: "#b0603f", accentText: "#cf9e8a", btnFg: "#fbfbfa", fgMuted: "#a9a9a9", font: "sans" },
  { id: "modern-glam", nev: "Modern Glam", bg: "linear-gradient(160deg,#141414,#242424)", fg: "#f2e7d2", accent: "#d4af37", accentText: "#d4b039", btnFg: "#141414", fgMuted: "#938c80", font: "caps" },
  { id: "art-deco", nev: "Art Deco", bg: "#111111", fg: "#f0e6d0", accent: "#c9a227", accentText: "#caa329", btnFg: "#141414", fgMuted: "#837e72", font: "caps" },
  { id: "skandinav", nev: "Skandináv", bg: "#f7f5ef", fg: "#2e3a2f", accent: "#8faa8b", accentText: "#61745f", btnFg: "#141414", fgMuted: "#687067", font: "sans" },
  { id: "dark-romance", nev: "Dark Romance", bg: "linear-gradient(160deg,#1c0e13,#2d0f17)", fg: "#e9d5d0", accent: "#8a2e3a", accentText: "#b1737b", btnFg: "#fbfbfa", fgMuted: "#917f7f", font: "script" },
  { id: "forest-woodland", nev: "Forest / Woodland", bg: "linear-gradient(160deg,#1f3524,#2c4632)", fg: "#e6ead9", accent: "#7fae6a", accentText: "#90b97d", btnFg: "#141414", fgMuted: "#a8b2a1", font: "serif-i" },
  { id: "fairytale", nev: "Tündérmese (Fairytale)", bg: "linear-gradient(160deg,#f3e9ff,#e3d1f5)", fg: "#5a3d73", accent: "#c98fbb", accentText: "#73526b", btnFg: "#141414", fgMuted: "#6c5284", font: "script" },
  { id: "farmhouse", nev: "Farmhouse", bg: "#f7f2e6", fg: "#4a4038", accent: "#7f96a8", accentText: "#5e6f7c", btnFg: "#141414", fgMuted: "#756c64", font: "hand" },
  { id: "modern-botanical", nev: "Modern Botanical", bg: "#fbfbf7", fg: "#2e3a2f", accent: "#4f7a52", accentText: "#4e7951", btnFg: "#fbfbfa", fgMuted: "#6c746b", font: "serif-i" },
  { id: "coastal", nev: "Coastal", bg: "linear-gradient(160deg,#ffffff,#e4eef3)", fg: "#1f3a4a", accent: "#2c6e8f", accentText: "#2c6d8e", btnFg: "#fbfbfa", fgMuted: "#576b77", font: "sans" },
];

export function getStyle(id) {
  return STYLES.find((s) => s.id === id) || STYLES[0];
}

export const FONT_RECIPES = {
  sans: 'font-family:"Poppins",sans-serif; font-weight:600; letter-spacing:0.02em;',
  caps: 'font-family:"Cinzel",serif; font-weight:600; letter-spacing:0.06em; text-transform:uppercase;',
  script: 'font-family:"Great Vibes",cursive; font-weight:400;',
  hand: 'font-family:"Caveat",cursive; font-weight:600;',
  "serif-i": 'font-family:"Cormorant Garamond",serif; font-style:italic; font-weight:500;',
};

export function namesFontSize(font) {
  return font === "script" || font === "hand" ? "clamp(2.6rem, 9vw, 4.4rem)" : "clamp(2.2rem, 7vw, 3.6rem)";
}
