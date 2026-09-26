import { escapeHtml } from "./html.js";

// Nyitó animáció ("boríték"): a publikus oldal megnyitásakor egy lezárt, viaszpecsétes
// meghívó látszik (a stílus színeivel), koppintásra a két szárny kinyílik, és előbukkan az
// oldal. Csak akkor kerül az oldalra, ha parok.nyito_animacio = 'boritek'. Böngészőmunkamenetenként
// egyszer jelenik meg, a csökkentett mozgást kérő eszközökön kimarad, JS nélkül nem takar semmit.
// A szerkesztő módban egy <template>-ből, a "Megtekintés" gombra játszható le.

function initial(name) {
  const ch = Array.from((name || "").trim())[0];
  return ch ? ch.toLocaleUpperCase() : "♥";
}

export function monogramHtml(nev1, nev2) {
  return `${escapeHtml(initial(nev1))}<i>&amp;</i>${escapeHtml(initial(nev2))}`;
}

// Színpaletta a stílusból: a szinte fekete/szürke (semleges) kiemelő színű stílusoknál (pl. Modern
// minimalista) a pecsét bordó vagy arany, a díszítés arany lesz, hogy sose legyen fekete pecsét.
// FONTOS: önálló függvény, beágyazott függvények nélkül (a szerkesztő kliens-kódja a .toString()-jét is felhasználja).
export function envelopePalette(accent, bg) {
  // Szándékosan NINCS benne beágyazott függvény: a csomagoló (esbuild) oda __name() hívást szúrna,
  // ami a kliensen (a .toString()-ből újraépített kódban) nem létezik.
  var firstHex = (String(bg || "").match(/#[0-9a-fA-F]{6}/) || ["#ffffff"])[0];
  var inputs = [accent, firstHex];
  var lums = [];
  var chromas = [];
  for (var i = 0; i < 2; i++) {
    var h = String(inputs[i] || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var c = isNaN(n) || h.length !== 6 ? [176, 141, 87] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    lums.push((0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255);
    chromas.push(Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]));
  }
  var neutral = chromas[0] < 30;
  var darkBg = lums[1] < 0.35;
  var orn = neutral ? "#b39568" : accent;
  var seal = neutral ? (darkBg ? "#c9a56a" : "#8f2e42") : accent;
  var sh = String(seal).replace("#", "");
  var sn = parseInt(sh, 16);
  var sl = isNaN(sn) || sh.length !== 6 ? 0.4 : (0.2126 * ((sn >> 16) & 255) + 0.7152 * ((sn >> 8) & 255) + 0.0722 * (sn & 255)) / 255;
  return { orn: orn, seal: seal, sealFg: sl > 0.5 ? "#3b2a12" : "#fbf1dc" };
}

export function paletteStyleAttr(style) {
  const p = envelopePalette(style.accent, style.bg);
  return `--env-orn:${p.orn};--env-seal:${p.seal};--env-seal-fg:${p.sealFg}`;
}

// ---- Egy szárny díszítése (a bal szárny rajza; a jobb ennek tükörképe) -----------------------------
// Növényi/virágos, "esküvői" motívumok: virágok, levélfüzér a találkozásnál (ott a két fél egészet
// ad), indák, sarokvirágok, kettős keret. Programozottan generált SVG (egyszínű, currentColor).
const r1 = (n) => Math.round(n * 10) / 10;

function leaf(x, y, ang, len, w = 0.36) {
  const a = len * w;
  return `<path transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(ang)})" d="M0 0 C${r1(len * 0.3)} ${-r1(a)} ${r1(len * 0.8)} ${-r1(a * 0.9)} ${r1(len)} 0 C${r1(len * 0.8)} ${r1(a * 0.9)} ${r1(len * 0.3)} ${r1(a)} 0 0Z"/>`;
}

function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return { x, y, ang: (Math.atan2(dy, dx) * 180) / Math.PI };
}

// Inda: egy görbe + váltakozó oldalú levelek + apró rügy a végén.
function vine(p0, p1, p2, p3, n, len, opt = {}) {
  const spread = opt.spread || 52;
  let leaves = "";
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const b = bez(p0, p1, p2, p3, t);
    const side = i % 2 ? 1 : -1;
    leaves += leaf(b.x, b.y, b.ang + side * spread, len * (0.75 + 0.25 * Math.sin(Math.PI * t)));
  }
  const end = bez(p0, p1, p2, p3, 1);
  const bud = opt.bud === false ? "" : `<circle cx="${r1(end.x)}" cy="${r1(end.y)}" r="2.2" fill="currentColor" stroke="none"/>`;
  return `<path fill="none" d="M${p0[0]} ${p0[1]} C${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}"/><g class="env-lf">${leaves}</g>${bud}`;
}

