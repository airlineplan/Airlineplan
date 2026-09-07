const DEFAULT_CURRENCY_CODE = "INR";

export function normalizeStationCurrencyCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
}

export function buildStationCurrencyOptions(config = {}, stations = []) {
  const currencyCodes = [
    config.reportingCurrency,
    ...(Array.isArray(config.currencyCodes) ? config.currencyCodes : []),
    ...(Array.isArray(stations)
      ? stations.flatMap((station) => [station?.currencyCode, station?.currency, station?.ccy])
      : []),
  ]
    .map(normalizeStationCurrencyCode)
    .filter((code) => code.length === 3);

  const options = [...new Set(currencyCodes)];
  return options.length > 0 ? options : [DEFAULT_CURRENCY_CODE];
}
