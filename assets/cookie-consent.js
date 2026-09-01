// Süti-elfogadó (cookie consent), Google Consent Mode v2 minta alapján
// (ld. Obsidian: "Süti-elfogadó (cookie consent) – újrahasznosítható minta").
// Egyetlen közös fájl, minden nyilvános oldalba <script defer>-rel betöltve.
//
// Nyelv: NEM az oldal saját nyelvéhez igazodik, hanem a látogató böngészőjének
// nyelvéhez (navigator.language) - a user kifejezett kérése, mivel a
// wedconnect.eu látogatói bármilyen EU-s nyelvű böngészőt használhatnak,
// függetlenül attól, hogy épp a /hu/ vagy /de/ oldalon vannak.
//
// GA4/Google Ads egyelőre NINCS bekötve ehhez a projekthez (ld. Obsidian
// Teendők) - a GOOGLE_ADS_ID/GA4_ID placeholder üresen marad, a
// consent-alapú gtag('consent', ...) hívások attól még lefutnak (ez a
// Consent Mode v2 lényege: a consent-állapot AKKOR IS beállítható/tárolható,
// ha még nincs tényleges mérőkód), így amint bekerül egy valós azonosító,
// nincs más teendő ezen a fájlon.
(function () {
  "use strict";

  var CONSENT_KEY = "wedconnect_cookie_consent";
  var CONSENT_VERSION = 1;
  var GOOGLE_ADS_ID = ""; // TODO: pl. "AW-XXXXXXXXX", ha lesz Google Ads
  var GA4_ID = ""; // TODO: pl. "G-XXXXXXXXXX", ha lesz GA4

  var TRANSLATIONS = {
    hu: {
      title: "Sütiket használunk",
      body: "A weboldal működéséhez szükséges sütiket mindig használjuk. Statisztikai és marketing célú sütiket csak a hozzájárulásoddal használunk, hogy jobban megértsük az oldal használatát és releváns tartalmat mutassunk.",
      acceptAll: "Összes elfogadása",
      acceptNecessary: "Csak a szükséges sütik",
      settings: "Beállítások",
      save: "Mentés",
      necessaryLabel: "Szükséges",
      necessaryDesc: "Az oldal alapműködéséhez kellenek (pl. bejelentkezés). Ezek nem kapcsolhatók ki.",
      statisticsLabel: "Statisztikai",
      statisticsDesc: "Segítenek megérteni, hogyan használják a látogatók az oldalt.",
      marketingLabel: "Marketing",
      marketingDesc: "Hirdetések relevánsabbá tételéhez és mérésükhöz használjuk.",
      settingsLink: "Süti-beállítások",
    },
    de: {
      title: "Wir verwenden Cookies",
      body: "Technisch notwendige Cookies verwenden wir immer. Statistik- und Marketing-Cookies nur mit deiner Zustimmung, um die Nutzung der Seite besser zu verstehen und relevante Inhalte zu zeigen.",
      acceptAll: "Alle akzeptieren",
      acceptNecessary: "Nur notwendige Cookies",
      settings: "Einstellungen",
      save: "Speichern",
      necessaryLabel: "Notwendig",
      necessaryDesc: "Für die Grundfunktionen der Seite erforderlich (z. B. Login). Können nicht deaktiviert werden.",
      statisticsLabel: "Statistik",
      statisticsDesc: "Helfen uns zu verstehen, wie die Seite genutzt wird.",
      marketingLabel: "Marketing",
      marketingDesc: "Für relevantere Werbung und deren Messung.",
      settingsLink: "Cookie-Einstellungen",
    },
    en: {
      title: "We use cookies",
      body: "We always use cookies that are technically necessary. Statistics and marketing cookies are only used with your consent, to better understand how the site is used and show relevant content.",
      acceptAll: "Accept all",
      acceptNecessary: "Necessary only",
      settings: "Settings",
      save: "Save",
      necessaryLabel: "Necessary",
      necessaryDesc: "Required for the site to function (e.g. login). These can't be turned off.",
      statisticsLabel: "Statistics",
      statisticsDesc: "Help us understand how visitors use the site.",
      marketingLabel: "Marketing",
      marketingDesc: "Used to make ads more relevant and measure them.",
      settingsLink: "Cookie settings",
    },
  };

  function detectLang() {
    var raw = (navigator.language || (navigator.languages && navigator.languages[0]) || "en").toLowerCase();
    var primary = raw.split("-")[0];
    return TRANSLATIONS[primary] ? primary : "en";
  }

  var lang = detectLang();
  var t = TRANSLATIONS[lang];

  // --- Consent Mode v2: alapból minden "denied", MIELŐTT bármi más
  // gtag-hívás lefutna (ezt a beillesztett <script> sorrendje garantálja -
  // ez a fájl kerül legkorábbra minden oldalon).
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });

  function loadConsent() {
    try {
      var raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed.version !== CONSENT_VERSION) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(consent) {
    var data = {
      necessary: true,
      statistics: !!consent.statistics,
      marketing: !!consent.marketing,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage nem elérhető (privát mód stb.) - a döntés csak erre az
      // oldalbetöltésre érvényesül, a banner legközelebb újra megjelenik.
    }
    applyConsent(data);
    document.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: data }));
  }

  function applyConsent(consent) {
    gtag("consent", "update", {
      ad_storage: consent.marketing ? "granted" : "denied",
      ad_user_data: consent.marketing ? "granted" : "denied",
      ad_personalization: consent.marketing ? "granted" : "denied",
      analytics_storage: consent.statistics ? "granted" : "denied",
    });
    if (consent.statistics && GA4_ID && !document.getElementById("ga4-loader")) {
      var s = document.createElement("script");
      s.id = "ga4-loader";
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
      document.head.appendChild(s);
      gtag("js", new Date());
      gtag("config", GA4_ID);
    }
    if (GOOGLE_ADS_ID && !document.getElementById("ads-loader")) {
      var a = document.createElement("script");
      a.id = "ads-loader";
      a.async = true;
      a.src = "https://www.googletagmanager.com/gtag/js?id=" + GOOGLE_ADS_ID;
      document.head.appendChild(a);
      gtag("js", new Date());
      gtag("config", GOOGLE_ADS_ID);
    }
  }

  function injectStyles() {
    var style = document.createElement("style");
    style.textContent =
      "#cc-overlay{position:fixed;inset:0;z-index:9999;background:rgba(43,38,32,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Poppins',sans-serif;color:#2b2620;}" +
      "#cc-card{width:100%;max-width:460px;max-height:90vh;overflow-y:auto;background:#faf7f2;border-radius:24px;padding:36px 32px;box-shadow:0 30px 80px -20px rgba(0,0,0,0.5);}" +
      "#cc-title{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:1.5rem;text-align:center;margin:0 0 14px;}" +
      "#cc-body{font-size:0.92rem;line-height:1.6;color:#6b6255;margin:0 0 26px;text-align:center;}" +
      "#cc-actions{display:flex;flex-direction:column;gap:10px;}" +
      ".cc-btn{font-family:'Poppins',sans-serif;font-size:0.9rem;font-weight:600;padding:13px 22px;border-radius:999px;cursor:pointer;border:1.5px solid transparent;width:100%;}" +
      ".cc-btn-primary{background:linear-gradient(135deg,#f0c988,#b48b56);color:#1a1408;}" +
      ".cc-btn-secondary{background:#fff;color:#2b2620;border-color:#ddd6c9;}" +
      ".cc-btn-link{background:none;color:#8c6d34;text-decoration:underline;padding:8px 4px;font-weight:500;font-size:0.85rem;}" +
      "#cc-settings{display:none;margin-top:8px;border-top:1px solid #ece4d6;padding-top:20px;}" +
      "#cc-settings.cc-open{display:block;}" +
      ".cc-row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:12px 0;}" +
      ".cc-row-label{font-weight:600;font-size:0.92rem;}" +
      ".cc-row-desc{font-size:0.8rem;color:#6b6255;margin-top:2px;}" +
      ".cc-switch{position:relative;flex:0 0 auto;width:42px;height:24px;}" +
      ".cc-switch input{opacity:0;width:0;height:0;}" +
      ".cc-slider{position:absolute;inset:0;background:#ddd6c9;border-radius:999px;cursor:pointer;transition:background .15s;}" +
      ".cc-slider:before{content:'';position:absolute;width:18px;height:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .15s;}" +
      ".cc-switch input:checked + .cc-slider{background:#b48b56;}" +
      ".cc-switch input:checked + .cc-slider:before{transform:translateX(18px);}" +
      ".cc-switch input:disabled + .cc-slider{opacity:0.6;cursor:default;}" +
      "@media (max-width:520px){#cc-card{padding:28px 22px;border-radius:20px;}}";
    document.head.appendChild(style);
  }

  function buildOverlay() {
    var overlay = document.createElement("div");
    overlay.id = "cc-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", t.title);
    overlay.innerHTML =
      '<div id="cc-card">' +
      '<div id="cc-title">' + t.title + "</div>" +
      '<div id="cc-body">' + t.body + "</div>" +
      '<div id="cc-actions">' +
      '<button type="button" class="cc-btn cc-btn-primary" data-cc="accept-all">' + t.acceptAll + "</button>" +
      '<button type="button" class="cc-btn cc-btn-secondary" data-cc="accept-necessary">' + t.acceptNecessary + "</button>" +
      '<button type="button" class="cc-btn cc-btn-link" data-cc="toggle-settings" style="margin:2px auto 0;">' + t.settings + "</button>" +
      "</div>" +
      '<div id="cc-settings">' +
      row(t.necessaryLabel, t.necessaryDesc, "necessary", true, true) +
      row(t.statisticsLabel, t.statisticsDesc, "statistics", false, false) +
      row(t.marketingLabel, t.marketingDesc, "marketing", false, false) +
      '<button type="button" class="cc-btn cc-btn-primary" data-cc="save-settings" style="margin-top:14px;">' + t.save + "</button>" +
      "</div>" +
      "</div>";
    return overlay;

    function row(label, desc, key, checked, disabled) {
      var id = "cc-toggle-" + key;
      return (
        '<div class="cc-row">' +
        '<div><div class="cc-row-label">' + label + '</div><div class="cc-row-desc">' + desc + "</div></div>" +
        '<label class="cc-switch"><input type="checkbox" id="' + id + '" ' + (checked ? "checked " : "") + (disabled ? "disabled " : "") + 'data-cc-key="' + key + '"><span class="cc-slider"></span></label>' +
        "</div>"
      );
    }
  }

  function showBanner() {
    injectStyles();
    var overlay = buildOverlay();
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
      var action = e.target.getAttribute("data-cc");
      if (!action) return;
      if (action === "accept-all") {
        saveConsent({ statistics: true, marketing: true });
        overlay.remove();
      } else if (action === "accept-necessary") {
        saveConsent({ statistics: false, marketing: false });
        overlay.remove();
      } else if (action === "toggle-settings") {
        document.getElementById("cc-settings").classList.toggle("cc-open");
      } else if (action === "save-settings") {
        var statistics = document.getElementById("cc-toggle-statistics").checked;
        var marketing = document.getElementById("cc-toggle-marketing").checked;
        saveConsent({ statistics: statistics, marketing: marketing });
        overlay.remove();
      }
    });
  }

  function openSettingsAgain() {
    try {
      localStorage.removeItem(CONSENT_KEY);
    } catch (e) {}
    location.reload();
  }

  function wireSettingsLinks() {
    var links = document.querySelectorAll("[data-cookie-settings]");
    for (var i = 0; i < links.length; i++) {
      links[i].textContent = t.settingsLink;
      links[i].addEventListener("click", function (e) {
        e.preventDefault();
        openSettingsAgain();
      });
    }
  }

  function init() {
    var existing = loadConsent();
    if (existing) {
      applyConsent(existing);
    } else {
      showBanner();
    }
    wireSettingsLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
