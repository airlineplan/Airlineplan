import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateRevenueMetric,
  getRowRevenueMetrics,
} from "./revenueMetrics.js";

test("allocates BHJ-AVR passenger and cargo revenue across both connecting legs", () => {
  const common = {
    stops: 1,
    pax: 29,
    cargoT: 1,
    odFare: 6000,
    odRate: 100,
    odViaGcd: 700,
    pooCcyToRccy: 1,
    applySSPricing: false,
  };
  const firstLeg = getRowRevenueMetrics({
    ...common,
    trafficType: "transit_fl",
    sectorGcd: 300,
    fnlRccyPaxRev: 174000,
    fnlRccyCargoRev: 100000,
  });
  const secondLeg = getRowRevenueMetrics({
    ...common,
    trafficType: "transit_sl",
    sectorGcd: 400,
    fnlRccyPaxRev: 174000,
    fnlRccyCargoRev: 100000,
  });

  assert.equal(firstLeg.fnlRccyPaxRev + secondLeg.fnlRccyPaxRev, 174000);
  assert.equal(firstLeg.fnlRccyCargoRev + secondLeg.fnlRccyCargoRev, 100000);
});

test("uses total GCD and traffic type when legacy connecting rows omit stops and OD-via GCD", () => {
  const firstLeg = getRowRevenueMetrics({
    trafficType: "behind",
    pax: 29,
    odFare: 6000,
    sectorGcd: 300,
    totalGcd: 700,
    pooCcyToRccy: 1,
  });
  const secondLeg = getRowRevenueMetrics({
    trafficType: "beyond",
    pax: 29,
    odFare: 6000,
    sectorGcd: 400,
    totalGcd: 700,
    pooCcyToRccy: 1,
  });

  assert.equal(firstLeg.fnlRccyPaxRev + secondLeg.fnlRccyPaxRev, 174000);
});

test("calculates weighted average fare and per-kg cargo rate from period totals", () => {
  const rows = [
    {
      pax: 1000,
      cargoT: 5,
      fnlRccyPaxRev: 3500000,
      fnlRccyCargoRev: 177550,
    },
    {
      pax: 1782,
      cargoT: 3.89,
      fnlRccyPaxRev: 6239775,
      fnlRccyCargoRev: 138100,
    },
  ];

  assert.equal(aggregateRevenueMetric(rows, "pax"), 2782);
  assert.equal(aggregateRevenueMetric(rows, "fnlRccyPaxRev"), 9739775);
  assert.equal(
    aggregateRevenueMetric(rows, "averageFare"),
    9739775 / 2782
  );
  assert.equal(
    aggregateRevenueMetric(rows, "averageCargoRate"),
    315650 / 8890
  );
});