// Kibomló virág (pünkösdi rózsa-szerű): egymásba rétegzett szirom-gyűrűk.
function bloom(cx, cy, r) {
  const ring = (n, ry, off, dist, rx) =>
    Array.from({ length: n }, (_, i) => `<ellipse rx="${r1(rx)}" ry="${r1(ry)}" cy="${-r1(dist)}" transform="rotate(${r1(off + (i * 360) / n)})"/>`).join("");
  return `<g class="env-bl" transform="translate(${cx} ${cy})">${ring(9, r * 0.5, 0, r * 0.66, r * 0.25)}${ring(7, r * 0.42, 20, r * 0.42, r * 0.21)}${ring(5, r * 0.32, 36, r * 0.2, r * 0.17)}<circle r="${r1(r * 0.1)}" fill="currentColor" stroke="none"/></g>`;
}

function smallFlower(cx, cy, r) {
  const petals = Array.from({ length: 5 }, (_, i) => `<ellipse rx="${r1(r * 0.32)}" ry="${r1(r * 0.5)}" cy="${-r1(r * 0.5)}" transform="rotate(${i * 72})"/>`).join("");
  return `<g class="env-bl" transform="translate(${cx} ${cy})">${petals}<circle r="${r1(r * 0.16)}" fill="currentColor" stroke="none"/></g>`;
}

// Lótusz-szerű legyező a szárnyak találkozásánál (a széle az x=200 vonal; a két fél egészet ad).
function fan(cx, cy, flip) {
  const petals = [-72, -48, -24, 0, 24, 48, 72]
    .map((a) => `<ellipse rx="6.2" ry="${a === 0 ? 27 : 23}" cy="-19" transform="rotate(${a})"/>`)
    .join("");
  return `<g class="env-bl" transform="translate(${cx} ${cy})${flip ? " rotate(180)" : ""}">${petals}<circle cy="-2" r="3" fill="currentColor" stroke="none"/></g>`;
}

function cornerSpray() {
  return (
    bloom(56, 66, 30) +
    leaf(76, 52, -24, 40) + leaf(82, 68, 6, 44) + leaf(74, 86, 42, 42) + leaf(58, 96, 78, 40) + leaf(40, 96, 112, 34) +
    vine([90, 50], [118, 22], [150, 60], [192, 40], 5, 17) +
    vine([36, 100], [12, 170], [50, 250], [32, 322], 6, 16)
  );
}

function seamGarland() {
  return vine([194, 120], [176, 210], [208, 262], [192, 330], 8, 22, { spread: 48, bud: false });
}

function wingOrnament() {
  const mirrorY = (inner) => `<g transform="translate(0 700) scale(1 -1)">${inner}</g>`;
  const half = cornerSpray() + seamGarland() + fan(200, 18, false);
  return `<svg class="env-orn" viewBox="0 0 200 700" preserveAspectRatio="xMaxYMid meet" aria-hidden="true" focusable="false">
  <style>.env-lf path{fill:currentColor;fill-opacity:.22}.env-bl ellipse{fill:currentColor;fill-opacity:.1}</style>
  <g fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">
    <rect x="12" y="12" width="200" height="676" rx="10" opacity="0.75"/>
    <rect x="21" y="21" width="191" height="658" rx="7" opacity="0.4"/>
    ${half}
    ${mirrorY(half)}
    ${smallFlower(36, 350, 15)}
    ${leaf(36, 334, -100, 20)}${leaf(36, 366, 100, 20)}
  </g>
</svg>`;
}

const WING_ORNAMENT = wingOrnament();

