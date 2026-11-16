import type { Project } from "./types";
import type { Shot } from "./analyzer";
export function validateUniqueScenes(p: Project, shots: Shot[]) {
  if (p.avoidRepeatedShots === false) return;
  const used = new Map<string,number>();
  const normalize=(f:string)=>f.replace(/\\/g,"/").toLowerCase();
  for(const [i,b] of p.beats.entries()) {
    if(b.missingFootage)continue;
    const asset=p.assets.find(a=>a.id===b.assetId);
    if(!asset)continue;
    const matching=shots.filter(s=>normalize(s.file)===normalize(asset.path) && (asset.kind === "image" || (b.sourceInMs < s.endMs && b.sourceInMs+b.durationMs > s.startMs)));
    // Legacy cache has no parent scene identity: conservatively use a source only once.
    const keys = new Set(matching.length ? matching.map(s=>s.sceneId || s.hash) : [normalize(asset.path)]);
    for(const key of keys) {
      if(used.has(key))throw new Error(`NEEDS_INPUT: Cảnh ${i+1} — “${b.voice}”\nCần footage khác dài ít nhất ${(b.durationMs/1000).toFixed(1)} giây để minh họa đoạn lời này.\nLý do: ${asset.name} dùng lại cảnh gốc của cảnh ${used.get(key)!+1}.${matching.length && matching.every(s=>s.sceneId) ? "" : " Chưa có dữ liệu phân biệt cảnh gốc nên mỗi file chỉ dùng một lần."}`);
      used.set(key,i);
    }
  }
}
