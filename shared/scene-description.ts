import type { Asset, Beat } from "./types";

export function sceneDescription(beat: Beat, asset?: Asset): string {
  if (beat.sceneDescription !== undefined) return beat.sceneDescription;
  const missing = beat.missingFootage || beat.placeholderFor;
  if (missing?.suggestedFootage) return missing.suggestedFootage;
  if (asset?.description && !asset.placeholder) {
    try {
      const raw = asset.description.trim();
      const parsed = raw.startsWith("[") ? JSON.parse(raw) : raw.split("\n").map(line => JSON.parse(line));
      const shots = Array.isArray(parsed) ? parsed : [parsed];
      const match = shots.find(s => s && s.startMs <= beat.sourceInMs && s.endMs > beat.sourceInMs);
      const description = match?.description || match?.semantic?.description;
      if (typeof description === "string" && description.trim()) return description;
    } catch {
      // Old analysis may contain a plain-text description instead of shot JSON.
      if (!/^[\[{]/.test(asset.description.trim())) return asset.description;
    }
  }
  return beat.voice.trim()
    ? `Cần hình minh họa cho ý: “${beat.voice.trim()}”. Chọn chủ thể và hành động liên quan, thể hiện rõ nội dung trong ${(beat.durationMs / 1000).toFixed(1)} giây.`
    : "Mô tả chủ thể, hành động, bối cảnh và góc máy cần có để chọn footage cho cảnh này.";
}
