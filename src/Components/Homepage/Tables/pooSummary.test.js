import test from "node:test";
import assert from "node:assert/strict";

import { buildPooOdSummaryRows, groupPooRecordsIntoSections } from "./pooSummary.js";

const baseRow = (overrides) => ({
  _id: overrides._id,
  rowKey: overrides.rowKey || overrides._id,
  odGroupKey: overrides.odGroupKey,
  trafficType: overrides.trafficType,
  displayType: overrides.displayType || overrides.identifier,
  poo: "DEL",
  od: overrides.od,
  odOrigin: overrides.odOrigin,
  odDestination: overrides.odDestination,
  odDI: overrides.odDI || "Dom",
  stops: overrides.stops || 0,
  identifier: overrides.identifier,
  sector: overrides.sector,
  legDI: overrides.legDI || "Dom",
  date: "2026-03-04T00:00:00.000Z",
  flightNumber: overrides.flightNumber,
  connectedFlightNumber: overrides.connectedFlightNumber || "",
  flightList: overrides.flightList || [overrides.flightNumber],
  timeInclLayover: overrides.timeInclLayover,
  maxPax: overrides.maxPax,
  maxCargoT: overrides.maxCargoT,
  pax: overrides.pax,
  cargoT: overrides.cargoT,
  sectorGcd: overrides.sectorGcd,
  odViaGcd: overrides.odViaGcd,
  totalGcd: overrides.totalGcd || overrides.odViaGcd,
  legFare: 0,
  legRate: 0,
  odFare: 0,
  odRate: 0,
  odPaxRev: 0,
  odCargoRev: 0,
  odTotalRev: 0,
});

const sampleRows = () => [
  baseRow({
    _id: "a100-del",
    trafficType: "leg",
    od: "DEL-BOM",
    odOrigin: "DEL",
    odDestination: "BOM",
    sector: "DEL-BOM",
    identifier: "Leg",
    odGroupKey: "leg::A100-2026-03-04",
    flightNumber: "A 100",
    timeInclLayover: "02:30",
    pax: 77,
    cargoT: 0.3,
    maxPax: 153,
    maxCargoT: 0.6,
    odViaGcd: 1200,
    sectorGcd: 1200,
  }),
  baseRow({
    _id: "del-hyd-behind",
    trafficType: "behind",
    od: "DEL-HYD",
    odOrigin: "DEL",
    odDestination: "HYD",
    sector: "DEL-BOM",
    identifier: "Behind",
    odGroupKey: "system::DEL-HYD::A100-2026-03-04::A101-2026-03-04",
    flightNumber: "A 100",
    connectedFlightNumber: "A 101",
    flightList: ["A 100", "A 101"],
    timeInclLayover: "07:10",
    pax: 0,
    cargoT: 0,
    maxPax: 128,
    maxCargoT: 0.6,
    stops: 1,
    odViaGcd: 1800,
    sectorGcd: 1200,
    totalGcd: 1800,
  }),
  baseRow({
    _id: "del-hyd-beyond",
    trafficType: "beyond",
    od: "DEL-HYD",
    odOrigin: "DEL",
    odDestination: "HYD",
    sector: "BOM-HYD",
    identifier: "Beyond",
    odGroupKey: "system::DEL-HYD::A100-2026-03-04::A101-2026-03-04",
    flightNumber: "A 101",
    connectedFlightNumber: "A 100",
    flightList: ["A 100", "A 101"],
    timeInclLayover: "07:10",
    pax: 0,
    cargoT: 0,
    maxPax: 128,
    maxCargoT: 0.6,
    stops: 1,
    odViaGcd: 1800,
    sectorGcd: 600,
    totalGcd: 1800,
  }),
  baseRow({
    _id: "del-dxb-behind",
    trafficType: "behind",
    od: "DEL-DXB",
    odOrigin: "DEL",
    odDestination: "DXB",
    odDI: "Intl",
    sector: "DEL-BOM",
    identifier: "Behind",
    odGroupKey: "system::DEL-DXB::A100-2026-03-04::A102-2026-03-04",
    flightNumber: "A 100",
    connectedFlightNumber: "A 102",
    flightList: ["A 100", "A 102"],
    timeInclLayover: "09:30",
    pax: 0,
    cargoT: 0,
    maxPax: 153,
    maxCargoT: 0.6,
    stops: 1,
    odViaGcd: 3100,
    sectorGcd: 1200,
    totalGcd: 3100,
  }),
  baseRow({
    _id: "del-dxb-beyond",
    trafficType: "beyond",
    od: "DEL-DXB",
    odOrigin: "DEL",
    odDestination: "DXB",
    odDI: "Intl",
    legDI: "Intl",
    sector: "BOM-DXB",
    identifier: "Beyond",
    odGroupKey: "system::DEL-DXB::A100-2026-03-04::A102-2026-03-04",
    flightNumber: "A 102",
    connectedFlightNumber: "A 100",
    flightList: ["A 100", "A 102"],
    timeInclLayover: "09:30",
    pax: 0,
    cargoT: 0,
    maxPax: 153,
    maxCargoT: 0.6,
    stops: 1,
    odViaGcd: 3100,
    sectorGcd: 1900,
    totalGcd: 3100,
  }),
];

