export function normalizePooCurrencyCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
}

export function buildPooCurrencyOptions({ meta = {} } = {}) {
  const codes = [
    meta.reportingCurrency,
    ...(Array.isArray(meta.currencyCodes) ? meta.currencyCodes : []),
  ]
    .map(normalizePooCurrencyCode)
    .filter((code) => code.length === 3);

  return [...new Set(codes)].sort((a, b) => a.localeCompare(b));
}
