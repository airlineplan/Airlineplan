import test from "node:test";
import assert from "node:assert/strict";

import { buildPooCurrencyOptions } from "./pooCurrencyOptions.js";

test("POO currency options include reporting currency when no rows are loaded", () => {
  const options = buildPooCurrencyOptions({
    meta: {
      reportingCurrency: "usd",
      currencyCodes: [],
    },
    records: [],
  });

  assert.deepEqual(options, ["USD"]);
});

test("POO currency options merge FX config, station currency, selected value, and row values", () => {
  const options = buildPooCurrencyOptions({
    selectedPooCurrency: "eur",
    meta: {
      stationCurrency: "inr",
      reportingCurrency: "usd",
      currencyCodes: ["usd", "aed"],
    },
    records: [{ pooCcy: "gbp" }, { pooCcy: "usd" }],
  });

  assert.deepEqual(options, ["AED", "EUR", "GBP", "INR", "USD"]);
});
