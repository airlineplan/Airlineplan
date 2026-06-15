const KG_PER_TONNE = 1000;
const CONNECTING_TRAFFIC_TYPES = new Set([
  "behind",
  "beyond",
  "transit_fl",
  "transit_sl",
]);
const FIRST_LEG_TRAFFIC_TYPES = new Set(["behind", "transit_fl"]);

export function toRevenueNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function hasRevenueNumber(value) {
  if (value === null || value === undefined || value === "") return false;
  return Number.isFinite(Number(String(value).replace(/,/g, "")));
}

function hasPositiveRevenueNumber(value) {
  return hasRevenueNumber(value) && toRevenueNumber(value) > 0;
}

function getTrafficType(row) {
  return String(row?.trafficType || "").trim().toLowerCase();
}

function isConnectingRevenueRow(row) {
  return toRevenueNumber(row?.stops) > 0 || CONNECTING_TRAFFIC_TYPES.has(getTrafficType(row));
}

export function getRevenueProrateShare(row, fieldName) {
  if (!isConnectingRevenueRow(row)) return 1;

  const explicitRatio = toRevenueNumber(row?.[fieldName]);
  if (explicitRatio > 0) {
    const firstLegRatio = Math.min(explicitRatio, 1);
    return FIRST_LEG_TRAFFIC_TYPES.has(getTrafficType(row))
      ? firstLegRatio
      : 1 - firstLegRatio;
  }

  const sectorGcd = toRevenueNumber(row?.sectorGcd);
  const odTotalGcd = toRevenueNumber(row?.odViaGcd) || toRevenueNumber(row?.totalGcd);
  if (sectorGcd <= 0 || odTotalGcd <= 0) return 0.5;
  return Math.min(sectorGcd / odTotalGcd, 1);
}

function calculateCargoRevenue(cargoT, rate) {
  return cargoT * KG_PER_TONNE * rate;
}

function storedOrFallback(value, fallback) {
  return hasRevenueNumber(value) ? toRevenueNumber(value) : fallback;
}

export function getRowRevenueMetrics(row) {
  const pax = toRevenueNumber(row.pax);
  const cargoT = toRevenueNumber(row.cargoT);
  const fareShare = getRevenueProrateShare(row, "fareProrateRatioL1L2");
  const rateShare = getRevenueProrateShare(row, "rateProrateRatioL1L2");
  const legFare = toRevenueNumber(row.legFare);
  const legRate = toRevenueNumber(row.legRate);
  const odFare = toRevenueNumber(row.odFare) || legFare;
  const odRate = toRevenueNumber(row.odRate) || legRate;

  const legPaxRev = storedOrFallback(row.legPaxRev, pax * legFare);
  const legCargoRev = storedOrFallback(row.legCargoRev, calculateCargoRevenue(cargoT, legRate));
  const odPaxRev = hasPositiveRevenueNumber(row.odFare) || hasPositiveRevenueNumber(row.legFare)
    ? pax * odFare * fareShare
    : storedOrFallback(row.odPaxRev, 0);
  const odCargoRev = hasPositiveRevenueNumber(row.odRate) || hasPositiveRevenueNumber(row.legRate)
    ? calculateCargoRevenue(cargoT, odRate) * rateShare
    : storedOrFallback(row.odCargoRev, 0);

  const usesLegPricing = Boolean(row.applySSPricing);
  const localPaxRevenue = usesLegPricing ? legPaxRev : odPaxRev;
  const localCargoRevenue = usesLegPricing ? legCargoRev : odCargoRev;
  const fxRate = toRevenueNumber(row.pooCcyToRccy) || 1;
  const canCalculatePaxRevenue = usesLegPricing
    ? hasPositiveRevenueNumber(row.legFare)
    : hasPositiveRevenueNumber(row.odFare) || hasPositiveRevenueNumber(row.legFare);
  const canCalculateCargoRevenue = usesLegPricing
    ? hasPositiveRevenueNumber(row.legRate)
    : hasPositiveRevenueNumber(row.odRate) || hasPositiveRevenueNumber(row.legRate);

  const rccyPaxRev = canCalculatePaxRevenue
    ? localPaxRevenue * fxRate
    : storedOrFallback(
      row.fnlRccyPaxRev,
      storedOrFallback(usesLegPricing ? row.rccyLegPaxRev : row.rccyOdPaxRev, localPaxRevenue)
    );
  const rccyCargoRev = canCalculateCargoRevenue
    ? localCargoRevenue * fxRate
    : storedOrFallback(
      row.fnlRccyCargoRev,
      storedOrFallback(usesLegPricing ? row.rccyLegCargoRev : row.rccyOdCargoRev, localCargoRevenue)
    );

  return {
    pax,
    cargoT,
    fnlRccyPaxRev: rccyPaxRev,
    fnlRccyCargoRev: rccyCargoRev,
    fnlRccyTotalRev: rccyPaxRev + rccyCargoRev,
    odPaxRev,
    odCargoRev,
    odTotalRev: odPaxRev + odCargoRev,
    legPaxRev,
    legCargoRev,
    legTotalRev: legPaxRev + legCargoRev,
  };
}

export function aggregateRevenueMetric(metricRows, metricKey) {
  const rows = Array.isArray(metricRows) ? metricRows : [];
  const sumMetric = (key) => rows.reduce(
    (total, row) => total + toRevenueNumber(row?.[key]),
    0
  );

  if (metricKey === "averageFare") {
    const pax = sumMetric("pax");
    return pax > 0 ? sumMetric("fnlRccyPaxRev") / pax : 0;
  }

  if (metricKey === "averageCargoRate") {
    const cargoKg = sumMetric("cargoT") * KG_PER_TONNE;
    return cargoKg > 0 ? sumMetric("fnlRccyCargoRev") / cargoKg : 0;
  }

  return sumMetric(metricKey);
}
