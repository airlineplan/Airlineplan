import test from "node:test";
import assert from "node:assert/strict";
import { isRetryableApiError, requestWithRetry } from "./apiRetry.js";

test("retries a temporary server failure and returns the next response", async () => {
  let attempts = 0;
  const response = await requestWithRetry(async () => {
    attempts += 1;
    if (attempts === 1) {
      throw { response: { status: 503 } };
    }
    return { data: { ok: true } };
  }, [0]);

  assert.equal(attempts, 2);
  assert.deepEqual(response.data, { ok: true });
});

test("does not retry authorization or validation failures", async () => {
  let attempts = 0;

  await assert.rejects(
    requestWithRetry(async () => {
      attempts += 1;
      throw { response: { status: 403 } };
    }, [0, 0])
  );

  assert.equal(attempts, 1);
});

test("treats network and server failures as retryable but not cancellations", () => {
  assert.equal(isRetryableApiError({}), true);
  assert.equal(isRetryableApiError({ response: { status: 500 } }), true);
  assert.equal(isRetryableApiError({ response: { status: 429 } }), true);
  assert.equal(isRetryableApiError({ response: { status: 400 } }), false);
  assert.equal(isRetryableApiError({ code: "ERR_CANCELED" }), false);
});
