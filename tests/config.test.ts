import { test } from "node:test";
import assert from "node:assert/strict";
import { exportConfig, importConfig, mergeSettings } from "../electron/config";
import type { Settings } from "../shared/types";
const settings: Settings = { geminiKey: "test-gemini", openaiKey: "test-openai", elevenKey: "test-eleven", geminiModel: "gemini-test", model: "openai-test", voiceId: "voice-123", voiceModel: "voice-test" };

test("default config export omits all keys and import preserves local credentials", () => {
  const json = JSON.stringify(exportConfig(settings, false));
  assert.ok(!json.includes("Key"));
  assert.ok(!json.includes("test-openai"));
  const local = { ...settings, openaiKey: "local-openai", model: "old-model" };
  const restored = importConfig("\uFEFF" + json, local);
  assert.equal(restored.openaiKey, "local-openai");
  assert.equal(restored.model, settings.model);
  assert.equal(restored.voiceId, settings.voiceId);
  assert.equal(local.model, "old-model");
});
test("explicit key export roundtrips settings and blank fields keep current keys", () => {
  const local = { ...settings, geminiKey: "", elevenKey: "", openaiKey: "" };
  assert.deepEqual(importConfig(JSON.stringify(exportConfig(settings, true)), local), settings);
  assert.deepEqual(mergeSettings(settings, local), settings);
});
test("invalid or unsupported config is rejected without changing current settings or leaking input", () => {
  const original = structuredClone(settings);
  for (const raw of ["{broken", JSON.stringify({ ...exportConfig(settings, true), version: 2 }), JSON.stringify({ app: "other", version: 1, settings }), JSON.stringify({ app: "hbg-shorts-studio", version: 1, settings: { ...settings, model: 123 } })]) {
    assert.throws(() => importConfig(raw, settings), e => e instanceof Error && e.message.includes("không hợp lệ") && !e.message.includes(settings.openaiKey));
  }
  assert.deepEqual(settings, original);
});
