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
