import type { Asset, Project } from "./types";

// Each scene gets its own still so normal no-repeat checks remain enabled.
export async function applyPlaceholders(p: Project, create: (scene: number) => Promise<Asset>): Promise<Project> {
  for (const [index, beat] of p.beats.entries()) {
    const asset = p.assets.find(a => a.id === beat.assetId);
    if (beat.placeholderFor && asset && !asset.placeholder && !beat.missingFootage && !beat.usePlaceholder) {
      delete beat.placeholderFor;
      continue;
    }
    if (!(beat.usePlaceholder ?? p.useFootagePlaceholders)) {
      if (beat.placeholderFor && asset?.placeholder) {
        beat.missingFootage = beat.placeholderFor;
        beat.assetId = "";
        beat.sourceInMs = 0;
        const previous = p.assets.find(a => a.id === beat.placeholderSource?.assetId && !a.error && !a.placeholder);
        if (previous && beat.placeholderSource) {
          beat.assetId = previous.id;
          beat.sourceInMs = beat.placeholderSource.sourceInMs;
          delete beat.missingFootage;
        }
        delete beat.placeholderSource;
        delete beat.placeholderFor;
      }
      continue;
    }
    if (!beat.missingFootage && asset && !asset.error && (asset.placeholder || !beat.usePlaceholder)) continue;
    if (asset && !asset.placeholder && !asset.error) beat.placeholderSource = { assetId: asset.id, sourceInMs: beat.sourceInMs };
    const placeholder = await create(index + 1);
    p.assets.push(placeholder);
    beat.placeholderFor = beat.missingFootage || { suggestedFootage: beat.overlay || beat.voice, reason: "Chưa có footage.", reanalyzeSuggestion: "" };
    beat.assetId = placeholder.id;
    beat.sourceInMs = 0;
    delete beat.missingFootage;
  }
  p.assets = p.assets.filter(a => !a.placeholder || p.beats.some(b => b.assetId === a.id));
  return p;
}
