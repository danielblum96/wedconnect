import { escapeHtml } from "./html.js";
import { paletteStyleAttr, monogramHtml } from "./envelopeIntro.js";

// Nyitó animáció: "Függöny / fátyol" (2. változat, a user 12 pontos visszajelzése alapján). Nincs karnis/gyűrű:
// két könnyed, áttetsző textil-lap találkozik egy finom középvonalnál, mögöttük (backdrop-filterrel elmosva,
// ezért "átsejlik") a VALÓDI oldal - nincs másolat/kitöltő szín, csak az igazi tartalom homályosan. Csak a
// monogram, a nevek és egy rövid hívó-szöveg látszik zárt állapotban; a dátum/díszítés/egyedi üzenet csak
// megnyitás után, magán az oldalon jelenik meg. Koppintásra a textil kb. 1,2-1,3 mp alatt, enyhén lengő,
// nem-egyenletes (skew-elt) mozgással szétválik, a homály gyorsan élesedik, ~1,9 mp alatt előtűnik a valódi oldal.
//
// FONTOS, tesztekkel megerősített motorhiba: ha BÁRMELYIK elemnek `clip-path`-ja (vagy `mask-image`-je) van a
// lapon, amíg `backdrop-filter`-t használó elem(ek) is jelen vannak, a backdrop-filter hatása egy ponton (kb. a
// tartalom ~35-45%-ánál) egyszerűen ELTŰNIK a teljes oldalon - NEM csak a klippelt elemen. Emiatt a fátyol
// szélének "hullámosságát" SOSEM szabad clip-path/mask-image-dzsel megoldani, amíg backdrop-filter fut; helyette
// egyenes szélű, áttetsző/textúrázott rétegek + finom transzformáció (skew/scale) adja az anyag-érzetet.

