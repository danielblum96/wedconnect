export const COUNTRY_CODES = ["DE", "AT", "CH", "HU", "OTHER"];

const COUNTRY_LABELS = {
  DE: { de: "Deutschland", hu: "Németország", en: "Germany" },
  AT: { de: "Österreich", hu: "Ausztria", en: "Austria" },
  CH: { de: "Schweiz", hu: "Svájc", en: "Switzerland" },
  HU: { de: "Ungarn", hu: "Magyarország", en: "Hungary" },
  OTHER: { de: "Sonstiges Land", hu: "Egyéb ország", en: "Other country" },
};

export function countryLabel(code, lang) {
  const entry = COUNTRY_LABELS[(code || "").toUpperCase()];
  if (!entry) return code || "";
  return entry[lang] || entry.de;
}

export function countryOptions(selected, lang) {
  return COUNTRY_CODES.map(
    (code) => `<option value="${code}"${code === selected ? " selected" : ""}>${countryLabel(code, lang)}</option>`
  ).join("");
}
