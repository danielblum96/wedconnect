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

// ---- A boríték ---------------------------------------------------------------------------------
// Klasszikus levélboríték, az oldal kártyájával megegyező szélességben (max. 640 px): hátlap, a két
// oldalsó és az alsó zseb-háromszög, felnyíló fedél (3D), viaszpecsét a fedél csúcsán, benne a meghívó
// kártya (nevek + dátum), ami kicsúszik. A színeket a stílus adja (--bg, --fg, --accent), a pecsét és a
// díszítés színét az envelopePalette() számolja.
// Viaszpecsét: szabálytalan, természetes szélű viasz-folt (Catmull-Rom görbe), finom szemcsés textúra,
// fényes csúcsfény, arany peremgyűrű; a monogram HTML-szöveg a tetején (Great Vibes kalligrafikus betű).
const f1 = (n) => Math.round(n * 10) / 10;
function waxPath() {
  const n = 16;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const j = 1 + 0.055 * Math.sin(i * 2.7 + 1.3) + 0.045 * Math.cos(i * 4.1) + (i === 5 ? 0.09 : 0) + (i === 11 ? 0.065 : 0);
    pts.push([50 + 44 * j * Math.cos(a), 50 + 44 * j * Math.sin(a)]);
  }
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + "Z";
}
const WAX = waxPath();
const WAX_SVG = `<svg class="env-wax" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="wxs-g" cx="0.34" cy="0.28" r="0.85">
      <stop offset="0" style="stop-color:color-mix(in srgb, var(--env-seal, var(--accent)) 58%, #fff)"/>
      <stop offset="0.5" style="stop-color:var(--env-seal, var(--accent))"/>
      <stop offset="1" style="stop-color:color-mix(in srgb, var(--env-seal, var(--accent)) 56%, #000)"/>
    </radialGradient>
    <linearGradient id="wxs-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7e8b4"/><stop offset="0.5" stop-color="#cfa651"/><stop offset="1" stop-color="#8b6a2b"/>
    </linearGradient>
    <clipPath id="wxs-clip"><path d="${WAX}"/></clipPath>
    <filter id="wxs-noise" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 -0.2"/></filter>
    <filter id="wxs-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6"/></filter>
  </defs>
  <path d="${WAX}" fill="url(#wxs-g)"/>
  <g clip-path="url(#wxs-clip)">
    <rect width="100" height="100" filter="url(#wxs-noise)" opacity="0.55"/>
    <ellipse cx="33" cy="27" rx="15" ry="8" fill="#fff" opacity="0.3" transform="rotate(-30 33 27)" filter="url(#wxs-blur)"/>
  </g>
  <circle cx="50" cy="50" r="35.4" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="0.8"/>
  <circle cx="50" cy="50" r="32.6" fill="none" stroke="url(#wxs-gold)" stroke-width="2.3"/>
  <circle cx="50" cy="50" r="29.6" fill="none" stroke="#000" stroke-opacity="0.2" stroke-width="1"/>
</svg>`;

// Visszafogott botanikai dísz: vékony ágacska váltakozó levelekkel és egy apró virággal a végén.
function sprigSvg() {
  const leaf = (x, y, ang, len) =>
    `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${ang})" d="M0 0 C${f1(len * 0.3)} ${-f1(len * 0.34)} ${f1(len * 0.8)} ${-f1(len * 0.3)} ${len} 0 C${f1(len * 0.8)} ${f1(len * 0.3)} ${f1(len * 0.3)} ${f1(len * 0.34)} 0 0Z"/>`;
  let leaves = "";
  for (let i = 0; i < 6; i++) {
    const x = 16 + i * 15;
    const y = 20 - Math.sin((i / 5) * Math.PI) * 5 + i * 0.4;
    leaves += leaf(x, y, -38, 11) + leaf(x + 6, y + 0.5, 38, 10);
  }
  const petals = [0, 72, 144, 216, 288].map((a) => `<ellipse rx="2" ry="3.4" cy="-3.2" transform="rotate(${a})"/>`).join("");
  return `<svg viewBox="0 0 130 36" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M6 21 C36 12 72 24 112 15"/></g>
    <g fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="0.7">${leaves}</g>
    <g transform="translate(119 14)" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="0.8">${petals}<circle r="1.6" fill="currentColor" stroke="none"/></g>
  </svg>`;
}
const SPRIG = sprigSvg();

