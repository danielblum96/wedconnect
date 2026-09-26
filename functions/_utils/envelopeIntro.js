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

// Egy szárny díszítése (a bal szárny rajza; a jobb ennek tükörképe). A két szárny találkozásánál
// (x=200) a virág fele-fele, így középen egésznek látszik.
const WING_ORNAMENT = `<svg class="env-orn" viewBox="0 0 200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
    <rect x="12" y="12" width="200" height="676" rx="8" opacity="0.7"/>
    <rect x="21" y="21" width="191" height="658" rx="6" opacity="0.45"/>
    <path d="M22 130 C22 66 66 22 130 22"/>
    <path d="M36 130 C36 76 76 36 130 36" opacity="0.7"/>
    <path d="M30 86 C40 70 56 56 76 48 C64 64 58 72 52 96" opacity="0.8"/>
    <path d="M34 150 C58 230 118 300 200 345"/>
    <path d="M46 150 C70 226 124 288 200 330" opacity="0.6"/>
    <path d="M34 550 C58 470 118 400 200 355"/>
    <path d="M46 550 C70 474 124 412 200 370" opacity="0.6"/>
    <path d="M22 570 C22 634 66 678 130 678"/>
    <path d="M36 570 C36 624 76 664 130 664" opacity="0.7"/>
    <g transform="translate(200 62)"><ellipse rx="7" ry="26" transform="rotate(-72) translate(0 -22)"/><ellipse rx="7" ry="26" transform="rotate(-48) translate(0 -22)"/><ellipse rx="7" ry="26" transform="rotate(-24) translate(0 -22)"/><ellipse rx="7" ry="26" transform="translate(0 -22)"/><circle r="5"/></g>
    <g transform="translate(200 638) rotate(180)"><ellipse rx="7" ry="26" transform="rotate(-72) translate(0 -22)"/><ellipse rx="7" ry="26" transform="rotate(-48) translate(0 -22)"/><ellipse rx="7" ry="26" transform="rotate(-24) translate(0 -22)"/><ellipse rx="7" ry="26" transform="translate(0 -22)"/><circle r="5"/></g>
    <g transform="translate(34 350)"><ellipse rx="6" ry="24" transform="rotate(48) translate(0 -20)"/><ellipse rx="6" ry="24" transform="rotate(72) translate(0 -20)"/><ellipse rx="6" ry="24" transform="rotate(96) translate(0 -20)"/><ellipse rx="6" ry="24" transform="rotate(120) translate(0 -20)"/><ellipse rx="6" ry="24" transform="rotate(144) translate(0 -20)"/><circle r="4.5"/></g>
  </g>
</svg>`;

// A borító jelölése. Az `id="wc-env"` egyedi: a publikus oldalon közvetlenül a body elején áll
// (az első kirajzolástól takar), a szerkesztőben egy <template>-ben.
export function envelopeMarkup({ monogram, copy }) {
  return `<div id="wc-env" role="dialog" aria-modal="true" aria-label="${escapeHtml(copy.envelopeLabel)}">
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
  #wc-env .env-wing { position: absolute; top: 0; bottom: 0; width: 50%; overflow: hidden; background: linear-gradient(90deg, rgba(0,0,0,0.05), rgba(255,255,255,0.07)), var(--bg); backface-visibility: hidden; will-change: transform; transition: transform 1.05s cubic-bezier(0.65, 0.05, 0.25, 1) 0.45s; }
  #wc-env .env-wing-l { left: 0; transform-origin: 0 50%; box-shadow: inset -12px 0 20px -14px rgba(0,0,0,0.35); }
  #wc-env .env-wing-r { right: 0; transform-origin: 100% 50%; box-shadow: inset 12px 0 20px -14px rgba(0,0,0,0.35); }
  #wc-env .env-wing-r .env-orn { transform: scaleX(-1); }
  #wc-env .env-orn { position: absolute; inset: 0; width: 100%; height: 100%; color: var(--accent); opacity: 0.6; filter: drop-shadow(1px 1px 0 rgba(255,255,255,0.4)) drop-shadow(-1px -1px 0 rgba(0,0,0,0.18)); }
  #wc-env .env-open { position: absolute; inset: 0; z-index: 2; width: 100%; background: none; border: 0; padding: 0; cursor: pointer; }
  #wc-env .env-seal { position: absolute; left: 50%; top: 50%; z-index: 3; width: 96px; height: 96px; margin: -48px 0 0 -48px; display: flex; align-items: center; justify-content: center; pointer-events: none;
    border-radius: 52% 48% 54% 46% / 47% 55% 45% 53%;
    background: var(--accent);
    background: radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--accent) 62%, #fff) 0, var(--accent) 48%, color-mix(in srgb, var(--accent) 62%, #000) 100%);
    box-shadow: 0 10px 20px rgba(0,0,0,0.35), inset 0 -4px 8px rgba(0,0,0,0.28), inset 0 3px 6px rgba(255,255,255,0.35);
    animation: env-float 3s ease-in-out infinite; }
  #wc-env .env-seal::before { content: ""; position: absolute; inset: 9px; border-radius: 50%; border: 1.5px solid var(--btn-fg); opacity: 0.35; }
  #wc-env .env-mono { position: relative; font: italic 600 1.55rem/1 "Cormorant Garamond", serif; color: var(--btn-fg); text-shadow: 0 1px 0 rgba(255,255,255,0.25), 0 -1px 0 rgba(0,0,0,0.3); white-space: nowrap; }
  #wc-env .env-mono i { font-size: 0.8em; opacity: 0.85; margin: 0 1px; }
  #wc-env .env-hint { position: absolute; left: 0; right: 0; top: calc(50% + 76px); z-index: 3; pointer-events: none; font: 600 0.74rem "Poppins", sans-serif; letter-spacing: 0.22em; text-transform: uppercase; color: var(--fg); opacity: 0.75; animation: env-pulse 2.2s ease-in-out infinite; }
  #wc-env .env-skip { position: absolute; left: 50%; bottom: max(20px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 4; background: none; border: 0; padding: 10px 14px; cursor: pointer; font: 500 0.7rem "Poppins", sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fg); opacity: 0.6; }
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
