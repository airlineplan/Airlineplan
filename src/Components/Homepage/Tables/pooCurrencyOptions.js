export function normalizePooCurrencyCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
}

export const COMMON_POO_CURRENCIES = ["AED", "EUR", "GBP", "INR", "JPY", "USD"];

export function buildPooCurrencyOptions({ selectedPooCurrency = "", meta = {}, records = [] } = {}) {
  const codes = [
    ...COMMON_POO_CURRENCIES,
    selectedPooCurrency,
    meta.stationCurrency,
    meta.reportingCurrency,
    ...(Array.isArray(meta.currencyCodes) ? meta.currencyCodes : []),
    ...records.map((row) => row?.pooCcy),
  ]
    .map(normalizePooCurrencyCode)
    .filter((code) => code.length === 3);

  return [...new Set(codes)].sort((a, b) => a.localeCompare(b));
}
