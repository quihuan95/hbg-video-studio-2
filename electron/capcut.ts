import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Project } from "../shared/types";

const target = "C:/Users/Admin/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/1110";

export async function exportCapCut(p: Project): Promise<string> {
  if (!p.output) throw new Error("Hãy xuất MP4 trước khi xuất draft CapCut.");
  await fs.access(p.output);
  const contentPath = path.join(target, "draft_content.json");
  const metaPath = path.join(target, "draft_meta_info.json");
  const original = await fs.readFile(contentPath, "utf8");
  const originalMeta = await fs.readFile(metaPath, "utf8");
  const draft = JSON.parse(original);
  const meta = JSON.parse(originalMeta);
  const backup = path.join(target, "hbg-backups", `${Date.now()}-${randomUUID()}`);
  await fs.mkdir(backup, { recursive: true });
  await fs.writeFile(path.join(backup, "draft_content.json"), original);
  await fs.writeFile(path.join(backup, "draft_meta_info.json"), originalMeta);
  const mediaDir = path.join(target, "Resources", "hbg");
  await fs.mkdir(mediaDir, { recursive: true });
  const media = path.join(mediaDir, `${randomUUID()}.mp4`);
  await fs.copyFile(p.output, media);
  const duration = Math.round(p.duration * 1000000);
  const [width, height] = p.ratio === "9:16" ? [1080, 1920] : p.ratio === "1:1" ? [1080, 1080] : [1920, 1080];
  const id = randomUUID();
  for (const key of Object.keys(draft.materials)) draft.materials[key] = [];
  draft.materials.videos = [{ id, type: "video", path: media.replace(/\\/g, "/"), material_name: path.basename(media), duration, width, height, has_audio: true, audio_fade: null, crop_ratio: "free", crop_scale: 1, crop: { upper_left_x: 0, upper_left_y: 0, upper_right_x: 1, upper_right_y: 0, lower_left_x: 0, lower_left_y: 1, lower_right_x: 1, lower_right_y: 1 } }];
  draft.tracks = [{ id: randomUUID(), type: "video", attribute: 0, flag: 0, segments: [{ id: randomUUID(), material_id: id, source_timerange: { start: 0, duration }, target_timerange: { start: 0, duration }, speed: 1, volume: 1, visible: true, reverse: false, render_index: 0, extra_material_refs: [], common_keyframes: [], keyframe_refs: [], clip: { alpha: 1, rotation: 0, scale: { x: 1, y: 1 }, transform: { x: 0, y: 0 }, flip: { horizontal: false, vertical: false } } }] }];
  draft.duration = duration;
  draft.canvas_config = { ...draft.canvas_config, width, height, ratio: p.ratio };
  meta.tm_duration = duration;
  meta.tm_draft_modified = Date.now() * 1000;
  try {
    await fs.writeFile(contentPath, JSON.stringify(draft));
    await fs.writeFile(metaPath, JSON.stringify(meta));
  } catch (error) {
    await fs.writeFile(contentPath, original);
    await fs.writeFile(metaPath, originalMeta);
    throw error;
  }
  return target;
}
