import { escapeHtml } from "./html.js";
import { dividerGlyph } from "./dividers.js";
import { paletteStyleAttr, monogramHtml } from "./envelopeIntro.js";

// Nyitó animáció: "Függöny / fátyol". A képernyőt egy enyhén áttetsző, ráncolt anyag takarja (két félből, arany
// karnissal és gyűrűkkel), mögötte halványan látszik a pár oldala; koppintásra a két fél lassan, finoman
// összehúzódik a két szélre (mint a szétnyíló függöny), majd az egész jelenet feloldódik. Az oldal a fátyol alatt
// már kész (a görgetés-animációk ilyenkor nem várnak a nyitásra), ezért látszik mögötte a pár képe.

const uri = (svg) => `url("data:image/svg+xml,${svg.replace(/</g, "%3C").replace(/>/g, "%3E").replace(/#/g, "%23").replace(/"/g, "'")}")`;
// Finom lenszövet (nagyon alacsony átlátszatlansággal), hogy a fátyol "anyag" legyen, ne lapos sáv.
const LINEN_V = uri('<svg xmlns="http://www.w3.org/2000/svg" width="340" height="340"><filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".011 .5" numOctaves="2" seed="11"/><feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .44  0 0 0 0 .36  0 0 0 .3 -.12"/></filter><rect width="100%" height="100%" filter="url(#f)"/></svg>');
const LINEN_H = uri('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360"><filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".5 .012" numOctaves="2" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 .5  0 0 0 0 .44  0 0 0 0 .36  0 0 0 .26 -.1"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>');
const PLEATS =
  "repeating-linear-gradient(90deg, rgba(255,255,255,0.36) 0 3px, rgba(255,255,255,0.05) 3px 20px, rgba(70,50,30,0.09) 20px 27px, rgba(255,255,255,0.09) 27px 46px), repeating-linear-gradient(90deg, transparent 0 37px, rgba(255,255,255,0.14) 37px 41px, transparent 41px 83px)";
const SHEEN = "linear-gradient(180deg, rgba(255,255,255,0.3), transparent 32%, transparent 68%, rgba(70,50,30,0.12))";

export function veilMarkup({ monogram, copy, style, names = "", dateText = "", fontCss = "", dividerKey = "ag", message = "" }) {
  const pal = style ? ` style="${paletteStyleAttr(style)}"` : "";
  const glyph = dividerKey && dividerKey !== "nincs" ? dividerGlyph(dividerKey) : "";
  return `<div id="wc-veil"${pal} role="dialog" aria-modal="true" aria-label="${escapeHtml(copy.veilLabel)}">
  <div class="vl-rod" aria-hidden="true"></div>
  <div class="vl-panel vl-l" aria-hidden="true"></div>
  <div class="vl-panel vl-r" aria-hidden="true"></div>
  <div class="vl-center">
    <div class="vl-emblem" aria-hidden="true"><span class="vl-mono">${monogram}</span></div>
    <div class="vl-names" style="${escapeHtml(fontCss)}">${escapeHtml(names)}</div>
    <div class="vl-date">${escapeHtml(dateText)}</div>
    <div class="vl-glyph" aria-hidden="true">${glyph}</div>
    <div class="vl-message"${message ? "" : " hidden"}>${escapeHtml(message)}</div>
    <div class="vl-hint" aria-hidden="true">${escapeHtml(copy.veilHint)}</div>
  </div>
  <button type="button" class="vl-open" aria-label="${escapeHtml(copy.veilLabel)}"></button>
  <button type="button" class="vl-skip">${escapeHtml(copy.envelopeSkip)}</button>
</div>`;
}

