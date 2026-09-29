import test from "node:test";
import assert from "node:assert/strict";
import { resolveHomeTimezone, normalizeTimezoneKey, TIMEZONES } from "./viewTimezoneUtils.js";

test("resolveHomeTimezone matches exact timezones like UTC+7:00", () => {
  assert.equal(resolveHomeTimezone("UTC+7:00"), "UTC+7:00");
  assert.equal(resolveHomeTimezone("UTC+8:00"), "UTC+8:00");
  assert.equal(resolveHomeTimezone("UTC-5:00"), "UTC-5:00");
});

test("resolveHomeTimezone normalizes padded zeros like UTC+07:00 to UTC+7:00", () => {
  assert.equal(resolveHomeTimezone("UTC+07:00"), "UTC+7:00");
  assert.equal(resolveHomeTimezone("utc+08:00"), "UTC+8:00");
  assert.equal(resolveHomeTimezone("UTC-05:00"), "UTC-5:00");
});

test("resolveHomeTimezone trims surrounding whitespace", () => {
  assert.equal(resolveHomeTimezone("  UTC+7:00  "), "UTC+7:00");
});

test("resolveHomeTimezone falls back to default when empty or unknown", () => {
  assert.equal(resolveHomeTimezone(""), "UTC+5:30");
  assert.equal(resolveHomeTimezone(null), "UTC+5:30");
  assert.equal(resolveHomeTimezone(undefined), "UTC+5:30");
  assert.equal(resolveHomeTimezone("INVALID_TZ"), "UTC+5:30");
});

test("TIMEZONES list contains Bangkok UTC+7:00 and standard intervals", () => {
  assert.ok(TIMEZONES.includes("UTC+7:00"));
  assert.ok(TIMEZONES.includes("UTC+5:30"));
  assert.ok(TIMEZONES.includes("UTC+0:00"));
});
