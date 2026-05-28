import test from "node:test";
import assert from "node:assert/strict";

import { buildPooCurrencyOptions } from "./pooCurrencyOptions.js";

test("POO currency options include common currencies when no rows are loaded", () => {
  const options = buildPooCurrencyOptions({
    meta: {
      reportingCurrency: "usd",
      currencyCodes: [],
    },
    records: [],
  });

  assert.deepEqual(options, ["AED", "EUR", "GBP", "INR", "JPY", "USD"]);
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

  assert.deepEqual(options, ["AED", "EUR", "GBP", "INR", "JPY", "USD"]);
});

test("POO currency options normalize custom user-entered codes", () => {
  const options = buildPooCurrencyOptions({
    selectedPooCurrency: " cad ",
    meta: {
      reportingCurrency: "u$d",
    },
  });

  assert.deepEqual(options, ["AED", "CAD", "EUR", "GBP", "INR", "JPY", "USD"]);
});