// A borító jelölése. Az `id="wc-env"` egyedi: a publikus oldalon közvetlenül a body elején áll
// (az első kirajzolástól takar), a szerkesztőben egy <template>-ben.
export function envelopeMarkup({ monogram, copy, style }) {
  const pal = style ? ` style="${paletteStyleAttr(style)}"` : "";
  return `<div id="wc-env"${pal} role="dialog" aria-modal="true" aria-label="${escapeHtml(copy.envelopeLabel)}">
  <div class="env-stage">
    <div class="env-wing env-wing-l">${WING_ORNAMENT}</div>
    <div class="env-wing env-wing-r">${WING_ORNAMENT}</div>
    <button type="button" class="env-open" aria-label="${escapeHtml(copy.envelopeLabel)}"></button>
    <div class="env-seal" aria-hidden="true"><span class="env-mono">${monogram}</span></div>
    <div class="env-hint" aria-hidden="true">${escapeHtml(copy.envelopeHint)}</div>
    <button type="button" class="env-skip">${escapeHtml(copy.envelopeSkip)}</button>
  </div>
</div>`;
}

export const envelopeCss = `
  html.wc-env-skip #wc-env { display: none !important; }
  html.wc-env-lock, html.wc-env-lock body { overflow: hidden; }
  #wc-env { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background: var(--bg); transition: background 0.9s ease 0.45s; -webkit-tap-highlight-color: transparent; text-align: center; }
  #wc-env * { box-sizing: border-box; }
  #wc-env .env-stage { position: relative; width: 100%; max-width: 520px; height: 100%; perspective: 1500px; }
  #wc-env .env-wing { position: absolute; top: 0; bottom: 0; width: 50%; overflow: hidden; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .42 0 0 0 0 .33 0 0 0 0 .22 0 0 0 .5 -.14'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"), linear-gradient(90deg, rgba(120,90,50,0.05), rgba(255,255,255,0.08)), var(--bg); backface-visibility: hidden; will-change: transform; transition: transform 1.05s cubic-bezier(0.65, 0.05, 0.25, 1) 0.45s; }
  #wc-env .env-wing-l { left: 0; transform-origin: 0 50%; box-shadow: inset -12px 0 20px -14px rgba(0,0,0,0.35); }
  #wc-env .env-wing-r { right: 0; transform-origin: 100% 50%; box-shadow: inset 12px 0 20px -14px rgba(0,0,0,0.35); }
  #wc-env .env-wing-r .env-orn { transform: scaleX(-1); }
  #wc-env .env-orn { position: absolute; inset: 0; width: 100%; height: 100%; color: var(--env-orn, var(--accent)); opacity: 0.78; filter: drop-shadow(1px 1px 0 rgba(255,255,255,0.45)) drop-shadow(-1px -1px 0 rgba(0,0,0,0.16)); }
  #wc-env .env-open { position: absolute; inset: 0; z-index: 2; width: 100%; background: none; border: 0; padding: 0; cursor: pointer; outline: none; }
  #wc-env .env-open:focus-visible ~ .env-seal { box-shadow: 0 0 0 4px rgba(255,255,255,0.7), 0 0 0 6px var(--env-seal, var(--accent)), 0 10px 20px rgba(0,0,0,0.35); }
  #wc-env .env-seal { position: absolute; left: 50%; top: 50%; z-index: 3; width: 104px; height: 104px; margin: -52px 0 0 -52px; display: flex; align-items: center; justify-content: center; pointer-events: none;
    border-radius: 52% 48% 54% 46% / 47% 55% 45% 53%;
    background: var(--env-seal, var(--accent));
    background: radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--env-seal, var(--accent)) 60%, #fff) 0, var(--env-seal, var(--accent)) 46%, color-mix(in srgb, var(--env-seal, var(--accent)) 62%, #000) 100%);
    box-shadow: 0 10px 20px rgba(0,0,0,0.35), inset 0 -4px 9px rgba(0,0,0,0.28), inset 0 3px 7px rgba(255,255,255,0.4);
    animation: env-float 3s ease-in-out infinite; }
  #wc-env .env-seal::after { content: ""; position: absolute; inset: -9px -7px -8px -8px; z-index: -1; border-radius: 47% 53% 44% 56% / 55% 44% 56% 45%; background: var(--env-seal, var(--accent)); background: color-mix(in srgb, var(--env-seal, var(--accent)) 82%, #000); opacity: 0.95; }
  #wc-env .env-seal::before { content: ""; position: absolute; inset: 10px; border-radius: 50%; border: 1.5px solid var(--env-seal-fg, var(--btn-fg)); opacity: 0.45; }
  #wc-env .env-mono { position: relative; font: italic 600 1.7rem/1 "Cormorant Garamond", serif; color: var(--env-seal-fg, var(--btn-fg)); text-shadow: 0 1px 0 rgba(255,255,255,0.22), 0 -1px 0 rgba(0,0,0,0.32); white-space: nowrap; }
  #wc-env .env-mono i { font-size: 0.8em; opacity: 0.85; margin: 0 1px; }
  #wc-env .env-hint { position: absolute; left: 0; right: 0; top: calc(50% + 82px); z-index: 3; pointer-events: none; font: 600 0.74rem "Poppins", sans-serif; letter-spacing: 0.22em; text-transform: uppercase; color: var(--fg); opacity: 0.75; text-shadow: 0 0 6px var(--bg), 0 0 10px var(--bg), 0 0 14px var(--bg); animation: env-pulse 2.2s ease-in-out infinite; }
  #wc-env .env-skip { position: absolute; left: 50%; top: calc(50% + 124px); transform: translateX(-50%); text-shadow: 0 0 6px var(--bg), 0 0 10px var(--bg), 0 0 14px var(--bg); z-index: 4; background: none; border: 0; padding: 10px 14px; cursor: pointer; font: 500 0.7rem "Poppins", sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fg); opacity: 0.75; }
  #wc-env.env-opening { background: transparent; animation: env-out 0.5s ease 1.35s forwards; }
  #wc-env.env-opening .env-wing-l { transform: rotateY(-115deg); }
  #wc-env.env-opening .env-wing-r { transform: rotateY(115deg); }
  #wc-env.env-opening .env-seal { animation: env-seal-break 0.55s ease-out forwards; }
  #wc-env.env-opening .env-hint, #wc-env.env-opening .env-skip { opacity: 0; transition: opacity 0.25s; animation: none; }
  #wc-env.env-opening, #wc-env.env-fast { pointer-events: none; }
  #wc-env.env-fast { animation: env-out 0.3s ease forwards; }
  @keyframes env-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  @keyframes env-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.85; } }
  @keyframes env-seal-break { 0% { transform: scale(1) rotate(0); opacity: 1; } 28% { transform: scale(1.16) rotate(-4deg); opacity: 1; } 100% { transform: scale(0.55) rotate(9deg); opacity: 0; } }
  @keyframes env-out { to { opacity: 0; } }
`;

