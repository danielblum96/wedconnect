import { escapeHtml } from "./html.js";
import { dividerGlyph } from "./dividers.js";
import { paletteStyleAttr, monogramHtml } from "./envelopeIntro.js";

// Nyitó animáció: "Szalag kibontása". A képernyőt egy szín-papír (mint egy becsomagolt ajándék) fedi, rajta
// egy szalag-kereszt és középen egy masni. Koppintásra a masni kioldódik, a szalag mind a négy fele
// (fel/le/balra/jobbra) szétcsúszik, majd az egész csomagolás feloldódik, és előbukkan a pár valódi oldala
// (ami a fedés alatt már készen áll, nincs külön "másolat" trükk, mert a csomagolás a teljes képernyőt fedi).

function bowSvg() {
  return `<svg class="rb-bow-svg" viewBox="0 0 200 190" aria-hidden="true" focusable="false">
    <g fill="none" stroke-linecap="round">
      <ellipse cx="66" cy="60" rx="34" ry="21" stroke="currentColor" stroke-width="17" transform="rotate(-26 66 60)"/>
      <ellipse cx="134" cy="60" rx="34" ry="21" stroke="currentColor" stroke-width="17" transform="rotate(26 134 60)"/>
      <ellipse cx="66" cy="60" rx="34" ry="21" stroke="#fff" stroke-opacity="0.32" stroke-width="4" transform="translate(-4 -4) rotate(-26 66 60)"/>
      <ellipse cx="134" cy="60" rx="34" ry="21" stroke="#fff" stroke-opacity="0.32" stroke-width="4" transform="translate(-4 -4) rotate(26 134 60)"/>
    </g>
    <g fill="currentColor">
      <path d="M92 70 L80 178 L100 160 L100 84Z"/>
      <path d="M108 70 L100 84 L100 160 L122 180Z" opacity="0.86"/>
      <path d="M92 70 L84 100 L92 96Z" fill="#fff" opacity="0.22"/>
      <rect x="82" y="52" width="36" height="30" rx="9"/>
      <rect x="86" y="55" width="10" height="22" rx="4" fill="#fff" opacity="0.2"/>
    </g>
  </svg>`;
}
const BOW = bowSvg();

export function ribbonMarkup({ monogram, copy, style, names = "", dateText = "", fontCss = "", dividerKey = "ag", message = "" }) {
  const pal = style ? ` style="${paletteStyleAttr(style)}"` : "";
  const glyph = dividerKey && dividerKey !== "nincs" ? dividerGlyph(dividerKey) : "";
  return `<div id="wc-ribbon"${pal} role="dialog" aria-modal="true" aria-label="${escapeHtml(copy.ribbonLabel)}">
  <div class="rb-paper"></div>
  <div class="rb-band rb-v-top"></div>
  <div class="rb-band rb-v-bottom"></div>
  <div class="rb-band rb-h-left"></div>
  <div class="rb-band rb-h-right"></div>
  <div class="rb-bow" aria-hidden="true">${BOW}<span class="rb-mono">${monogram}</span></div>
  <div class="rb-center">
    <div class="rb-names" style="${escapeHtml(fontCss)}">${escapeHtml(names)}</div>
    <div class="rb-date">${escapeHtml(dateText)}</div>
    <div class="rb-glyph" aria-hidden="true">${glyph}</div>
    <div class="rb-message"${message ? "" : " hidden"}>${escapeHtml(message)}</div>
    <div class="rb-hint" aria-hidden="true">${escapeHtml(copy.ribbonHint)}</div>
  </div>
  <button type="button" class="rb-open" aria-label="${escapeHtml(copy.ribbonLabel)}"></button>
  <button type="button" class="rb-skip">${escapeHtml(copy.envelopeSkip)}</button>
</div>`;
}

const PAPER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='280'%3E%3Cfilter id='p' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.03 .045' numOctaves='4' seed='3' result='n'/%3E%3CfeDiffuseLighting in='n' lighting-color='%23fff' surfaceScale='1.5'%3E%3CfeDistantLight azimuth='225' elevation='58'/%3E%3C/feDiffuseLighting%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 .32  0 0 0 0 .27  0 0 0 0 .22  -.26 0 0 0 .24'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E")`;
const SATIN =
  "linear-gradient(90deg, rgba(0,0,0,0.22), rgba(255,255,255,0.55) 13%, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 68%, rgba(255,255,255,0.42) 85%, rgba(0,0,0,0.2))";
