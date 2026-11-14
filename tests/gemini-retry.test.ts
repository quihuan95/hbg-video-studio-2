import { test } from "node:test";
import assert from "node:assert/strict";
import { retryGemini } from "../shared/gemini-retry";

test("Gemini retries 503 with bounded backoff and returns success", async () => {
  let calls = 0;
  const delays: number[] = [];
  const result = await retryGemini(async () => {
    if (++calls < 4) throw { status: 503 };
    return "ok";
  }, undefined, undefined, async ms => { delays.push(ms); });
  assert.equal(result, "ok");
  assert.deepEqual(delays, [5000, 10000, 20000]);
});
test("Gemini stops after four attempts and never retries other errors", async () => {
  let calls = 0;
  await assert.rejects(retryGemini(async () => { calls++; throw { status: 503 }; }, undefined, undefined, async () => {}), /4 lần/);
  assert.equal(calls, 4);
  calls = 0;
  await assert.rejects(retryGemini(async () => { calls++; throw new Error("400"); }));
  assert.equal(calls, 1);
});
test("Gemini cancellation prevents another attempt", async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(retryGemini(async () => { calls++; throw { status: 503 }; }, controller.signal, undefined, async () => { controller.abort(); }));
  assert.equal(calls, 1);
});
