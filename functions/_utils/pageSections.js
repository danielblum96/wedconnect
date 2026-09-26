import { escapeHtml } from "./html.js";

// A publikus oldal két opcionális szekciója, amit csak a szerkesztőben lehet hozzáadni:
// "A mi történetünk" idővonal (parok.tortenet) és az esküvői visszaszámláló (parok.visszaszamlalo).

export const MAX_STORY_ITEMS = 8;

export function parseJson(text, fallback) {
  try {
    const v = text ? JSON.parse(text) : fallback;
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

// "YYYY-MM-DD" + "HH:MM" a megadott időzóna szerint -> UTC ezredmásodperc (a DST-t is kezeli).
// Az esküvők túlnyomó többsége közép-európai időzónában van (HU/DE/AT/CH).
export function zonedToUtcMs(dateStr, timeStr, timeZone = "Europe/Budapest") {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!m) return null;
  const t = /^(\d{2}):(\d{2})$/.exec(timeStr || "") || [null, "00", "00"];
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +t[1], +t[2]);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return guess - (asUtc - guess);
}

// Visszaszámláló: számnagyságú, hajszálvonallal elválasztott értékek (nem "widget"), a kezdő
// értékeket a szerver számolja, a mp-enkénti frissítést a kliens-szkript végzi (countdownScript).
export function countdownHtml({ targetMs, copy, nowMs = Date.now() }) {
  if (targetMs == null) return "";
  const diff = targetMs - nowMs;
  const s = Math.max(0, Math.floor(diff / 1000));
  const pad = (n) => String(n).padStart(2, "0");
  const cell = (u, val, label) => `<div class="cd-cell"><span class="cd-num" data-u="${u}">${val}</span><span class="cd-lbl">${escapeHtml(label)}</span></div>`;
  const done = diff <= 0;
  const msg = done ? (-diff < 864e5 ? copy.cdToday : copy.cdAfter) : "";
  return `<div class="countdown reveal" data-target="${targetMs}" data-today="${escapeHtml(copy.cdToday)}" data-after="${escapeHtml(copy.cdAfter)}">
    <div class="cd-title"${done ? " hidden" : ""}>${escapeHtml(copy.countdownTitle)}</div>
    <div class="cd-row"${done ? " hidden" : ""}>${cell("d", Math.floor(s / 86400), copy.cdDays)}${cell("h", pad(Math.floor((s % 86400) / 3600)), copy.cdHours)}${cell("m", pad(Math.floor((s % 3600) / 60)), copy.cdMinutes)}${cell("s", pad(s % 60), copy.cdSeconds)}</div>
    <div class="cd-msg"${done ? "" : " hidden"}>${escapeHtml(msg)}</div>
  </div>`;
}

export const countdownScript = `<script>
  (function () {
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    function tick() {
      var el = document.querySelector(".countdown");
      if (!el) return;
      var diff = +el.getAttribute("data-target") - Date.now();
      var row = el.querySelector(".cd-row"), msg = el.querySelector(".cd-msg"), title = el.querySelector(".cd-title");
      if (diff <= 0) {
        row.hidden = true; title.hidden = true; msg.hidden = false;
        msg.textContent = -diff < 864e5 ? el.getAttribute("data-today") : el.getAttribute("data-after");
        return;
      }
      var s = Math.floor(diff / 1000);
      var v = { d: Math.floor(s / 86400), h: pad(Math.floor((s % 86400) / 3600)), m: pad(Math.floor((s % 3600) / 60)), s: pad(s % 60) };
      el.querySelectorAll(".cd-num").forEach(function (n) { var t = "" + v[n.getAttribute("data-u")]; if (n.textContent !== t) n.textContent = t; });
    }
    tick();
    setInterval(tick, 1000);
  })();
</script>`;

// "A mi történetünk": egyoszlopos idővonal (bal oldali vonal + pontok), állomásonként dátum, cím,
// fotó és rövid szöveg.
// A dátum a kiválasztott naptári dátumból (YYYY-MM-DD) az oldal nyelvén formázva jelenik meg
// (pl. "2019. június 14."). Régi, szabad szöveges érték változatlanul látszik.
export function formatStoryDate(value, lang) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "";
  const locale = { hu: "hu-HU", de: "de-DE", en: "en-GB" }[lang] || "hu-HU";
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

// "A mi történetünk": egyoszlopos idővonal (bal oldali vonal + pontok), állomásonként dátum, cím
// és rövid szöveg (fotó nélkül).
export function storyHtml({ items, lang, copy }) {
  if (!items.length) return "";
  return `<div class="story">
    <div class="story-title reveal">${escapeHtml(copy.storyTitle)}</div>
    <div class="story-list">
      ${items
        .map(
          (it) => `
      <div class="story-item reveal">
        <span class="story-dot"></span>
        ${it.datum ? `<div class="story-date">${escapeHtml(formatStoryDate(it.datum, lang))}</div>` : ""}
        ${it.cim ? `<div class="story-head">${escapeHtml(it.cim)}</div>` : ""}
        ${it.szoveg ? `<p class="story-text">${escapeHtml(it.szoveg)}</p>` : ""}
      </div>`
        )
        .join("")}
    </div>
  </div>`;
}