const SATIN_H =
  "linear-gradient(180deg, rgba(0,0,0,0.22), rgba(255,255,255,0.55) 13%, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 68%, rgba(255,255,255,0.42) 85%, rgba(0,0,0,0.2))";

export const ribbonCss = `
  html.wc-env-skip #wc-ribbon { display: none !important; }
  html.wc-env-lock, html.wc-env-lock body { overflow: hidden; }
  #wc-ribbon { position: fixed; inset: 0; z-index: 10000; overflow: hidden; text-align: center; -webkit-tap-highlight-color: transparent; }
  #wc-ribbon * { box-sizing: border-box; }
  #wc-ribbon .rb-paper { position: absolute; inset: 0; z-index: 0; background: ${PAPER}, radial-gradient(ellipse at 30% 18%, rgba(255,255,255,0.3), transparent 60%), linear-gradient(160deg, var(--env-paper, var(--bg)), var(--env-paper2, var(--bg))); }
  #wc-ribbon .rb-band { position: absolute; z-index: 2; will-change: transform; transition: transform 1.5s cubic-bezier(0.6, 0, 0.2, 1); }
  #wc-ribbon .rb-band::before { content: ""; position: absolute; inset: 0; background: color-mix(in srgb, var(--env-seal, var(--accent)) 92%, #000 0%); }
  #wc-ribbon .rb-band::after { content: ""; position: absolute; inset: 0; }
  #wc-ribbon .rb-v-top, #wc-ribbon .rb-v-bottom { left: 50%; width: min(15vw, 108px); margin-left: min(-7.5vw, -54px); }
  #wc-ribbon .rb-v-top::after, #wc-ribbon .rb-v-bottom::after { background: ${SATIN}; }
  #wc-ribbon .rb-v-top { top: 0; height: 50%; }
  #wc-ribbon .rb-v-bottom { top: 50%; height: 50%; }
  #wc-ribbon .rb-h-left, #wc-ribbon .rb-h-right { top: 50%; height: min(15vw, 108px); margin-top: min(-7.5vw, -54px); }
  #wc-ribbon .rb-h-left::after, #wc-ribbon .rb-h-right::after { background: ${SATIN_H}; }
  #wc-ribbon .rb-h-left { left: 0; width: 50%; }
  #wc-ribbon .rb-h-right { left: 50%; width: 50%; }
  #wc-ribbon .rb-band { box-shadow: 0 8px 20px -8px rgba(30,15,5,0.35); }
  #wc-ribbon .rb-v-top::before, #wc-ribbon .rb-v-bottom::before { box-shadow: inset 5px 0 0 rgba(207,166,81,0.85), inset -5px 0 0 rgba(207,166,81,0.85); }
  #wc-ribbon .rb-h-left::before, #wc-ribbon .rb-h-right::before { box-shadow: inset 0 5px 0 rgba(207,166,81,0.85), inset 0 -5px 0 rgba(207,166,81,0.85); }
  #wc-ribbon .rb-bow { position: absolute; left: 50%; top: 50%; z-index: 4; width: min(30vw, 168px); margin: calc(min(30vw, 168px) / -2.35) 0 0 calc(min(30vw, 168px) / -2); color: var(--env-seal, var(--accent)); filter: drop-shadow(0 10px 16px rgba(30,15,5,0.38)); animation: rb-float 3s ease-in-out infinite; transform-origin: 50% 25%; }
  #wc-ribbon .rb-bow-svg { display: block; width: 100%; height: auto; }
  #wc-ribbon .rb-mono { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: 1.15rem; color: var(--env-seal-fg, var(--btn-fg)); white-space: nowrap; }
  #wc-ribbon .rb-mono i { font-style: normal; font-size: 0.75em; opacity: 0.9; }
  #wc-ribbon .rb-center { position: absolute; left: 0; right: 0; top: 58%; z-index: 3; display: flex; flex-direction: column; align-items: center; padding: 0 22px; transition: opacity 0.5s ease, transform 0.7s ease; }
  #wc-ribbon .rb-names { font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: clamp(2rem, 7.4vw, 3.4rem); line-height: 1.1; color: var(--fg); max-width: 92vw; overflow-wrap: anywhere; }
  #wc-ribbon .rb-date { margin-top: 6px; font: italic 500 1.2rem "Cormorant Garamond", serif; letter-spacing: 0.05em; color: var(--accent-text); }
  #wc-ribbon .rb-glyph { width: min(30vw, 110px); margin-top: 12px; color: var(--env-orn, var(--accent)); opacity: 0.9; }
  #wc-ribbon .rb-glyph svg { display: block; width: 100%; height: auto; }
  #wc-ribbon .rb-message { margin-top: 14px; font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: clamp(1.7rem, 5.2vw, 2.3rem); line-height: 1.1; color: var(--fg); }
  #wc-ribbon .rb-message[hidden] { display: none; }
  #wc-ribbon .rb-hint { margin-top: 14px; font: italic 500 1.05rem/1.2 "Cormorant Garamond", serif; letter-spacing: 0.05em; color: var(--fg); opacity: 0.85; animation: rb-pulse 2.8s ease-in-out infinite; }
  #wc-ribbon .rb-open { position: absolute; inset: 0; z-index: 6; width: 100%; background: none; border: 0; padding: 0; cursor: pointer; outline: none; }
  #wc-ribbon .rb-skip { position: absolute; left: 50%; bottom: max(22px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 7; background: none; border: 0; padding: 10px 14px; cursor: pointer; font: 500 0.7rem "Poppins", sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: var(--fg); opacity: 0.7; }
  /* Nyitás: a masni kioldódik, a szalag négy fele (fel/le/balra/jobbra) szétcsúszik, majd az egész csomagolás feloldódik */
  #wc-ribbon.rb-opening .rb-bow { animation: rb-untie 0.7s cubic-bezier(0.4, 0, 0.4, 1) forwards; }
  #wc-ribbon.rb-opening .rb-center { opacity: 0; transform: translateY(-10px); }
  #wc-ribbon.rb-opening .rb-hint, #wc-ribbon.rb-opening .rb-skip { opacity: 0; transition: opacity 0.25s; }
  #wc-ribbon.rb-opening .rb-v-top { transform: translateY(-115%); transition-delay: 0.45s; }
  #wc-ribbon.rb-opening .rb-v-bottom { transform: translateY(115%); transition-delay: 0.45s; }
  #wc-ribbon.rb-opening .rb-h-left { transform: translateX(-115%); transition-delay: 0.6s; }
  #wc-ribbon.rb-opening .rb-h-right { transform: translateX(115%); transition-delay: 0.6s; }
  #wc-ribbon.rb-leaving { animation: rb-out 0.7s ease forwards; }
  #wc-ribbon.rb-opening, #wc-ribbon.rb-fast { pointer-events: none; }
  #wc-ribbon.rb-fast { opacity: 0; transition: opacity 0.35s ease; }
  @keyframes rb-untie { 0% { transform: scale(1) rotate(0); opacity: 1; } 35% { transform: scale(1.14) rotate(-8deg); opacity: 1; } 100% { transform: scale(0.35) rotate(24deg) translateY(30px); opacity: 0; } }
  @keyframes rb-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  @keyframes rb-pulse { 0%, 100% { opacity: 0.62; } 50% { opacity: 1; } }
  @keyframes rb-out { to { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { #wc-ribbon * { animation-duration: 0.01ms !important; } }
`;

export const ribbonRuntime = `<script>
  window.wcRibbonInit = function (root, opts) {
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
      if (fast) { root.classList.add("rb-fast"); setTimeout(finish, 400); return; }
      root.classList.add("rb-opening");
      setTimeout(function () { root.classList.add("rb-leaving"); }, 2350);
      setTimeout(finish, 3050);
    }
    var btn = root.querySelector(".rb-open");
    btn.addEventListener("click", function () { open(false); });
    root.querySelector(".rb-skip").addEventListener("click", function (e) { e.stopPropagation(); open(true); });
    try { btn.focus({ preventScroll: true }); } catch (e) {}
  };
</script>`;

export { monogramHtml };
