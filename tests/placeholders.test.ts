import { test } from "node:test";
import assert from "node:assert/strict";
import { createProject, type Asset } from "../shared/types";
import { applyPlaceholders } from "../shared/placeholders";
import { projectSchema } from "../electron/validation";
import { validateTimeline } from "../shared/video";
import { validateUniqueScenes } from "../shared/unique-scenes";
import { capcutTimeline } from "../electron/capcut-timeline";

test("placeholders preserve narration and timing, export as photos, and restore missing footage", async () => {
  const p = createProject(); p.duration = 6; p.useFootagePlaceholders = true;
  p.beats = [1, 2].map(n => ({ id: String(n), assetId: "", sourceInMs: 0, durationMs: 3000,
    voice: `Lời đọc ${n}`, caption: `Phụ đề ${n}`, overlay: "",
    missingFootage: { suggestedFootage: `Cảnh cần bổ sung ${n}`, reason: "Thiếu hình", reanalyzeSuggestion: "" } }));
  const original = structuredClone(p.beats);
  let calls = 0;
  const create = async (n: number): Promise<Asset> => {
    calls++;
    return { id: `placeholder-${n}`, name: `Cảnh ${n}`, path: `placeholder-${n}.png`, kind: "image", width: 720, height: 1280, durationMs: 0, placeholder: true };
  };
  await applyPlaceholders(p, create);
  assert.equal(calls, 2);
  assert.deepEqual(p.beats.map(b => [b.voice, b.caption, b.durationMs]), original.map(b => [b.voice, b.caption, b.durationMs]));
  assert.doesNotThrow(() => validateTimeline(p));
  assert.doesNotThrow(() => validateUniqueScenes(p, []));
  await applyPlaceholders(p, create);
  assert.equal(calls, 2, "existing placeholders are reused");
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(p)));
  const draft = capcutTimeline({ materials: {} }, restored, new Map(p.assets.map(a => [a.path, `Resources/${a.path}`])));
  assert.equal(draft.materials.videos.length, 2);
  assert.ok(draft.materials.videos.every((a: any) => a.type === "photo"));
  assert.deepEqual(draft.tracks[0].segments.map((s: any) => s.target_timerange), [{ start: 0, duration: 3000000 }, { start: 3000000, duration: 3000000 }]);
  restored.useFootagePlaceholders = false;
  await applyPlaceholders(restored, create);
  assert.deepEqual(restored.beats, original);
  assert.equal(restored.assets.length, 0);
  assert.throws(() => validateTimeline(restored), /chờ bổ sung/);
});

test("turning off placeholders keeps manually assigned real footage", async () => {
  const p = createProject();
  p.assets = [{ id: "real", path: "real.mp4", name: "Real", kind: "video", durationMs: 6000, width: 100, height: 100 }];
  p.beats = [{ id: "beat", assetId: "real", sourceInMs: 1000, durationMs: 3000, voice: "Lời", caption: "", overlay: "",
    placeholderFor: { suggestedFootage: "Hình", reason: "Thiếu", reanalyzeSuggestion: "" } }];
  await applyPlaceholders(p, async () => { throw new Error("Should not generate"); });
  assert.equal(p.beats[0].assetId, "real");
  assert.equal(p.beats[0].sourceInMs, 1000);
  assert.equal(p.beats[0].placeholderFor, undefined);
});

test("per-scene placeholder overrides global setting and restores the original source cut", async () => {
  const p = createProject(); p.useFootagePlaceholders = false;
  p.assets = [{ id: "real", path: "real.mp4", name: "Real", kind: "video", durationMs: 10000, width: 100, height: 100 }];
  p.beats = [{ id: "beat", assetId: "real", sourceInMs: 2500, durationMs: 3000, voice: "Lời", caption: "", overlay: "", usePlaceholder: true }];
  const create = async (): Promise<Asset> => ({ id: "ph", path: "ph.png", name: "Placeholder", kind: "image", durationMs: 0, width: 100, height: 100, placeholder: true });
  await applyPlaceholders(p, create);
  assert.equal(p.beats[0].assetId, "ph");
  assert.equal(p.beats[0].sourceInMs, 0);
  const restored = projectSchema.parse(JSON.parse(JSON.stringify(p)));
  restored.useFootagePlaceholders = true;
  restored.beats[0].usePlaceholder = false;
  await applyPlaceholders(restored, create);
  assert.equal(restored.beats[0].assetId, "real");
  assert.equal(restored.beats[0].sourceInMs, 2500);
  assert.equal(restored.beats[0].placeholderFor, undefined);
  assert.equal(restored.beats[0].placeholderSource, undefined);
  assert.equal(restored.beats[0].missingFootage, undefined);
});
