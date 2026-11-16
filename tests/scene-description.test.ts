import { test } from "node:test";
import assert from "node:assert/strict";
import { sceneDescription } from "../shared/scene-description";
import { createProject, voiceSignature, type Beat, type Asset } from "../shared/types";
import { projectSchema } from "../electron/validation";

const beat: Beat = { id: "scene", assetId: "a", voice: "Đội ngũ phối hợp", caption: "Teamwork", overlay: "", durationMs: 3000, sourceInMs: 5000 };
test("existing scenes use the matching shot, missing footage brief, or narration fallback", () => {
  const asset: Asset = { id: "a", path: "a.mp4", name: "a", kind: "video", width: 1920, height: 1080, durationMs: 10000,
    description: JSON.stringify([{ startMs: 0, endMs: 4000, description: "Toàn cảnh sân khấu" }, { startMs: 4000, endMs: 9000, description: "Cận cảnh kỹ thuật viên kiểm tra thiết bị" }]) };
  assert.equal(sceneDescription(beat, asset), "Cận cảnh kỹ thuật viên kiểm tra thiết bị");
  const missing = { suggestedFootage: "Trung cảnh đội ngũ bàn giao công việc", reason: "Thiếu", reanalyzeSuggestion: "" };
  assert.equal(sceneDescription({ ...beat, missingFootage: missing }, asset), missing.suggestedFootage);
  assert.equal(sceneDescription({ ...beat, placeholderFor: missing }), missing.suggestedFootage);
  assert.match(sceneDescription(beat), /Đội ngũ phối hợp/);
  assert.equal(sceneDescription({ ...beat, sceneDescription: "" }, asset), "");
});

test("scene descriptions persist without changing voice signature or caption", () => {
  const p = createProject(); p.beats = [{ ...beat }];
  const signature = voiceSignature(p);
  p.beats[0].sceneDescription = "Trung cảnh cả đội kiểm tra sân khấu trước sự kiện.";
  const saved = projectSchema.parse(JSON.parse(JSON.stringify(p)));
  assert.equal(saved.beats[0].sceneDescription, p.beats[0].sceneDescription);
  assert.equal(voiceSignature(saved), signature);
  assert.equal(saved.beats[0].caption, beat.caption);
});