test("builds collapsed POO OD rows for the 4 Mar DEL sample", () => {
  const rowsByOd = new Map(buildPooOdSummaryRows(sampleRows()).map((row) => [row.od, row]));

  assert.equal(rowsByOd.size, 3);
  assert.deepEqual(
    {
      odDI: rowsByOd.get("DEL-BOM").odDI,
      flight: rowsByOd.get("DEL-BOM").flightList.join(", "),
      stop: rowsByOd.get("DEL-BOM").displayStop,
      totalGcd: rowsByOd.get("DEL-BOM").totalGcd,
      timeInclLayover: rowsByOd.get("DEL-BOM").timeInclLayover,
      maxPax: rowsByOd.get("DEL-BOM").maxPax,
      maxCargoT: rowsByOd.get("DEL-BOM").maxCargoT,
      pax: rowsByOd.get("DEL-BOM").pax,
      cargoT: rowsByOd.get("DEL-BOM").cargoT,
    },
    {
      odDI: "Dom",
      flight: "A 100",
      stop: 0,
      totalGcd: 1200,
      timeInclLayover: "02:30",
      maxPax: 153,
      maxCargoT: 0.6,
      pax: 77,
      cargoT: 0.3,
    }
  );

  assert.deepEqual(
    {
      odDI: rowsByOd.get("DEL-HYD").odDI,
      flight: rowsByOd.get("DEL-HYD").flightList.join(", "),
      stop: rowsByOd.get("DEL-HYD").displayStop,
      totalGcd: rowsByOd.get("DEL-HYD").totalGcd,
      timeInclLayover: rowsByOd.get("DEL-HYD").timeInclLayover,
      maxPax: rowsByOd.get("DEL-HYD").maxPax,
      maxCargoT: rowsByOd.get("DEL-HYD").maxCargoT,
      pax: rowsByOd.get("DEL-HYD").pax,
      cargoT: rowsByOd.get("DEL-HYD").cargoT,
    },
    {
      odDI: "Dom",
      flight: "A 100, A 101",
      stop: "BOM",
      totalGcd: 1800,
      timeInclLayover: "07:10",
      maxPax: 128,
      maxCargoT: 0.6,
      pax: 0,
      cargoT: 0,
    }
  );

  assert.deepEqual(
    {
      odDI: rowsByOd.get("DEL-DXB").odDI,
      flight: rowsByOd.get("DEL-DXB").flightList.join(", "),
      stop: rowsByOd.get("DEL-DXB").displayStop,
      totalGcd: rowsByOd.get("DEL-DXB").totalGcd,
      timeInclLayover: rowsByOd.get("DEL-DXB").timeInclLayover,
      maxPax: rowsByOd.get("DEL-DXB").maxPax,
      maxCargoT: rowsByOd.get("DEL-DXB").maxCargoT,
      pax: rowsByOd.get("DEL-DXB").pax,
      cargoT: rowsByOd.get("DEL-DXB").cargoT,
    },
    {
      odDI: "Intl",
      flight: "A 100, A 102",
      stop: "BOM",
      totalGcd: 3100,
      timeInclLayover: "09:30",
      maxPax: 153,
      maxCargoT: 0.6,
      pax: 0,
      cargoT: 0,
    }
  );
});

test("collapsed edited connection rows keep schedule time and do not double count traffic", () => {
  const editedRows = sampleRows().map((row) => {
    if (row._id === "a100-del") return { ...row, pax: 65, cargoT: 0.1 };
    if (row.od === "DEL-HYD") return { ...row, pax: 5, cargoT: 0.1 };
    return row;
  });
  const rowsByOd = new Map(buildPooOdSummaryRows(editedRows).map((row) => [row.od, row]));

  assert.equal(rowsByOd.get("DEL-BOM").pax, 65);
  assert.equal(rowsByOd.get("DEL-BOM").cargoT, 0.1);
  assert.equal(rowsByOd.get("DEL-HYD").timeInclLayover, "07:10");
  assert.equal(rowsByOd.get("DEL-DXB").timeInclLayover, "09:30");
  assert.equal(rowsByOd.get("DEL-HYD").pax, 5);
  assert.equal(rowsByOd.get("DEL-HYD").cargoT, 0.1);
});

