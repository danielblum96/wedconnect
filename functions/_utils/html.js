export function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// A gombok URL-mezője NEM type="url" input (ld. couple-create.js/couple-update.js
// hívóit) - felhasználók gyakran séma nélkül írják be a linket (pl.
// "drive.google.com"), ami valós, működő cím, csak hiányzik elé a "https://".
// Séma nélkül elmentve a safeHref() ÁLTAL VISSZAADOTT href RELATÍV linkként
// viselkedne a böngészőben (a pár saját aloldalához fűzve, nem a valódi külső
// oldalra mutatva) - ezt előzi meg ez a normalizálás MENTÉS ELŐTT.
export function normalizeUrl(url) {
  const trimmed = (url || "").toString().trim();
  if (!trimmed || /^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function safeHref(url) {
  try {
    const parsed = new URL(url, "https://placeholder.invalid");
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "mailto:") {
      return escapeHtml(url);
    }
  } catch (e) {
    // fall through
  }
  return "#";
}
