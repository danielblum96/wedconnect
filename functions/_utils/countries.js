export const COUNTRIES = [
  { value: "DE", label: "Deutschland" },
  { value: "AT", label: "Österreich" },
  { value: "CH", label: "Schweiz" },
];

export function countryOptions(selected) {
  return COUNTRIES.map(
    (c) => `<option value="${c.value}"${c.value === selected ? " selected" : ""}>${c.label}</option>`
  ).join("");
}