// A publikus oldal <head>-jébe: egyszer/munkamenet és csökkentett mozgás kezelése a legelső
// kirajzolás előtt (különben villanna az oldal).
export function envelopeHeadScript(slug) {
  return `<script>
  (function () {
    var h = document.documentElement;
    try {
      if (sessionStorage.getItem(${JSON.stringify("wc_env_" + slug)}) || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) h.classList.add("wc-env-skip");
      else h.classList.add("wc-env-lock");
    } catch (e) {}
  })();
</script>
<noscript><style>#wc-env { display: none !important; }</style></noscript>`;
}

// Futtató kód (klasszikus script): window.wcEnvelopeInit(root, { key, preview })
export const envelopeRuntime = `<script>
  window.wcEnvelopeInit = function (root, opts) {
    opts = opts || {};
    var opened = false;
    function finish() {
      if (root.parentNode) root.parentNode.removeChild(root);
      document.documentElement.classList.remove("wc-env-lock");
      document.dispatchEvent(new Event("wc-env-done"));
    }
    function open(fast) {
      if (opened) return;
      opened = true;
      if (!opts.preview && opts.key) { try { sessionStorage.setItem(opts.key, "1"); } catch (e) {} }
      root.classList.add(fast ? "env-fast" : "env-opening");
      setTimeout(finish, fast ? 350 : 1900);
    }
    var btn = root.querySelector(".env-open");
    btn.addEventListener("click", function () { open(false); });
    root.querySelector(".env-skip").addEventListener("click", function (e) { e.stopPropagation(); open(true); });
    try { btn.focus({ preventScroll: true }); } catch (e) {}
  };
</script>`;
