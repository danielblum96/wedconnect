import { escapeHtml } from "./html.js";
import { dividerGlyph } from "./dividers.js";

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
  // Szándékosan NINCS benne beágyazott függvény/nyíl-függvény: a csomagoló (esbuild) oda __name() hívást szúrna,
  // ami a kliensen (a .toString()-ből újraépített kódban) nem létezik.
  var firstHex = (String(bg || "").match(/#[0-9a-fA-F]{6}/) || ["#ffffff"])[0];
  var inputs = [accent, firstHex];
  var rgbs = [];
  var lums = [];
  var chromas = [];
  for (var i = 0; i < 2; i++) {
    var h = String(inputs[i] || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var c = isNaN(n) || h.length !== 6 ? [176, 141, 87] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbs.push(c);
    lums.push((0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255);
    chromas.push(Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]));
  }
  var a = rgbs[0];
  var b = rgbs[1];
  var neutral = chromas[0] < 30;
  var darkBg = lums[1] < 0.35;
  // Papír: az oldal háttérszínéből kevert, tiszta árnyalat (világos háttérnél világosabb, sötétnél kissé világosabb), a
  // kiemelő szín enyhe beütésével, hogy a boríték az adott párhoz tartozzon (ne legyen általános bézs).
  var t1 = darkBg ? 0.1 : 0.6;
  var t2 = darkBg ? 0.05 : 0.38;
  var p1 = "#";
  var p2 = "#";
  for (var k = 0; k < 3; k++) {
    var m1 = Math.round(b[k] * (1 - t1) + 255 * t1);
    var m2 = Math.round(b[k] * (1 - t2) + 255 * t2);
    if (!darkBg) m2 = Math.round(m2 * 0.9 + a[k] * 0.1);
    p1 += ("0" + m1.toString(16)).slice(-2);
    p2 += ("0" + m2.toString(16)).slice(-2);
  }
  var orn = darkBg ? "#d4b672" : "#b8955a"; // arany fóliavonal
  var seal = neutral ? (darkBg ? "#c9a56a" : "#8f2e42") : accent;
  var sh = String(seal).replace("#", "");
  var sn = parseInt(sh, 16);
  var sl = isNaN(sn) || sh.length !== 6 ? 0.4 : (0.2126 * ((sn >> 16) & 255) + 0.7152 * ((sn >> 8) & 255) + 0.0722 * (sn & 255)) / 255;
  return { orn: orn, seal: seal, sealFg: sl > 0.5 ? "#3b2a12" : "#fbf1dc", paper: p1, paper2: p2 };
}

export function paletteStyleAttr(style) {
  const p = envelopePalette(style.accent, style.bg);
  return `--env-orn:${p.orn};--env-seal:${p.seal};--env-seal-fg:${p.sealFg};--env-paper:${p.paper};--env-paper2:${p.paper2}`;
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

const PETALS = Array.from({ length: 10 }, (_, i) => {
  const x = (i * 43 + 9) % 100;
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

export function envelopeMarkup({ monogram, copy, style, names = "", dateText = "", fontCss = "", photo = null, dividerKey = "ag", message = "" }) {
  const pal = style ? ` style="${paletteStyleAttr(style)}"` : "";
  const glyph = dividerKey && dividerKey !== "nincs" ? dividerGlyph(dividerKey) : "";
  const photoHtml = photo ? `<img class="env-card-photo" src="${escapeHtml(photo.src)}" alt="" style="object-position:${photo.x}% ${photo.y}%">` : "";
  return `<div id="wc-env"${pal} role="dialog" aria-modal="true" aria-label="${escapeHtml(copy.envelopeLabel)}">
  <div class="env-petals" aria-hidden="true">${PETALS}</div>
  <div class="env-stage">
    <div class="env-box">
      <div class="env-back env-paper"></div>
      <div class="env-card${photo ? " has-photo" : ""}">
        <div class="env-card-page" aria-hidden="true"></div>
        ${photoHtml}
        <div class="env-card-in">
          <div class="env-card-names" style="${escapeHtml(fontCss)}">${escapeHtml(names)}</div>
          <div class="env-card-date">${escapeHtml(dateText)}</div>
          <div class="env-card-glyph" aria-hidden="true">${glyph}</div>
        </div>
      </div>
      <div class="env-front env-front-l env-paper"></div>
      <div class="env-front env-front-r env-paper"></div>
      <div class="env-front env-front-b env-paper"></div>
      ${ENV_LINES}
      <div class="env-names" style="${escapeHtml(fontCss)}" aria-hidden="true">${escapeHtml(names)}</div>
      <div class="env-sprig" aria-hidden="true">${SPRIG}</div>
      <div class="env-flap">
        <div class="env-flap-f env-paper"></div>
        <svg class="env-flap-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path vector-effect="non-scaling-stroke" d="M0 0 L50 100 L100 0" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>
        <div class="env-flap-b"></div>
      </div>
      <div class="env-seal" aria-hidden="true">${WAX_SVG}<span class="env-mono">${monogram}</span></div>
    </div>
    <div class="env-invite">
      <div class="env-message"${message ? "" : " hidden"}>${escapeHtml(message)}</div>
      <div class="env-hint" aria-hidden="true">${escapeHtml(copy.envelopeHint)}</div>
    </div>
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
  #wc-env .env-stage { --ew: min(calc(100vw - 40px), 640px); --eh: min(calc(var(--ew) * 0.7), 46vh); position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
  @media (max-width: 699px) { #wc-env .env-stage { --eh: min(calc(var(--ew) * 0.95), 56vh); } }
  #wc-env .env-box { position: relative; width: var(--ew); height: var(--eh); perspective: 1600px; box-shadow: 0 22px 30px -6px rgba(40,25,10,0.34); }
  #wc-env .env-paper { background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='p' x='0' y='0' width='100%' height='100%'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.03 .045' numOctaves='4' seed='3' result='n'/%3E%3CfeDiffuseLighting in='n' lighting-color='%23fff' surfaceScale='1.5'%3E%3CfeDistantLight azimuth='225' elevation='58'/%3E%3C/feDiffuseLighting%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 .32  0 0 0 0 .27  0 0 0 0 .22  -.26 0 0 0 .24'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23p)'/%3E%3C/svg%3E"), radial-gradient(ellipse at 26% 16%, rgba(255,255,255,0.32), transparent 62%), linear-gradient(205deg, transparent 52%, rgba(70,50,30,0.075)), linear-gradient(160deg, var(--env-paper, var(--bg)), var(--env-paper2, var(--bg))); }
  #wc-env .env-back { position: absolute; inset: 0; z-index: 0; border-radius: 3px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.75), inset 1px 0 0 rgba(255,255,255,0.5), inset 0 -1.5px 2px rgba(70,50,30,0.10), inset -1px 0 1px rgba(70,50,30,0.06); }
  #wc-env .env-front { position: absolute; inset: 0; z-index: 3; }
  #wc-env .env-front-l { clip-path: polygon(0 0, 50% 52%, 0 100%); border-radius: 3px 0 0 3px; background: linear-gradient(90deg, rgba(255,255,255,0.5), transparent 3.5%), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='p' x='0' y='0' width='100%' height='100%'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.03 .045' numOctaves='4' seed='3' result='n'/%3E%3CfeDiffuseLighting in='n' lighting-color='%23fff' surfaceScale='1.5'%3E%3CfeDistantLight azimuth='225' elevation='58'/%3E%3C/feDiffuseLighting%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 .32  0 0 0 0 .27  0 0 0 0 .22  -.26 0 0 0 .24'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23p)'/%3E%3C/svg%3E"), radial-gradient(ellipse at 26% 16%, rgba(255,255,255,0.32), transparent 62%), linear-gradient(205deg, transparent 52%, rgba(70,50,30,0.075)), linear-gradient(160deg, var(--env-paper, var(--bg)), var(--env-paper2, var(--bg))); }
  #wc-env .env-front-r { clip-path: polygon(100% 0, 50% 52%, 100% 100%); border-radius: 0 3px 3px 0; background: linear-gradient(270deg, rgba(70,50,30,0.09), transparent 3.5%), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='p' x='0' y='0' width='100%' height='100%'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.03 .045' numOctaves='4' seed='3' result='n'/%3E%3CfeDiffuseLighting in='n' lighting-color='%23fff' surfaceScale='1.5'%3E%3CfeDistantLight azimuth='225' elevation='58'/%3E%3C/feDiffuseLighting%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 .32  0 0 0 0 .27  0 0 0 0 .22  -.26 0 0 0 .24'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23p)'/%3E%3C/svg%3E"), radial-gradient(ellipse at 26% 16%, rgba(255,255,255,0.32), transparent 62%), linear-gradient(205deg, transparent 52%, rgba(70,50,30,0.075)), linear-gradient(160deg, var(--env-paper, var(--bg)), var(--env-paper2, var(--bg))); }
  #wc-env .env-front-b { clip-path: polygon(0 100%, 50% 50%, 100% 100%); border-radius: 0 0 3px 3px; background: linear-gradient(0deg, rgba(70,50,30,0.12), transparent 4.5%), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='p' x='0' y='0' width='100%' height='100%'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.03 .045' numOctaves='4' seed='3' result='n'/%3E%3CfeDiffuseLighting in='n' lighting-color='%23fff' surfaceScale='1.5'%3E%3CfeDistantLight azimuth='225' elevation='58'/%3E%3C/feDiffuseLighting%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 .32  0 0 0 0 .27  0 0 0 0 .22  -.26 0 0 0 .24'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23p)'/%3E%3C/svg%3E"), radial-gradient(ellipse at 26% 16%, rgba(255,255,255,0.32), transparent 62%), linear-gradient(205deg, transparent 52%, rgba(70,50,30,0.075)), linear-gradient(160deg, var(--env-paper, var(--bg)), var(--env-paper2, var(--bg))); }
  #wc-env .env-lines { position: absolute; inset: 0; z-index: 3; width: 100%; height: 100%; pointer-events: none; color: var(--env-orn, var(--accent)); opacity: 0.7; filter: drop-shadow(0 1px 0 rgba(255,255,255,0.65)) drop-shadow(0 -0.6px 0 rgba(70,50,30,0.14)); }
  #wc-env .env-sprig { position: absolute; z-index: 3; left: 50%; bottom: 4.5%; width: min(24%, 108px); transform: translateX(-50%); color: var(--env-orn, var(--accent)); opacity: 0.9; pointer-events: none; filter: drop-shadow(0 1px 0 rgba(255,255,255,0.55)); }
  #wc-env .env-sprig svg { display: block; width: 100%; height: auto; }
  #wc-env .env-names { position: absolute; z-index: 3; left: 50%; bottom: 15%; transform: translateX(-50%); width: 56%; text-align: center; font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: clamp(1.35rem, 4.2vw, 1.9rem); line-height: 1.1; color: var(--fg); text-shadow: 0 1px 0 rgba(255,255,255,0.55); pointer-events: none; overflow-wrap: anywhere; }
  #wc-env .env-card { position: absolute; z-index: 2; left: 5%; right: 5%; top: 6%; height: calc(var(--eh) * 0.88); background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='p' x='0' y='0' width='100%' height='100%'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.03 .045' numOctaves='4' seed='3' result='n'/%3E%3CfeDiffuseLighting in='n' lighting-color='%23fff' surfaceScale='1.5'%3E%3CfeDistantLight azimuth='225' elevation='58'/%3E%3C/feDiffuseLighting%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 .32  0 0 0 0 .27  0 0 0 0 .22  -.26 0 0 0 .24'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23p)'/%3E%3C/svg%3E"), var(--env-paper, var(--bg)); box-shadow: 0 6px 18px rgba(40,25,10,0.22); border: 1px solid var(--env-orn, var(--accent)); display: flex; flex-direction: column; overflow: hidden; }
  #wc-env .env-card::before { content: ""; position: absolute; inset: 5px; border: 1px solid var(--env-orn, var(--accent)); opacity: 0.45; pointer-events: none; z-index: 2; }
  #wc-env .env-card-photo { flex: none; display: block; width: calc(100% - 14px); height: 50%; margin: 7px 7px 0; object-fit: cover; }
  #wc-env .env-card-in { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6px 12px 10px; min-height: 0; }
  #wc-env .env-card-names { font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: clamp(1.5rem, 4.8vw, 2.4rem); line-height: 1.08; color: var(--fg); overflow-wrap: anywhere; }
  #wc-env .env-card-date { margin-top: 4px; font: italic 500 1.05rem "Cormorant Garamond", serif; letter-spacing: 0.05em; color: var(--accent-text); }
  #wc-env .env-card-glyph { width: min(36%, 100px); margin-top: 6px; color: var(--env-orn, var(--accent)); opacity: 0.9; }
  #wc-env .env-card-glyph svg { display: block; width: 100%; height: auto; }
  #wc-env .env-card:not(.has-photo) .env-card-in { padding-top: clamp(14px, 5vh, 34px); justify-content: flex-start; }
  #wc-env .env-card:not(.has-photo) .env-card-names { font-size: clamp(1.8rem, 5.6vw, 2.8rem); }
  #wc-env .env-flap { position: absolute; left: 0; top: 0; width: 100%; height: 58%; z-index: 4; transform-origin: 50% 0; transform: rotateX(0deg); transform-style: preserve-3d; }
  #wc-env .env-flap-f, #wc-env .env-flap-b { position: absolute; inset: 0; clip-path: polygon(0 0, 100% 0, 50% 100%); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  #wc-env .env-flap-line { position: absolute; inset: 0; width: 100%; height: 100%; color: var(--env-orn, var(--accent)); opacity: 0.6; backface-visibility: hidden; -webkit-backface-visibility: hidden; pointer-events: none; }
  #wc-env .env-flap-b { transform: rotateX(180deg); background: var(--bg); background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--env-orn, var(--accent)) 45%, transparent) 0.9px, transparent 1.6px) 0 0 / 13px 13px, linear-gradient(180deg, color-mix(in srgb, var(--env-seal, var(--accent)) 26%, var(--bg)), color-mix(in srgb, var(--env-seal, var(--accent)) 12%, var(--bg))); }
  #wc-env .env-seal { position: absolute; left: 50%; top: 58%; z-index: 6; width: 110px; height: 110px; margin: -55px 0 0 -55px; display: flex; align-items: center; justify-content: center; pointer-events: none; animation: env-float 3s ease-in-out infinite; }
  #wc-env .env-seal::before, #wc-env .env-seal::after { content: ""; position: absolute; inset: 8px; border-radius: 50%; border: 1px solid var(--env-orn, var(--accent)); opacity: 0; pointer-events: none; animation: env-ripple 3.2s ease-out infinite; }
  #wc-env .env-seal::after { animation-delay: 1.6s; }
  #wc-env .env-wax { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 8px 8px rgba(30,15,5,0.42)); }
  #wc-env .env-mono { position: relative; font-family: "Great Vibes", "Cormorant Garamond", cursive; font-style: normal; font-weight: 400; font-size: 2.2rem; line-height: 1; color: var(--env-seal-fg, var(--btn-fg)); text-shadow: 0 1px 0 rgba(255,255,255,0.25), 0 -1px 0 rgba(0,0,0,0.38); white-space: nowrap; padding-bottom: 3px; }
  #wc-env .env-mono i { font-style: normal; font-size: 0.72em; margin: 0 -1px; opacity: 0.9; }
  #wc-env .env-invite { margin-top: 22px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  #wc-env .env-message { font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: clamp(1.9rem, 6.2vw, 2.6rem); line-height: 1.1; color: var(--fg); text-shadow: 0 1px 0 rgba(255,255,255,0.45); padding: 0 12px; }
  #wc-env .env-message[hidden] { display: none; }
  #wc-env .env-hint { font: italic 500 1.05rem/1.2 "Cormorant Garamond", serif; letter-spacing: 0.05em; color: var(--fg); opacity: 0.8; animation: env-pulse 2.8s ease-in-out infinite; }
  #wc-env .env-open { position: absolute; inset: 0; z-index: 7; width: 100%; background: none; border: 0; padding: 0; cursor: pointer; outline: none; }
  #wc-env .env-open:focus-visible ~ .env-skip { opacity: 1; }
  #wc-env .env-skip { position: absolute; left: 50%; bottom: max(22px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 8; background: none; border: 0; padding: 10px 14px; cursor: pointer; font: 500 0.7rem "Poppins", sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fg); opacity: 0.7; }
  #wc-env .env-petals { position: absolute; inset: 0; z-index: 5; pointer-events: none; overflow: hidden; }
  #wc-env .env-petal { position: absolute; top: -4%; left: var(--x); width: 11px; height: 15px; border-radius: 70% 0 70% 0; background: #efc3c6; opacity: 0; transform: scale(var(--s)); }
  #wc-env .env-petal.alt { background: var(--env-orn, var(--accent)); }
  /* Nyitás: pecsét megtörik -> fedél felnyílik -> a kártya kicsúszik -> a boríték feloldódik, előbukkan az oldal */
  /* A háttér a nyitás végéig TELJESEN ér (a gradiens hátterek nem animálhatók), csak a legvégén oldódik fel az egész boríték együtt. */
  #wc-env.env-opening .env-seal { animation: env-seal-break 0.55s ease-out forwards; }
  #wc-env.env-opening .env-invite { opacity: 0; transition: opacity 0.3s; }
  #wc-env.env-opening .env-seal::before, #wc-env.env-opening .env-seal::after { animation: none; }
  #wc-env.env-opening .env-skip { opacity: 0; transition: opacity 0.25s; }
  #wc-env.env-opening .env-flap { animation: env-flap 1.05s cubic-bezier(0.5, 0, 0.25, 1) 0.4s forwards; }
  #wc-env.env-opening .env-card { animation: env-card 1.15s cubic-bezier(0.25, 0.8, 0.25, 1) 1.3s forwards; }
  /* A boríték kártyája az oldal ÉLŐ másolata: kicsúszás után a valódi oldal helyére repül, majd az egész jelenet feloldódik. */
  #wc-env .env-card-page { position: absolute; left: 0; top: 0; width: var(--ew); transform: scale(0.9); transform-origin: 0 0; pointer-events: none; }
  #wc-env .env-card.has-clone { border: 0; }
  #wc-env .env-card.has-clone::before, #wc-env .env-card.has-clone .env-card-photo, #wc-env .env-card.has-clone .env-card-in { display: none; }
  #wc-env .env-fly { position: fixed; left: 0; top: 0; z-index: 9; transform-origin: 0 0; overflow: hidden; pointer-events: none; }
  #wc-env .env-fly-paper { position: absolute; inset: 0; z-index: 0; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='p' x='0' y='0' width='100%' height='100%'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.03 .045' numOctaves='4' seed='3' result='n'/%3E%3CfeDiffuseLighting in='n' lighting-color='%23fff' surfaceScale='1.5'%3E%3CfeDistantLight azimuth='225' elevation='58'/%3E%3C/feDiffuseLighting%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 .32  0 0 0 0 .27  0 0 0 0 .22  -.26 0 0 0 .24'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23p)'/%3E%3C/svg%3E"), var(--env-paper, var(--bg)); }
  #wc-env .env-fly > .card { position: relative; z-index: 1; }
  #wc-env.env-opening .env-stage { transform: translateY(7vh); transition: transform 1.1s cubic-bezier(0.4, 0, 0.2, 1) 0.2s; }
  #wc-env.env-flying .env-stage { opacity: 0; transition: opacity 0.8s ease 0.1s; }
  #wc-env.env-leaving { animation: env-root-out 0.6s ease forwards; }
  #wc-env.env-opening .env-petal { animation: env-petal 3.6s ease-in calc(1.5s + var(--d)) forwards; }
  #wc-env.env-opening, #wc-env.env-fast { pointer-events: none; }
  #wc-env.env-fast { opacity: 0; transition: opacity 0.3s ease; }
  @keyframes env-flap { 0% { transform: rotateX(0deg); z-index: 4; } 49% { z-index: 4; } 50% { z-index: 1; } 100% { transform: rotateX(180deg); z-index: 1; } }
  @keyframes env-ripple { 0% { transform: scale(0.9); opacity: 0.5; } 100% { transform: scale(1.9); opacity: 0; } }
  @keyframes env-root-out { to { opacity: 0; } }
  @keyframes env-card { to { transform: translateY(calc(var(--eh) * -0.74)); height: calc(var(--eh) * 1.18); } }
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
<noscript><style>#wc-env, #wc-veil { display: none !important; }</style></noscript>`;
}

// Futtató kód (klasszikus script): window.wcEnvelopeInit(root, { key, preview })
export const envelopeRuntime = `<script>
  window.wcEnvelopeInit = function (root, opts) {
    opts = opts || {};
    var opened = false;
    var src = opts.card !== undefined ? opts.card : document.querySelector(".card");
    var target = opts.target || document.querySelector(".card");
    var envCard = root.querySelector(".env-card");
    var holder = root.querySelector(".env-card-page");
    var clone = null;
    // A kicsúszó kártya az oldal tényleges tetejének élő másolata (ugyanaz a fotó, betű, keret, dátum).
    if (src && holder && envCard) {
      clone = src.cloneNode(true);
      clone.classList.add("env-clone");
      clone.setAttribute("aria-hidden", "true");
      [].forEach.call(clone.querySelectorAll("[id]"), function (e) { e.removeAttribute("id"); });
      [].forEach.call(clone.querySelectorAll("script"), function (e) { e.parentNode.removeChild(e); });
      [].forEach.call(clone.querySelectorAll(".reveal, .cover-wrap"), function (e) { e.classList.add("in"); });
      holder.appendChild(clone);
      envCard.classList.add("has-clone");
    }
    function finish() {
      if (root.parentNode) root.parentNode.removeChild(root);
      document.documentElement.classList.remove("wc-env-lock");
      document.dispatchEvent(new Event("wc-env-done"));
    }
    function leave(delay) {
      setTimeout(function () { root.classList.add("env-leaving"); setTimeout(finish, 650); }, delay);
    }
    // A másolat a kicsúszott helyéről a valódi oldal kártyájának helyére repül (az oldal ugyanott van alatta).
    function fly() {
      if (!clone || !target) return false;
      var page = clone.getBoundingClientRect(), t = target.getBoundingClientRect(), ec = envCard.getBoundingClientRect();
      if (!page.width || !t.width) return false;
      var s0 = page.width / t.width;
      var fl = document.createElement("div");
      fl.className = "env-fly";
      fl.style.width = t.width + "px";
      fl.style.height = (ec.height / s0) + "px";
      var start = "translate(" + page.left + "px," + page.top + "px) scale(" + s0 + ")";
      fl.style.transform = start;
      var paper = document.createElement("div");
      paper.className = "env-fly-paper";
      fl.appendChild(paper);
      fl.appendChild(clone);
      root.appendChild(fl);
      envCard.style.visibility = "hidden";
      root.classList.add("env-flying");
      var endH = Math.max(ec.height / s0, window.innerHeight - t.top);
      var opt = { duration: 950, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" };
      fl.animate([{ transform: start, height: (ec.height / s0) + "px" }, { transform: "translate(" + t.left + "px," + t.top + "px) scale(1)", height: endH + "px" }], opt);
      paper.animate([{ opacity: 1 }, { opacity: 0 }], opt);
      return true;
    }
    function open(fast) {
      if (opened) return;
      opened = true;
      if (!opts.preview && opts.key) { try { sessionStorage.setItem(opts.key, "1"); } catch (e) {} }
      if (fast) {
        root.classList.add("env-fast");
        setTimeout(finish, 350);
        return;
      }
      root.classList.add("env-opening");
      setTimeout(function () {
        if (fly()) {
          setTimeout(function () { document.dispatchEvent(new Event("wc-env-land")); }, 950);
          leave(980);
        } else {
          leave(0);
        }
      }, 2500);
    }
    var btn = root.querySelector(".env-open");
    btn.addEventListener("click", function () { open(false); });
    root.querySelector(".env-skip").addEventListener("click", function (e) { e.stopPropagation(); open(true); });
    try { btn.focus({ preventScroll: true }); } catch (e) {}
  };
</script>`;
