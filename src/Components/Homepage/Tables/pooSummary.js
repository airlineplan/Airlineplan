function numericValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeDi(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "intl" || normalized === "international") return "Intl";
  return "Dom";
}

function isIntlValue(value) {
  return normalizeDi(value) === "Intl";
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function getDateKey(row) {
  if (!row?.date) return "";
  const parsed = new Date(row.date);
  return Number.isNaN(parsed.getTime()) ? String(row.date) : parsed.toISOString().slice(0, 10);
}

function getFlightList(rows) {
  return uniqueValues(
    rows.flatMap((row) => {
      if (Array.isArray(row.flightList) && row.flightList.length) return row.flightList;
      return [row.flightNumber, row.connectedFlightNumber];
    })
  );
}

function getPrimaryRow(rows) {
  return (
    rows.find((row) => String(row.trafficType || "").toLowerCase() === "behind") ||
    rows.find((row) => String(row.displayType || "").toLowerCase() === "behind") ||
    rows.find((row) => String(row.trafficType || "").toLowerCase() === "leg") ||
    rows[0]
  );
}

function getTransferStation(rows, primary) {
  if (numericValue(primary?.stops) === 0) return 0;

  const odEndpoints = new Set([
    String(primary?.odOrigin || "").trim().toUpperCase(),
    String(primary?.odDestination || "").trim().toUpperCase(),
  ].filter(Boolean));

  const candidates = uniqueValues(
    rows.flatMap((row) => String(row.sector || "").split("-"))
  ).map((station) => station.toUpperCase());

  return candidates.find((station) => !odEndpoints.has(station)) || primary?.stops || "";
}

function getSharedNumber(rows, field, primary) {
  const values = rows
    .map((row) => numericValue(row[field]))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!values.length) return numericValue(primary?.[field]);
  return Math.min(...values);
}

function getCollapsedRevenue(rows, field, primary) {
  if (numericValue(primary?.stops) === 0) return numericValue(primary?.[field]);
  return numericValue(primary?.[field]);
}

function getCollapsedDi(rows, primary) {
  const directDi = rows.find((row) => isIntlValue(row.odDI) || isIntlValue(row.legDI));
  if (directDi) return "Intl";

  return normalizeDi(primary?.odDI || primary?.legDI);
}

function buildCollapsedRow(rows) {
  const primary = getPrimaryRow(rows);
  const flightList = getFlightList(rows);
  const stops = getTransferStation(rows, primary);
  const odDI = getCollapsedDi(rows, primary);

  return {
    ...primary,
    _id: primary._id,
    sourceRowIds: rows.map((row) => row._id).filter(Boolean),
    isCollapsedPooRow: rows.length > 1,
    odDI,
    displayStop: stops,
    flightList,
    flightNumber: flightList[0] || primary.flightNumber,
    connectedFlightNumber: flightList[1] || primary.connectedFlightNumber || "",
    totalGcd: getSharedNumber(rows, "totalGcd", primary) || getSharedNumber(rows, "odViaGcd", primary),
    odViaGcd: getSharedNumber(rows, "odViaGcd", primary),
    maxPax: getSharedNumber(rows, "maxPax", primary),
    maxCargoT: getSharedNumber(rows, "maxCargoT", primary),
    pax: numericValue(primary.pax),
    cargoT: numericValue(primary.cargoT),
    paxRevenue: getCollapsedRevenue(rows, "odPaxRev", primary) || getCollapsedRevenue(rows, "legPaxRev", primary),
    cargoRevenue: getCollapsedRevenue(rows, "odCargoRev", primary) || getCollapsedRevenue(rows, "legCargoRev", primary),
    totalRevenue: getCollapsedRevenue(rows, "odTotalRev", primary) || getCollapsedRevenue(rows, "legTotalRev", primary),
  };
}

export function buildPooOdSummaryRows(rows = []) {
  const groups = new Map();

  rows.forEach((row) => {
    const key = [
      String(row.poo || "").trim().toUpperCase(),
      getDateKey(row),
      String(row.od || "").trim().toUpperCase(),
      row.odGroupKey || row.rowKey || row._id,
    ].join("|");

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  return [...groups.values()].map(buildCollapsedRow);
}

/**
 * Group raw POO records into sections for the redesigned POO view.
 * Filters by selectedPoo and groups into: legs, ODs (one-stop), transits, interline.
 */
export function groupPooRecordsIntoSections(records, selectedPoo) {
  const poo = String(selectedPoo || "").trim().toUpperCase();
  const pooRecords = poo ? records.filter((r) => String(r.poo || "").trim().toUpperCase() === poo) : records;

  const legRows = [];
  const odLikeRows = [];
  const transitRows = [];
  const interlineRows = [];

  pooRecords.forEach((row) => {
    const tt = String(row.trafficType || "").toLowerCase();
    const hasInterline = String(row.interline || "").trim();
    const hasCodeshare = String(row.codeshare || "").trim();

    if (hasInterline || hasCodeshare) {
      interlineRows.push(row);
    } else if (tt === "leg") {
      legRows.push(row);
    } else if (tt === "transit_fl" || tt === "transit_sl") {
      transitRows.push(row);
    } else if (
      tt === "behind" ||
      tt === "beyond" ||
      Number(row.stops || 0) >= 1 ||
      String(row.displayType || "").toLowerCase() === "behind" ||
      String(row.displayType || "").toLowerCase() === "beyond"
    ) {
      odLikeRows.push(row);
    }
  });

  // Keep dated flight instances distinct even when multiple flights operate the same OD.
  const legsByOd = new Map();
  legRows.forEach((row) => {
    const key = [
      String(row.od || "").trim().toUpperCase(),
      row.flightId || row.flightNumber || row.rowKey || row._id,
    ].join("|");
    if (!legsByOd.has(key)) legsByOd.set(key, []);
    legsByOd.get(key).push(row);
  });
  const collapsedLegs = [...legsByOd.values()].map((group) => {
    const primary = group[0];
    return {
      ...primary,
      _rows: group,
      flightList: getFlightList(group),
      displayStop: 0,
      totalGcd: numericValue(primary.sectorGcd) || numericValue(primary.odViaGcd) || numericValue(primary.totalGcd),
    };
  });

  // Group ODs by odGroupKey — collapse behind+beyond pairs into single OD row.
  // If the backing rows are incomplete, fall back to any stop-based OD-like rows.
  const collapsedOds = buildPooOdSummaryRows(odLikeRows);

  // Group transits by odGroupKey
  const transitGroups = new Map();
  transitRows.forEach((row) => {
    const key = row.odGroupKey || `${row.od}::${row.flightNumber}::${row.connectedFlightNumber}`;
    if (!transitGroups.has(key)) transitGroups.set(key, []);
    transitGroups.get(key).push(row);
  });
  const collapsedTransits = [...transitGroups.values()].map(buildCollapsedRow);

  return {
    legs: collapsedLegs,
    ods: collapsedOds,
    transits: collapsedTransits,
    interlines: interlineRows,
  };
}
