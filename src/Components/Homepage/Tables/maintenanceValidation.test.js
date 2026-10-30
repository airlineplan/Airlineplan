import assert from "node:assert/strict";
import { test } from "node:test";
import { ctdChanges, ctdError, ctdOnDate, matrixErrors } from "./maintenanceValidation.js";
test("CTD editing overwrites later saved changes like FX rates", () => {
  const points = [{ metric: "thrust", effectiveDate: "2026-12-01T00:00:00Z", value: 24 }];
  const pending = [{ esn: "A", metric: "thrust", date: "2026-11-01", value: 23 }];
  assert.equal(ctdOnDate(points, pending, "A", "thrust", "2026-11-30"), 23);
  assert.equal(ctdOnDate(points, pending, "A", "thrust", "2026-12-01"), 23);
  assert.equal(ctdChanges(points, pending, "A", "thrust").has("2026-12-01"), false);
  assert.equal(ctdOnDate(points, [...pending, { esn: "A", metric: "thrust", date: "2026-12-15", value: 25 }], "A", "thrust", "2026-12-15"), 25);
  assert.equal(ctdOnDate(points, pending, "B", "thrust", "2026-12-01"), 24);
  assert.ok(ctdError("thrust", 22.5)); assert.ok(ctdError("derate", 101)); assert.ok(ctdError("condition", ""));
});
test("Severity Matrix UI validation catches duplicate columns and blank cells", () => {
  const matrix = { columns: [{ condition: "Normal", thrust: 0, derate: 0 }], rows: [{ hc: 1, rates: [0] }, { hc: 3, rates: [0] }] };
  assert.deepEqual(matrixErrors(matrix), []);
  assert.ok(matrixErrors({ ...matrix, rows: [{ hc: 1, rates: [""] }, { hc: 1, rates: [0] }] }).length >= 2);
});
