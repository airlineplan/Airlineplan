import test from "node:test";
import assert from "node:assert/strict";

import { buildPooCurrencyOptions } from "./pooCurrencyOptions.js";

test("POO currency options use only FX config currencies", () => {
  const options = buildPooCurrencyOptions({
    meta: {
      reportingCurrency: "usd",
      currencyCodes: ["inr"],
    },
    records: [],
  });

  assert.deepEqual(options, ["INR", "USD"]);
});

test("POO currency options ignore station currency, selected value, and row values", () => {
  const options = buildPooCurrencyOptions({
    selectedPooCurrency: "eur",
    meta: {
      stationCurrency: "inr",
      reportingCurrency: "usd",
      currencyCodes: ["usd", "aed"],
    },
    records: [{ pooCcy: "gbp" }, { pooCcy: "usd" }],
  });

  assert.deepEqual(options, ["AED", "USD"]);
});

test("POO currency options normalize FX config codes", () => {
  const options = buildPooCurrencyOptions({
    meta: {
      reportingCurrency: " usd ",
      currencyCodes: [" cad ", "cad"],
    },
  });

  assert.deepEqual(options, ["CAD", "USD"]);
});