const PETALS = Array.from({ length: 18 }, (_, i) => {
  const x = (i * 37 + 11) % 100;
  const dx = ((i * 53) % 90) - 45;
  const d = ((i * 29) % 12) / 10;
  const r = 200 + ((i * 71) % 400);
  const s = 0.75 + ((i * 17) % 6) / 10;
  return `<i class="env-petal${i % 3 === 0 ? " alt" : ""}" style="--x:${x}%;--dx:${dx}px;--d:${d}s;--r:${r}deg;--s:${s}"></i>`;
}).join("");

const ENV_LINES = `<svg class="env-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <g fill="none" stroke="currentColor" stroke-width="1.1" vector-effect="non-scaling-stroke" stroke-linejoin="round">
    <path vector-effect="non-scaling-stroke" d="M0 0 L50 52 L100 0"/>
    <path vector-effect="non-scaling-stroke" d="M0 100 L50 50 L100 100"/>
    <path vector-effect="non-scaling-stroke" d="M0 0 L50 52 L0 100"/>
    <path vector-effect="non-scaling-stroke" d="M100 0 L50 52 L100 100"/>
  </g>
</svg>`;

export function envelopeMarkup({ monogram, copy, style, names = "", dateText = "", fontCss = "" }) {
  const pal = style ? ` style="${paletteStyleAttr(style)}"` : "";
  return `<div id="wc-env"${pal} role="dialog" aria-modal="true" aria-label="${escapeHtml(copy.envelopeLabel)}">
  <div class="env-petals" aria-hidden="true">${PETALS}</div>
  <div class="env-stage">
    <div class="env-box">
      <div class="env-back env-paper"></div>
      <div class="env-card">
        <div class="env-card-in">
          <div class="env-card-names">${escapeHtml(names)}</div>
          <div class="env-card-date">${escapeHtml(dateText)}</div>
        </div>
      </div>
      <div class="env-front env-front-l env-paper"></div>
      <div class="env-front env-front-r env-paper"></div>
      <div class="env-front env-front-b env-paper"></div>
      ${ENV_LINES}
      <div class="env-names" aria-hidden="true">${escapeHtml(names)}</div>
      <div class="env-sprig" aria-hidden="true">${SPRIG}</div>
      <div class="env-flap">
        <div class="env-flap-f env-paper"></div>
        <svg class="env-flap-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path vector-effect="non-scaling-stroke" d="M0 0 L50 100 L100 0" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>
        <div class="env-flap-b"></div>
      </div>
      <div class="env-seal" aria-hidden="true">${WAX_SVG}<span class="env-mono">${monogram}</span></div>
    </div>
    <div class="env-hint" aria-hidden="true">${escapeHtml(copy.envelopeHint)}</div>
  </div>
  <button type="button" class="env-open" aria-label="${escapeHtml(copy.envelopeLabel)}"></button>
  <button type="button" class="env-skip">${escapeHtml(copy.envelopeSkip)}</button>
</div>`;
}

