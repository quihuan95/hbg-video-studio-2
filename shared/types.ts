export type Category = "event" | "tour";
export interface Asset {
  placeholder?: boolean;
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
  usePlaceholder?: boolean;
  placeholderSource?: { assetId: string; sourceInMs: number };
  sceneDescription?: string;
  placeholderFor?: { suggestedFootage: string; reason: string; reanalyzeSuggestion: string };
  missingFootage?: { suggestedFootage: string; reason: string; reanalyzeSuggestion: string };
  id: string;
  voice: string;
  caption: string;
  overlay: string;
  assetId: string;
  durationMs: number;
  sourceInMs: number;
}
export interface Project {
  backgroundFill?: "crop" | "blur";
  useFootagePlaceholders?: boolean;
  scriptInput?: string;
  allowIllustrativeFootage?: boolean;
  requireMatchingFootage?: boolean;
  avoidRepeatedShots?: boolean;
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
  geminiKey: string;
  geminiModel: string;
  openaiKey: string;
  elevenKey: string;
  model: string;
  voiceId: string;
  voiceModel: string;
}
export interface SettingsStatus {
  geminiConfigured: boolean;
  geminiModel: string;
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
  analyzerSnapshot(): Promise<import("./analyzer").AnalyzerSnapshot>;
  shotPreview(id: string): Promise<string>;
  scenePreview(request: { file: string; startMs: number; durationMs: number }): Promise<string>;
  analyzerRun(project: Project, options: import("./analyzer").AnalyzerOptions, shotId?: string): Promise<import("./analyzer").AnalyzerSnapshot>;
  analyzerControl(action: "pause" | "resume" | "cancel"): Promise<void>;
  analyzerEdit(id: string, patch: { startMs: number; endMs: number; description: string; tags: string[]; confirmedContext: string; verified: boolean }): Promise<void>;
  analyzerExport(project: Project): Promise<string | undefined>;
  load(): Promise<Project[]>;
  save(project: Project): Promise<void>;
  importFootage(singleFile?: boolean): Promise<Asset[]>;
  selectFile(kind: "logo" | "outro" | "music"): Promise<string | undefined>;
  outroInfo(file: string): Promise<number>;
  defaultMusic(): Promise<string>;
  settings(): Promise<SettingsStatus>;
  saveSettings(settings: Settings): Promise<SettingsStatus>;
  exportSettings(settings: Settings, includeKeys: boolean): Promise<string | undefined>;
  importSettings(): Promise<SettingsStatus | undefined>;
  analyze(project: Project): Promise<Project>;
  script(project: Project): Promise<Project>;
  preparePlaceholders(project: Project): Promise<Project>;
  voice(project: Project): Promise<Project>;
  render(project: Project): Promise<Project>;
  saveVideoCopy(project: Project): Promise<Project>;
  exportPlan(project: Project): Promise<string | undefined>;
  exportCapCut(project: Project, destination: string): Promise<string>;
  cancel(): Promise<void>;
  reveal(path: string): Promise<void>;
  onProgress(callback: (progress: Progress) => void): () => void;
}
export const createProject = (): Project => ({
  avoidRepeatedShots: true,
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
