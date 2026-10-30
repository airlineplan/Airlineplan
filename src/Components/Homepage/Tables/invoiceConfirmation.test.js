import assert from "node:assert/strict";
import { test } from "node:test";
import { invoiceLineFromCandidate, invoiceReviewTotal } from "./invoiceConfirmation.js";

test("sample invoice suggestions preserve amounts and select the correct engine account", () => {
  const settings = [{ mrAccId: "ENG1", schMxEvent: "Engine PR", sn: "749014" }, { mrAccId: "ENG2", schMxEvent: "Engine PR", sn: "749015" }];
  const line = invoiceLineFromCandidate({ schMxEvent: "Engine PR", sn: "749015", rate: 190.33, utilisation: 269.36, amount: 51267.29 }, settings);
  assert.equal(line.mrAccId, "ENG2"); assert.equal(line.rate, 190.33); assert.equal(line.utilisation, 269.36); assert.equal(line.contribution, 51267.29);
  assert.equal(line.extracted.amount, 51267.29);
  assert.equal(invoiceLineFromCandidate({ schMxEvent: "Engine PR", rate: 0, utilisation: 0, amount: 0 }, settings).mrAccId, "");
  assert.equal(invoiceLineFromCandidate({ schMxEvent: "Engine PR", sn: "749015" }, [...settings, { ...settings[1], mrAccId: "DUP" }]).mrAccId, "");
});
test("sample confirmed review lines total exactly USD 187327.91", () => {
  assert.equal(invoiceReviewTotal([12503.58, 8103.30, 4603.06, 30453.83, 27853, 51267.29, 46623.50, 5920.35].map(contribution => ({ contribution }))), 187327.91);
});