export const envelopeCss = `
  html.wc-env-skip #wc-env { display: none !important; }
  html.wc-env-lock, html.wc-env-lock body { overflow: hidden; }
  #wc-env { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding-top: 12vh; background: var(--bg); text-align: center; overflow: hidden; -webkit-tap-highlight-color: transparent; }
  #wc-env::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.2), rgba(60,40,20,0.2) 100%); }
  #wc-env * { box-sizing: border-box; }
  #wc-env .env-stage { --ew: min(calc(100vw - 40px), 640px); --eh: min(calc(var(--ew) * 0.7), 46vh); position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; transition: transform 0.95s cubic-bezier(0.4, 0, 0.2, 1) 2.3s, opacity 0.8s ease 2.5s; }
  @media (max-width: 699px) { #wc-env .env-stage { --eh: min(calc(var(--ew) * 0.95), 56vh); } }
  #wc-env .env-box { position: relative; width: var(--ew); height: var(--eh); filter: drop-shadow(0 24px 26px rgba(40,25,10,0.34)); }
  #wc-env .env-paper { background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .42 0 0 0 0 .33 0 0 0 0 .22 0 0 0 .5 -.14'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='420'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.012' numOctaves='3' seed='7'/%3E%3CfeColorMatrix values='0 0 0 0 .45 0 0 0 0 .34 0 0 0 0 .22 0 0 0 .4 -.12'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23m)'/%3E%3C/svg%3E"), repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(120,90,50,0.022) 0 1px, transparent 1px 3px), linear-gradient(160deg, rgba(150,110,60,0.10), rgba(120,90,50,0.20)), var(--bg); }
  #wc-env .env-back { position: absolute; inset: 0; z-index: 0; border-radius: 3px; }
  #wc-env .env-front { position: absolute; inset: 0; z-index: 3; }
  #wc-env .env-front-l { clip-path: polygon(0 0, 50% 52%, 0 100%); border-radius: 3px 0 0 3px; }
  #wc-env .env-front-r { clip-path: polygon(100% 0, 50% 52%, 100% 100%); border-radius: 0 3px 3px 0; }
  #wc-env .env-front-b { clip-path: polygon(0 100%, 50% 50%, 100% 100%); border-radius: 0 0 3px 3px; }
  #wc-env .env-lines { position: absolute; inset: 0; z-index: 3; width: 100%; height: 100%; pointer-events: none; color: var(--env-orn, var(--accent)); opacity: 0.7; filter: drop-shadow(0 1px 0 rgba(255,255,255,0.6)); }
  #wc-env .env-sprig { position: absolute; z-index: 3; left: 50%; bottom: 4.5%; width: min(24%, 108px); transform: translateX(-50%); color: var(--env-orn, var(--accent)); opacity: 0.9; pointer-events: none; filter: drop-shadow(0 1px 0 rgba(255,255,255,0.55)); }
  #wc-env .env-sprig svg { display: block; width: 100%; height: auto; }
  #wc-env .env-names { position: absolute; z-index: 3; left: 50%; bottom: 15%; transform: translateX(-50%); width: 56%; text-align: center; font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: clamp(1.4rem, 4.4vw, 2rem); line-height: 1.1; color: color-mix(in srgb, var(--fg) 82%, var(--env-seal, var(--accent))); text-shadow: 0 1px 0 rgba(255,255,255,0.55); pointer-events: none; overflow-wrap: anywhere; }
  #wc-env .env-card { position: absolute; z-index: 2; left: 5%; right: 5%; top: 6%; bottom: 6%; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .42 0 0 0 0 .33 0 0 0 0 .22 0 0 0 .5 -.14'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"), var(--bg); box-shadow: 0 6px 18px rgba(40,25,10,0.22); border: 1px solid var(--env-orn, var(--accent)); display: flex; align-items: flex-start; justify-content: center; }
  #wc-env .env-card::before { content: ""; position: absolute; inset: 6px; border: 1px solid var(--env-orn, var(--accent)); opacity: 0.4; pointer-events: none; }
  #wc-env .env-card-in { padding-top: clamp(14px, 4vh, 34px); padding-inline: 10px; }
  #wc-env .env-card-names { font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: clamp(1.7rem, 5.6vw, 2.6rem); line-height: 1.1; color: var(--fg); overflow-wrap: anywhere; }
  #wc-env .env-card-date { margin-top: 6px; font: italic 500 1.1rem "Cormorant Garamond", serif; letter-spacing: 0.05em; color: var(--accent-text); }
  #wc-env .env-flap { position: absolute; left: 0; top: 0; width: 100%; height: 58%; z-index: 4; transform-origin: 50% 0; transform: perspective(1600px) rotateX(0deg); transform-style: preserve-3d; }
  #wc-env .env-flap-f, #wc-env .env-flap-b { position: absolute; inset: 0; clip-path: polygon(0 0, 100% 0, 50% 100%); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  #wc-env .env-flap-line { position: absolute; inset: 0; width: 100%; height: 100%; color: var(--env-orn, var(--accent)); opacity: 0.6; backface-visibility: hidden; -webkit-backface-visibility: hidden; pointer-events: none; }
  #wc-env .env-flap-b { transform: rotateX(180deg); background: var(--bg); background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--env-orn, var(--accent)) 45%, transparent) 0.9px, transparent 1.6px) 0 0 / 13px 13px, linear-gradient(180deg, color-mix(in srgb, var(--env-seal, var(--accent)) 26%, var(--bg)), color-mix(in srgb, var(--env-seal, var(--accent)) 12%, var(--bg))); }
  #wc-env .env-seal { position: absolute; left: 50%; top: 58%; z-index: 6; width: 102px; height: 102px; margin: -51px 0 0 -51px; display: flex; align-items: center; justify-content: center; pointer-events: none; animation: env-float 3s ease-in-out infinite; }
  #wc-env .env-wax { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 8px 8px rgba(30,15,5,0.42)); }
  #wc-env .env-mono { position: relative; font-family: "Great Vibes", "Cormorant Garamond", cursive; font-style: normal; font-weight: 400; font-size: 2.05rem; line-height: 1; color: var(--env-seal-fg, var(--btn-fg)); text-shadow: 0 1px 0 rgba(255,255,255,0.25), 0 -1px 0 rgba(0,0,0,0.38); white-space: nowrap; padding-bottom: 3px; }
  #wc-env .env-mono i { font-style: normal; font-size: 0.72em; margin: 0 -1px; opacity: 0.9; }
  #wc-env .env-hint { margin-top: 32px; padding: 11px 30px 12px; border: 1px solid color-mix(in srgb, var(--env-orn, var(--accent)) 70%, transparent); border-radius: 999px; background: rgba(255,255,255,0.32); background: color-mix(in srgb, var(--bg) 66%, rgba(255,255,255,0.45)); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); box-shadow: 0 6px 18px rgba(60,40,20,0.12), inset 0 1px 0 rgba(255,255,255,0.7); font: italic 500 1.28rem/1.2 "Cormorant Garamond", serif; letter-spacing: 0.03em; color: var(--fg); animation: env-pulse 2.6s ease-in-out infinite; }
  #wc-env .env-open { position: absolute; inset: 0; z-index: 7; width: 100%; background: none; border: 0; padding: 0; cursor: pointer; outline: none; }
  #wc-env .env-open:focus-visible ~ .env-skip { opacity: 1; }
  #wc-env .env-skip { position: absolute; left: 50%; bottom: max(22px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 8; background: none; border: 0; padding: 10px 14px; cursor: pointer; font: 500 0.7rem "Poppins", sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fg); opacity: 0.7; }
  #wc-env .env-petals { position: absolute; inset: 0; z-index: 5; pointer-events: none; overflow: hidden; }
  #wc-env .env-petal { position: absolute; top: -4%; left: var(--x); width: 11px; height: 15px; border-radius: 70% 0 70% 0; background: #efc3c6; opacity: 0; transform: scale(var(--s)); }
  #wc-env .env-petal.alt { background: var(--env-orn, var(--accent)); }
  /* Nyitás: pecsét megtörik -> fedél felnyílik -> a kártya kicsúszik -> a boríték feloldódik, előbukkan az oldal */
  /* A háttér a nyitás végéig TELJESEN ér (a gradiens hátterek nem animálhatók), csak a legvégén oldódik fel az egész boríték együtt. */
  #wc-env.env-opening { animation: env-root-out 0.9s ease 2.4s forwards; }
  #wc-env.env-opening .env-seal { animation: env-seal-break 0.55s ease-out forwards; }
  #wc-env.env-opening .env-hint { opacity: 0; transition: opacity 0.25s; animation: none; }
  #wc-env.env-opening .env-skip { opacity: 0; transition: opacity 0.25s; }
  #wc-env.env-opening .env-flap { animation: env-flap 1.05s cubic-bezier(0.5, 0, 0.25, 1) 0.4s forwards; }
  #wc-env.env-opening .env-card { animation: env-card 1.15s cubic-bezier(0.25, 0.8, 0.25, 1) 1.3s forwards; }
  #wc-env.env-opening .env-stage { transform: scale(1.12); opacity: 0; }
  #wc-env.env-opening .env-petal { animation: env-petal 3.4s ease-in calc(1.1s + var(--d)) forwards; }
  #wc-env.env-opening, #wc-env.env-fast { pointer-events: none; }
  #wc-env.env-fast { opacity: 0; transition: opacity 0.3s ease; }
  @keyframes env-flap { 0% { transform: perspective(1600px) rotateX(0deg); z-index: 4; } 49% { z-index: 4; } 50% { z-index: 1; } 100% { transform: perspective(1600px) rotateX(180deg); z-index: 1; } }
  @keyframes env-root-out { to { opacity: 0; } }
  @keyframes env-card { to { transform: translateY(calc(var(--eh) * -0.52)); } }
  @keyframes env-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
  @keyframes env-pulse { 0%, 100% { opacity: 0.62; } 50% { opacity: 1; } }
  @keyframes env-seal-break { 0% { transform: scale(1) rotate(0); opacity: 1; } 28% { transform: scale(1.16) rotate(-4deg); opacity: 1; } 100% { transform: scale(0.55) rotate(9deg); opacity: 0; } }
  @keyframes env-petal { 0% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(var(--s)); } 12% { opacity: 0.75; } 85% { opacity: 0.6; } 100% { opacity: 0; transform: translate(var(--dx), 112vh) rotate(var(--r)) scale(var(--s)); } }
  @media (prefers-reduced-motion: reduce) { #wc-env * { animation-duration: 0.01ms !important; } }
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
      setTimeout(finish, fast ? 350 : 3400);
    }
    var btn = root.querySelector(".env-open");
    btn.addEventListener("click", function () { open(false); });
    root.querySelector(".env-skip").addEventListener("click", function (e) { e.stopPropagation(); open(true); });
    try { btn.focus({ preventScroll: true }); } catch (e) {}
  };
</script>`;
