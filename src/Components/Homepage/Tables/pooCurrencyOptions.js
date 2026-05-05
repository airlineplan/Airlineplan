export function normalizePooCurrencyCode(code) {
  return String(code || "").trim().toUpperCase();
}

export function buildPooCurrencyOptions({ selectedPooCurrency = "", meta = {}, records = [] } = {}) {
  const codes = [
    selectedPooCurrency,
    meta.stationCurrency,
    meta.reportingCurrency,
    ...(Array.isArray(meta.currencyCodes) ? meta.currencyCodes : []),
    ...records.map((row) => row?.pooCcy),
  ]
    .map(normalizePooCurrencyCode)
    .filter(Boolean);

  return [...new Set(codes)].sort((a, b) => a.localeCompare(b));
}
