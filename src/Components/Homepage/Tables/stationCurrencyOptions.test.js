import test from "node:test";
import assert from "node:assert/strict";

import { buildStationCurrencyOptions } from "./stationCurrencyOptions.js";

test("station currency options come from the FX configuration", () => {
  const options = buildStationCurrencyOptions({
    reportingCurrency: "inr",
    currencyCodes: ["INR", "aed"],
  });

  assert.deepEqual(options, ["INR", "AED"]);
});

test("station currency options normalize and deduplicate FX codes", () => {
  const options = buildStationCurrencyOptions({
    reportingCurrency: " usd ",
    currencyCodes: [" c@ad ", "CAD", "", "12"],
  });

  assert.deepEqual(options, ["USD", "CAD"]);
});

test("station currency options fall back to INR when FX config is empty", () => {
  assert.deepEqual(buildStationCurrencyOptions(), ["INR"]);
});

test("station currency options exclude currencies found only in historical station rows", () => {
  const options = buildStationCurrencyOptions(
    {
      reportingCurrency: "THB",
      currencyCodes: ["THB", "AUD", "INR", "HKD", "SGD", "JPY"],
    },
    [
      { stationName: "OLD1", currencyCode: "USD" },
      { stationName: "OLD2", currencyCode: "AED" },
    ]
  );

  assert.deepEqual(options, ["THB", "AUD", "INR", "HKD", "SGD", "JPY"]);
  assert.equal(options.includes("USD"), false);
  assert.equal(options.includes("AED"), false);
});

test("station currency options ignore legacy station currency fields", () => {
  const options = buildStationCurrencyOptions(
    {},
    [{ stationName: "AUH", currency: "aed" }, { stationName: "CEI", ccy: "thb" }]
  );

  assert.deepEqual(options, ["INR"]);
});