const uri = (svg) => `url("data:image/svg+xml,${svg.replace(/</g, "%3C").replace(/>/g, "%3E").replace(/#/g, "%23").replace(/"/g, "'")}")`;
// Lágy, felhőszerű, alacsony kontrasztú szövet-egyenetlenség (nem csíkos, nem digitális zaj) - két eltérő
// paraméterű változat, hogy a két fél ne legyen egyforma (a user 4. pontja: "ne legyen geometrikusan szabályos").
const CLOTH_L = uri(
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><filter id="c"><feTurbulence type="fractalNoise" baseFrequency=".009 .014" numOctaves="3" seed="6"/><feGaussianBlur stdDeviation="2.2"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .16 0"/></filter><rect width="100%" height="100%" filter="url(#c)"/></svg>'
);
const CLOTH_R = uri(
  '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="520"><filter id="d"><feTurbulence type="fractalNoise" baseFrequency=".011 .008" numOctaves="3" seed="19"/><feGaussianBlur stdDeviation="2.6"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .14 0"/></filter><rect width="100%" height="100%" filter="url(#d)"/></svg>'
);

export function veilMarkup({ monogram, copy, style, names = "" }) {
  const pal = style ? ` style="${paletteStyleAttr(style)}"` : "";
  return `<div id="wc-veil"${pal} role="dialog" aria-modal="true" aria-label="${escapeHtml(copy.veilLabel)}">
  <div class="vl-cloth vl-l"><i class="vl-blur"></i><i class="vl-tex"></i><i class="vl-edge"></i></div>
  <div class="vl-cloth vl-r"><i class="vl-blur"></i><i class="vl-tex"></i><i class="vl-edge"></i></div>
  <div class="vl-sheen" aria-hidden="true"></div>
  <div class="vl-seam" aria-hidden="true"></div>
  <div class="vl-center">
    <div class="vl-mono">${monogram}</div>
    <div class="vl-names">${escapeHtml(names)}</div>
    <div class="vl-hint" aria-hidden="true">${escapeHtml(copy.envelopeHint)}</div>
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
  #wc-veil .vl-center { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 26px; pointer-events: none; transition: opacity 0.4s ease, filter 0.4s ease; }
  #wc-veil .vl-mono { font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: clamp(2.6rem, 9vw, 4.4rem); line-height: 1; color: var(--fg); opacity: 0.92; animation: vl-breathe 4.6s ease-in-out infinite; }
  #wc-veil .vl-mono i { font-style: normal; }
  #wc-veil .vl-names { margin-top: 10px; font-family: "Great Vibes", "Cormorant Garamond", cursive; font-size: clamp(1.5rem, 4.6vw, 2.1rem); line-height: 1.15; color: var(--fg); opacity: 0.82; max-width: 90vw; overflow-wrap: anywhere; }
  #wc-veil .vl-hint { margin-top: 22px; font: italic 500 1rem/1.2 "Cormorant Garamond", serif; letter-spacing: 0.06em; color: var(--fg); opacity: 0.62; }
  /* Egyenes szélű, áttetsző rétegek (SOSEM clip-path/mask - ld. a fenti megjegyzést); az anyag-érzetet a lágy
     textúra, a finom belső árnyék és a nyitáskori skew-es, nem-egyenletes mozgás adja. */
  #wc-veil .vl-cloth { position: absolute; top: -2%; bottom: -2%; width: 51.5%; z-index: 2; will-change: transform; }
  #wc-veil .vl-blur { position: absolute; inset: 0; display: block; background: color-mix(in srgb, color-mix(in srgb, var(--env-paper, #faf7f2) 55%, #fff 45%) 84%, transparent); -webkit-backdrop-filter: blur(6px) saturate(1.1) contrast(1.02) brightness(1.03); backdrop-filter: blur(6px) saturate(1.1) contrast(1.02) brightness(1.03); }
  #wc-veil .vl-tex { position: absolute; inset: 0; display: block; opacity: 0.55; mix-blend-mode: soft-light; }
  #wc-veil .vl-edge { position: absolute; top: 0; bottom: 0; width: 14%; pointer-events: none; }
  #wc-veil .vl-l { left: -1.5%; box-shadow: inset -20px 0 30px -22px rgba(60,40,20,0.3); animation: vl-sway-l 8s ease-in-out infinite; }
  #wc-veil .vl-l .vl-tex { background: ${CLOTH_L}; background-size: 480px 480px; }
  #wc-veil .vl-l .vl-edge { right: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22)); }
  #wc-veil .vl-r { right: -1.5%; box-shadow: inset 20px 0 30px -22px rgba(60,40,20,0.3); animation: vl-sway-r 9.2s ease-in-out infinite; }
  #wc-veil .vl-r .vl-tex { background: ${CLOTH_R}; background-size: 520px 520px; }
  #wc-veil .vl-r .vl-edge { left: 0; background: linear-gradient(270deg, transparent, rgba(255,255,255,0.2)); }
  #wc-veil .vl-sheen { position: absolute; inset: 0; z-index: 2; pointer-events: none; background: radial-gradient(120% 70% at 50% 8%, rgba(255,255,255,0.32), transparent 55%), linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.16) 50%, transparent 60%); mix-blend-mode: soft-light; transition: opacity 0.4s ease; }
  #wc-veil .vl-seam { position: absolute; left: 50%; top: 4%; bottom: 4%; width: 1px; z-index: 2; margin-left: -0.5px; background: linear-gradient(180deg, transparent, rgba(207,166,81,0.5) 15%, rgba(207,166,81,0.65) 50%, rgba(207,166,81,0.5) 85%, transparent); transition: opacity 0.4s ease; }
  #wc-veil .vl-open { position: absolute; inset: 0; z-index: 4; width: 100%; background: none; border: 0; padding: 0; cursor: pointer; outline: none; }
  #wc-veil .vl-skip { position: absolute; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 5; background: none; border: 0; padding: 9px 14px; cursor: pointer; font: 400 0.68rem "Poppins", sans-serif; letter-spacing: 0.1em; text-transform: uppercase; color: var(--fg); opacity: 0.42; }
  #wc-veil .vl-skip:hover { opacity: 0.7; }
  @keyframes vl-breathe { 0%, 100% { transform: scale(1); opacity: 0.92; } 50% { transform: scale(1.018); opacity: 1; } }
  @keyframes vl-sway-l { 0%, 100% { transform: skewX(0.3deg) scaleY(1); } 50% { transform: skewX(-0.35deg) scaleY(1.004); } }
  @keyframes vl-sway-r { 0%, 100% { transform: skewX(-0.25deg) scaleY(1); } 50% { transform: skewX(0.4deg) scaleY(1.003); } }
  /* Nyitás: a monogram/nevek gyorsan elhalványul, a varrat eltűnik, a két fél enyhén lengő, nem-egyenletes
     (skew-elt) mozgással szétválik, a mögötte lévő valódi oldal a homály gyors csökkenésével élesedik.
     Összesen kb. 1,85-1,95 mp. */
  #wc-veil.vl-opening .vl-center { opacity: 0; filter: blur(2px); }
  #wc-veil.vl-opening .vl-seam { opacity: 0; }
  #wc-veil.vl-opening .vl-sheen { opacity: 0; }
  #wc-veil.vl-opening .vl-skip { opacity: 0; transition: opacity 0.25s; }
  #wc-veil.vl-opening .vl-blur { transition: -webkit-backdrop-filter 1s ease 0.05s, backdrop-filter 1s ease 0.05s; -webkit-backdrop-filter: blur(0px) saturate(1) contrast(1); backdrop-filter: blur(0px) saturate(1) contrast(1); }
  #wc-veil.vl-opening .vl-l { animation: vl-open-l 1.5s cubic-bezier(0.45, 0, 0.2, 1) forwards; }
  #wc-veil.vl-opening .vl-r { animation: vl-open-r 1.5s cubic-bezier(0.45, 0, 0.2, 1) forwards; }
  #wc-veil.vl-opening, #wc-veil.vl-fast { pointer-events: none; }
  #wc-veil.vl-leaving { animation: vl-out 0.55s ease forwards; }
  #wc-veil.vl-fast { opacity: 0; transition: opacity 0.35s ease; }
  @keyframes vl-open-l {
    0% { transform: translate(0, 0) skewX(0.8deg); }
    55% { transform: translate(-48%, -0.5%) skewX(-2.2deg); }
    100% { transform: translate(-104%, 0) skewX(0); }
  }
  @keyframes vl-open-r {
    0% { transform: translate(0, 0) skewX(-0.6deg); }
    55% { transform: translate(44%, 0.4%) skewX(2deg); }
    100% { transform: translate(104%, 0) skewX(0); }
  }
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
      if (fast) { root.classList.add("vl-fast"); setTimeout(finish, 400); return; }
      root.classList.add("vl-opening");
      setTimeout(function () { root.classList.add("vl-leaving"); }, 1500);
      setTimeout(finish, 2050);
    }
    var btn = root.querySelector(".vl-open");
    btn.addEventListener("click", function () { open(false); });
    root.querySelector(".vl-skip").addEventListener("click", function (e) { e.stopPropagation(); open(true); });
    try { btn.focus({ preventScroll: true }); } catch (e) {}
  };
</script>`;

export { monogramHtml };