export const veilCss = `
  html.wc-env-skip #wc-veil { display: none !important; }
  html.wc-env-lock, html.wc-env-lock body { overflow: hidden; }
  #wc-veil { position: fixed; inset: 0; z-index: 10000; overflow: hidden; text-align: center; -webkit-tap-highlight-color: transparent; }
  #wc-veil * { box-sizing: border-box; }
  #wc-veil .vl-panel { position: absolute; top: 0; bottom: 0; width: 50.6%; will-change: transform; z-index: 1;
    background: ${PLEATS}, ${SHEEN}, ${LINEN_V}, ${LINEN_H}, rgba(250, 246, 240, 0.62);
    background: ${PLEATS}, ${SHEEN}, ${LINEN_V}, ${LINEN_H}, color-mix(in srgb, var(--env-paper, #faf6f0) 60%, transparent);
    -webkit-backdrop-filter: blur(9px) saturate(1.08); backdrop-filter: blur(9px) saturate(1.08);
    transition: transform 2.8s cubic-bezier(0.55, 0.02, 0.18, 1); }
  #wc-veil .vl-panel::before { content: ""; position: absolute; left: 0; right: 0; top: 10px; height: 24px; z-index: 2;
    background: radial-gradient(circle at 50% 50%, transparent 5.2px, #c9a24e 5.6px, #f1dc9c 6.6px, #a4792f 7.4px, transparent 7.9px) 0 0 / 46px 24px repeat-x; }
  #wc-veil .vl-l { left: 0; transform-origin: 0 50%; box-shadow: inset -16px 0 24px -18px rgba(60, 40, 20, 0.32); }
  #wc-veil .vl-r { right: 0; transform-origin: 100% 50%; box-shadow: inset 16px 0 24px -18px rgba(60, 40, 20, 0.32); }
  #wc-veil .vl-rod { position: absolute; left: -2%; right: -2%; top: 0; height: 12px; z-index: 5; background: linear-gradient(180deg, #f6e6b0, #cfa651 48%, #8b6a2b); box-shadow: 0 5px 12px rgba(50, 30, 10, 0.28); }
  #wc-veil .vl-center { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6vh 24px 4vh; pointer-events: none; transition: opacity 0.9s ease, transform 1.3s ease; }
  #wc-veil .vl-emblem { position: relative; width: 98px; height: 98px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
    background: radial-gradient(circle at 34% 28%, rgba(255,255,255,0.85), rgba(255,255,255,0.35) 70%); border: 1.5px solid #cfa651;
    box-shadow: 0 0 0 5px rgba(255,255,255,0.28), 0 0 0 6px rgba(207,166,81,0.55), 0 10px 26px rgba(50,30,10,0.16); }
  #wc-veil .vl-emblem::before, #wc-veil .vl-emblem::after { content: ""; position: absolute; inset: -6px; border-radius: 50%; border: 1px solid #cfa651; opacity: 0; animation: vl-ripple 3.2s ease-out infinite; }
  #wc-veil .vl-emblem::after { animation-delay: 1.6s; }
  #wc-veil .vl-mono { font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: 2.3rem; line-height: 1; color: var(--fg); padding-bottom: 3px; white-space: nowrap; }
  #wc-veil .vl-mono i { font-style: normal; font-size: 0.72em; margin: 0 -1px; opacity: 0.9; }
  #wc-veil .vl-names { font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: clamp(2.3rem, 8vw, 4rem); line-height: 1.08; color: var(--fg); text-shadow: 0 0 22px var(--env-paper, #fff), 0 1px 0 rgba(255,255,255,0.5); overflow-wrap: anywhere; max-width: 90vw; }
  #wc-veil .vl-date { margin-top: 8px; font: italic 500 1.35rem "Cormorant Garamond", serif; letter-spacing: 0.05em; color: var(--accent-text); text-shadow: 0 0 14px var(--env-paper, #fff); }
  #wc-veil .vl-glyph { width: min(34vw, 120px); margin-top: 14px; color: #b8955a; opacity: 0.95; }
  #wc-veil .vl-glyph svg { display: block; width: 100%; height: auto; }
  #wc-veil .vl-message { margin-top: 16px; font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: clamp(1.8rem, 5.6vw, 2.5rem); line-height: 1.1; color: var(--fg); text-shadow: 0 0 16px var(--env-paper, #fff); }
  #wc-veil .vl-message[hidden] { display: none; }
  #wc-veil .vl-hint { margin-top: 12px; font: italic 500 1.08rem/1.2 "Cormorant Garamond", serif; letter-spacing: 0.05em; color: var(--fg); opacity: 0.85; text-shadow: 0 0 12px var(--env-paper, #fff); animation: vl-pulse 2.8s ease-in-out infinite; }
  #wc-veil .vl-open { position: absolute; inset: 0; z-index: 6; width: 100%; background: none; border: 0; padding: 0; cursor: pointer; outline: none; }
  #wc-veil .vl-skip { position: absolute; left: 50%; bottom: max(22px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 7; background: none; border: 0; padding: 10px 14px; cursor: pointer; font: 500 0.7rem "Poppins", sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fg); opacity: 0.7; text-shadow: 0 0 10px var(--env-paper, #fff); }
  /* Nyitás: a szöveg finoman elhalványul, a két fél lassan a szélekre gyűlik (a ráncok összesűrűsödnek), végül az egész feloldódik */
  #wc-veil.vl-opening .vl-center { opacity: 0; transform: translateY(-14px); }
  #wc-veil.vl-opening .vl-skip { opacity: 0; transition: opacity 0.3s; }
  #wc-veil.vl-opening .vl-l { transform: scaleX(0.13) skewY(-0.5deg); transition-delay: 0.55s; }
  #wc-veil.vl-opening .vl-r { transform: scaleX(0.13) skewY(0.5deg); transition-delay: 0.68s; }
  #wc-veil.vl-opening .vl-emblem::before, #wc-veil.vl-opening .vl-emblem::after { animation: none; }
  #wc-veil.vl-opening, #wc-veil.vl-fast { pointer-events: none; }
  #wc-veil.vl-leaving { animation: vl-out 0.8s ease forwards; }
  #wc-veil.vl-fast { opacity: 0; transition: opacity 0.4s ease; }
  @keyframes vl-ripple { 0% { transform: scale(0.92); opacity: 0.5; } 100% { transform: scale(1.7); opacity: 0; } }
  @keyframes vl-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
  @keyframes vl-out { to { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { #wc-veil * { animation-duration: 0.01ms !important; } }
`;

export const veilRuntime = `<script>
  window.wcVeilInit = function (root, opts) {
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
      if (fast) { root.classList.add("vl-fast"); setTimeout(finish, 450); return; }
      root.classList.add("vl-opening");
      setTimeout(function () { root.classList.add("vl-leaving"); }, 3500);
      setTimeout(finish, 4350);
    }
    var btn = root.querySelector(".vl-open");
    btn.addEventListener("click", function () { open(false); });
    root.querySelector(".vl-skip").addEventListener("click", function (e) { e.stopPropagation(); open(true); });
    try { btn.focus({ preventScroll: true }); } catch (e) {}
  };
</script>`;

export { monogramHtml };