export const sectionsCss = `
  .countdown { margin: 6px 0 34px; }
  .cd-title { font-family: "Poppins", sans-serif; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: var(--accent-text); margin-bottom: 16px; }
  .cd-row { display: flex; justify-content: center; }
  .cd-cell { position: relative; flex: 0 1 84px; padding: 0 6px; text-align: center; }
  .cd-cell + .cd-cell::before { content: ""; position: absolute; left: 0; top: 10%; bottom: 10%; width: 1px; background: var(--accent); opacity: 0.4; }
  .cd-num { display: block; font-family: "Cormorant Garamond", serif; font-weight: 500; font-size: 2.6rem; line-height: 1.1; color: var(--fg); font-variant-numeric: tabular-nums lining-nums; }
  .cd-lbl { display: block; font-family: "Poppins", sans-serif; font-size: 0.62rem; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent-text); margin-top: 4px; }
  .cd-msg { font-size: 1.6rem; font-style: italic; line-height: 1.4; color: var(--fg); }
  .cd-msg[hidden], .cd-row[hidden], .cd-title[hidden] { display: none; }
  .story { margin: 8px 0 36px; text-align: left; }
  .story-title { font-family: "Poppins", sans-serif; font-size: 0.78rem; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: var(--accent-text); text-align: center; margin-bottom: 22px; }
  .story-list { position: relative; padding-left: 30px; }
  .story-list::before { content: ""; position: absolute; left: 5px; top: 8px; bottom: 8px; width: 1px; background: var(--accent); opacity: 0.4; }
  .story-item { position: relative; padding-bottom: 32px; }
  .story-item:last-child { padding-bottom: 0; }
  .story-dot { position: absolute; left: -30px; top: 5px; width: 11px; height: 11px; border-radius: 50%; background: var(--bg); border: 1.5px solid var(--accent); }
  .story-date { font-family: "Poppins", sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent-text); }
  .story-head { font-size: 1.5rem; font-weight: 500; line-height: 1.25; color: var(--fg); margin: 2px 0 8px; }
  .story-text { font-size: 1.12rem; line-height: 1.55; color: var(--fg); opacity: 0.92; margin: 0; white-space: pre-line; }
`;

// Finom görgetés-animációk: halvány beúszás és enyhe emelkedés, a borítókép lassú kicsinyedő
// zoomja és nagyon enyhe parallaxa. Csak a publikus oldalon fut, a csökkentett mozgást kérő
// eszközökön és a szerkesztőben nem; JS/IntersectionObserver hiányában minden azonnal látszik.
export const scrollAnimCss = `
  .cover-wrap { overflow: hidden; border-radius: 2px; margin: 0 -30px 16px; }
  .card > .cover-wrap:first-child { margin-top: -46px; }
  .cover-wrap .cover-photo { margin-bottom: 0; border-radius: 0; }
  .anim .reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) var(--d, 0ms), transform 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) var(--d, 0ms); }
  .anim .reveal.in { opacity: 1; transform: none; }
  .anim .cover-wrap .cover-photo { scale: 1.14; transition: scale 2s cubic-bezier(0.22, 0.61, 0.36, 1); will-change: scale, translate; }
  .anim .cover-wrap.in .cover-photo { scale: 1.08; }
`;

export const scrollAnimHeadScript = `<script>
  (function () {
    var h = document.documentElement;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    h.classList.add("anim");
    // Védőháló: ha a szkript valamiért nem indulna el, ne maradjon rejtve a tartalom.
    setTimeout(function () { if (!window.__wcReveal) h.classList.remove("anim"); }, 4000);
  })();
</script>
<noscript><style>.reveal { opacity: 1 !important; transform: none !important; }</style></noscript>`;

export const scrollAnimScript = `<script>
  (function () {
    window.__wcReveal = true;
    var h = document.documentElement;
    if (!h.classList.contains("anim")) return;
    function start() {
      var els = document.querySelectorAll(".reveal, .cover-wrap");
      if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      els.forEach(function (e) { io.observe(e); });
      var ph = document.querySelector(".cover-photo");
      if (ph && ph.parentNode) {
        var ticking = false;
        var update = function () {
          ticking = false;
          var r = ph.parentNode.getBoundingClientRect();
          var p = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - window.innerHeight / 2) / window.innerHeight));
          ph.style.translate = "0 " + (p * -9).toFixed(1) + "px";
        };
        window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
        update();
      }
    }
    // A nyitó boríték alatt ne fusson le a bevezető animáció: várjuk meg, míg eltűnik.
    if (document.getElementById("wc-env") && !h.classList.contains("wc-env-skip")) document.addEventListener("wc-env-done", start, { once: true });
    else start();
  })();
</script>`;
