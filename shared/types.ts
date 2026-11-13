export type Category = "event" | "tour";
export interface Asset {
  id: string;
  name: string;
  path: string;
  kind: "video" | "image";
  durationMs: number;
  width: number;
  height: number;
  thumbnail?: string;
  error?: string;
  description?: string;
}
export interface Beat {
  id: string;
  voice: string;
  caption: string;
  overlay: string;
  assetId: string;
  durationMs: number;
  sourceInMs: number;
}
export interface Project {
  version: 1;
  id: string;
  title: string;
  category: Category;
  objective: string;
  audience: string;
  duration: number;
  ratio: "9:16" | "1:1" | "16:9";
  cta: string;
  hotline: string;
  assets: Asset[];
  beats: Beat[];
  flags: string[];
  logo?: string;
  outro?: string;
  outroDurationMs?: number;
  musicPath?: string;
  musicVolume?: number;
  musicEnabled?: boolean;
  output?: string;
  outputNotice?: string;
  voicePath?: string;
  voiceSignature?: string;
  voiceDurationMs?: number;
  captionCues?: Cue[];
  updatedAt: string;
}
export interface Cue {
  startMs: number;
  endMs: number;
  text: string;
}
export interface Settings {
  openaiKey: string;
  elevenKey: string;
  model: string;
  voiceId: string;
  voiceModel: string;
}
export interface SettingsStatus {
  openaiConfigured: boolean;
  elevenConfigured: boolean;
  model: string;
  voiceId: string;
  voiceModel: string;
  secureStorage: boolean;
}
export interface Progress {
  stage: string;
  message: string;
  percent: number;
}
export interface StudioApi {
  load(): Promise<Project[]>;
  save(project: Project): Promise<void>;
  importFootage(): Promise<Asset[]>;
  selectFile(kind: "logo" | "outro" | "music"): Promise<string | undefined>;
  outroInfo(file: string): Promise<number>;
  defaultMusic(): Promise<string>;
  settings(): Promise<SettingsStatus>;
  saveSettings(settings: Settings): Promise<SettingsStatus>;
  analyze(project: Project): Promise<Project>;
  script(project: Project): Promise<Project>;
  voice(project: Project): Promise<Project>;
  render(project: Project): Promise<Project>;
  saveVideoCopy(project: Project): Promise<Project>;
  exportPlan(project: Project): Promise<string | undefined>;
  cancel(): Promise<void>;
  reveal(path: string): Promise<void>;
  onProgress(callback: (progress: Progress) => void): () => void;
}
export const createProject = (): Project => ({
  version: 1,
  id: crypto.randomUUID(),
  title: "",
  category: "event",
  objective: "",
  audience: "",
  duration: 52,
  ratio: "9:16",
  cta: "Theo dõi The HBG Official",
  hotline: "",
  assets: [],
  beats: [],
  flags: [],
  updatedAt: new Date().toISOString(),
});
export function voiceSignature(p: Project): string {
  return JSON.stringify(p.beats.map((b) => b.voice));
}
export function timeline(p: Project) {
  let cursor = 0;
  return p.beats.map((b) => {
    const item = {
      ...b,
      timelineInMs: cursor,
      timelineOutMs: cursor + b.durationMs,
      sourceOutMs: b.sourceInMs + b.durationMs,
    };
    cursor += b.durationMs;
    return item;
  });
}