test("collapsed OD D/I becomes Intl when any connected behind or beyond row is Intl", () => {
  const rows = [
    baseRow({
      _id: "a100-del",
      trafficType: "leg",
      od: "DEL-BOM",
      odOrigin: "DEL",
      odDestination: "BOM",
      sector: "DEL-BOM",
      identifier: "Leg",
      odGroupKey: "leg::A100-2026-03-04",
      flightNumber: "A 100",
      pax: 77,
      cargoT: 0.3,
      maxPax: 153,
      maxCargoT: 0.6,
      odViaGcd: 1200,
      sectorGcd: 1200,
      odDI: "Dom",
    }),
    baseRow({
      _id: "del-hyd-behind",
      trafficType: "behind",
      od: "DEL-HYD",
      odOrigin: "DEL",
      odDestination: "HYD",
      sector: "DEL-BOM",
      identifier: "Behind",
      odGroupKey: "system::DEL-HYD::A100-2026-03-04::A101-2026-03-04",
      flightNumber: "A 100",
      connectedFlightNumber: "A 101",
      flightList: ["A 100", "A 101"],
      stops: 1,
      odViaGcd: 1800,
      sectorGcd: 1200,
      totalGcd: 1800,
      odDI: "Dom",
    }),
    baseRow({
      _id: "del-hyd-beyond",
      trafficType: "beyond",
      od: "DEL-HYD",
      odOrigin: "DEL",
      odDestination: "HYD",
      sector: "BOM-HYD",
      identifier: "Beyond",
      odGroupKey: "system::DEL-HYD::A100-2026-03-04::A101-2026-03-04",
      flightNumber: "A 101",
      connectedFlightNumber: "A 100",
      flightList: ["A 100", "A 101"],
      stops: 1,
      odViaGcd: 1800,
      sectorGcd: 600,
      totalGcd: 1800,
      odDI: "Dom",
      legDI: "Intl",
    }),
  ];

  const rowsByOd = new Map(buildPooOdSummaryRows(rows).map((row) => [row.od, row]));

  assert.equal(rowsByOd.get("DEL-HYD").odDI, "Intl");
});

test("groupPooRecordsIntoSections surfaces OD rows alongside legs for the selected POO", () => {
  const sections = groupPooRecordsIntoSections(sampleRows(), "DEL");

  assert.equal(sections.legs.length, 1);
  assert.equal(sections.ods.length, 2);
  assert.deepEqual(
    sections.ods.map((row) => row.od).sort(),
    ["DEL-DXB", "DEL-HYD"]
  );
  assert.ok(sections.ods.every((row) => row.flightList.length >= 2));
  assert.ok(sections.ods.every((row) => row.timeInclLayover));
});

test("groupPooRecordsIntoSections keeps transit rows out of OD pairs", () => {
  const rows = [
    ...sampleRows(),
    baseRow({
      _id: "transit-fl",
      trafficType: "transit_fl",
      od: "DEL-HYD",
      odOrigin: "DEL",
      odDestination: "HYD",
      sector: "DEL-BOM",
      identifier: "Transit FL",
      odGroupKey: "user::DEL-HYD::A100-2026-03-04::A101-2026-03-04",
      flightNumber: "A 100",
      connectedFlightNumber: "A 101",
      flightList: ["A 100", "A 101"],
      stops: 1,
      pax: 3,
      cargoT: 0,
      maxPax: 128,
      maxCargoT: 0.6,
      odViaGcd: 1800,
      sectorGcd: 1200,
      totalGcd: 1800,
    }),
    baseRow({
      _id: "transit-sl",
      trafficType: "transit_sl",
      od: "DEL-HYD",
      odOrigin: "DEL",
      odDestination: "HYD",
      sector: "BOM-HYD",
      identifier: "Transit SL",
      odGroupKey: "user::DEL-HYD::A100-2026-03-04::A101-2026-03-04",
      flightNumber: "A 101",
      connectedFlightNumber: "A 100",
      flightList: ["A 100", "A 101"],
      stops: 1,
      pax: 3,
      cargoT: 0,
      maxPax: 128,
      maxCargoT: 0.6,
      odViaGcd: 1800,
      sectorGcd: 600,
      totalGcd: 1800,
    }),
  ];

  const sections = groupPooRecordsIntoSections(rows, "DEL");

  assert.equal(sections.ods.length, 2);
  assert.equal(sections.transits.length, 1);
  assert.equal(sections.transits[0].pax, 3);
});

test("groupPooRecordsIntoSections keeps same-OD leg flights as separate visible rows", () => {
  const rows = [
    ...sampleRows(),
    baseRow({
      _id: "a200-del",
      trafficType: "leg",
      od: "DEL-BOM",
      odOrigin: "DEL",
      odDestination: "BOM",
      sector: "DEL-BOM",
      identifier: "Leg",
      odGroupKey: "leg::A200-2026-03-04",
      flightId: "A200-2026-03-04",
      flightNumber: "A 200",
      timeInclLayover: "02:35",
      pax: 60,
      cargoT: 0.2,
      maxPax: 120,
      maxCargoT: 0.4,
      odViaGcd: 1200,
      sectorGcd: 1200,
    }),
  ];

  const sections = groupPooRecordsIntoSections(rows, "DEL");

  assert.equal(sections.legs.length, 2);
  assert.deepEqual(
    sections.legs.map((row) => row.flightNumber).sort(),
    ["A 100", "A 200"]
  );
});
