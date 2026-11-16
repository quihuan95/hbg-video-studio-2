import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { capcutTimeline } from "./capcut-timeline";
import { validateTimeline } from "../shared/video";
import type { Project } from "../shared/types";

export async function exportCapCut(p: Project, destination: string, musicDurationMs = 0): Promise<string> {
  if (!path.isAbsolute(destination.trim())) throw new Error("Hãy nhập đường dẫn tuyệt đối đến thư mục draft CapCut.");
  const target = path.resolve(destination.trim());
  for (const name of ["draft_content.json", "draft_meta_info.json"]) {
    try { await fs.access(path.join(target, name)); }
    catch { throw new Error(`Thư mục draft không hợp lệ: thiếu ${name}. Hãy chọn thư mục dự án CapCut, không phải thư mục chứa tất cả dự án.`); }
  }
  validateTimeline(p, !!p.voicePath);
  const contentPath = path.join(target, "draft_content.json");
  const metaPath = path.join(target, "draft_meta_info.json");
  const original = await fs.readFile(contentPath, "utf8");
  const originalMeta = await fs.readFile(metaPath, "utf8");
  let draft = JSON.parse(original);
  const meta = JSON.parse(originalMeta);
  const backup = path.join(target, "hbg-backups", `${Date.now()}-${randomUUID()}`);
  await fs.mkdir(backup, { recursive: true });
  await fs.writeFile(path.join(backup, "draft_content.json"), original);
  await fs.writeFile(path.join(backup, "draft_meta_info.json"), originalMeta);
  const mediaDir = path.join(target, "Resources", "hbg");
  await fs.mkdir(mediaDir, { recursive: true });
  const paths = new Map<string,string>();
  const sources = [...new Set([...p.beats.map(b=>p.assets.find(a=>a.id===b.assetId)!.path), p.voicePath,p.logo,p.outro,p.musicEnabled !== false ? p.musicPath : undefined].filter((x): x is string=>!!x))];
  for(const source of sources) {
    const dest=path.join(mediaDir, randomUUID()+path.extname(source));
    await fs.copyFile(source,dest); paths.set(source,dest);
  }
  draft=capcutTimeline(draft,p,paths,musicDurationMs);
  const timelinePath=path.join(target,"Timelines",draft.id,"draft_content.json");
  const relative=path.relative(target,timelinePath);
  if(relative.startsWith("..") || path.isAbsolute(relative))throw new Error("Draft ID không hợp lệ.");
  let originalTimeline: string | undefined;
  try { originalTimeline=await fs.readFile(timelinePath,"utf8"); } catch(e) { if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e; }
  if(originalTimeline)await fs.writeFile(path.join(backup,"timeline_content.json"),originalTimeline);
  meta.tm_duration = draft.duration;
  meta.tm_draft_modified = Date.now() * 1000;
  try {
    await fs.writeFile(contentPath, JSON.stringify(draft));
    await fs.writeFile(metaPath, JSON.stringify(meta));
    if(originalTimeline)await fs.writeFile(timelinePath,JSON.stringify(draft));
  } catch (error) {
    if(originalTimeline)await fs.writeFile(timelinePath,originalTimeline);
    await fs.writeFile(contentPath, original);
    await fs.writeFile(metaPath, originalMeta);
    throw error;
  }
  return target;
}
