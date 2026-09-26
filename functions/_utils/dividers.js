// Díszítő elválasztó a nevek/dátum és az üzenet között. Minden elem egy egyszínű SVG-jel
// (currentColor = a stílus kiemelő színe), két vékony vonal között. Az adatbázisban
// (parok.elvalaszto) a kulcs tárolódik; NULL = alapértelmezett.
export const DIVIDER_KEYS = ["ag", "gyuru", "sziv", "virag", "csillag", "nincs"];
export const DEFAULT_DIVIDER = "ag";

export function resolveDivider(value) {
  return DIVIDER_KEYS.includes(value) ? value : DEFAULT_DIVIDER;
}

const svg = (vb, inner) => `<svg viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;

// Ágacska: középső szár, mindkét oldalon egymással szemben álló levelek (a bal fele a jobb tükörképe).
function sprigHalf() {
  let leaves = "";
  for (let i = 0; i < 5; i++) {
    const x = (64 + i * 9.5).toFixed(1);
    const x2 = (66 + i * 9.5).toFixed(1);
    leaves += `<path d="M${x} 12 q4 -9 10 -8 q-2 8 -10 8z"/><path d="M${x2} 12 q4 9 10 8 q-2 -8 -10 -8z"/>`;
  }
  return `<path d="M60 12 C74 10 96 14 112 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><g fill="currentColor">${leaves}</g>`;
}

const petals = [0, 60, 120, 180, 240, 300]
  .map((a) => `<ellipse rx="3.6" ry="7.5" cy="-8" transform="rotate(${a})"/>`)
  .join("");
const sparkle = "M32 1 C33.6 11 37 14 47 15 C37 16 33.6 19 32 29 C30.4 19 27 16 17 15 C27 14 30.4 11 32 1Z";

const GLYPHS = {
  ag: svg("0 0 120 24", `${sprigHalf()}<g transform="translate(120 0) scale(-1 1)">${sprigHalf()}</g><circle cx="60" cy="12" r="2.4" fill="currentColor"/>`),
  gyuru: svg(
    "0 0 44 26",
    `<g fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="16" cy="14" r="9"/><circle cx="28" cy="14" r="9"/></g><path d="M16 1.4l2.4 2.9-2.4 2.9-2.4-2.9z" fill="currentColor"/>`
  ),
  sziv: svg(
    "0 0 26 24",
    `<path fill="currentColor" d="M13 22 C4 15.5 2 11 2 7.8 C2 4.6 4.4 2.5 7.2 2.5 C9.6 2.5 11.6 3.9 13 6 C14.4 3.9 16.4 2.5 18.8 2.5 C21.6 2.5 24 4.6 24 7.8 C24 11 22 15.5 13 22 Z"/>`
  ),
  virag: svg("0 0 32 32", `<g transform="translate(16 16)" fill="none" stroke="currentColor" stroke-width="1.5">${petals}<circle r="2.4" fill="currentColor" stroke="none"/></g>`),
  csillag: svg(
    "0 0 64 30",
    `<g fill="currentColor"><path d="${sparkle}"/><path transform="translate(8 15) scale(0.4) translate(-32 -15)" d="${sparkle}"/><path transform="translate(56 15) scale(0.4) translate(-32 -15)" d="${sparkle}"/></g>`
  ),
};

// A teljes elválasztó (vonal - jel - vonal); "nincs" esetén üres.
export function dividerHtml(key) {
  const k = resolveDivider(key);
  if (k === "nincs") return "";
  return `<div class="divider divider-${k} reveal" style="--d:180ms"><span class="line"></span><span class="mark">${GLYPHS[k]}</span><span class="line"></span></div>`;
}

// Csak a jel (vonalak nélkül), pl. a nyitó boríték díszítéséhez.
export function dividerGlyph(key) {
  return GLYPHS[resolveDivider(key)] || GLYPHS[DEFAULT_DIVIDER];
}
