import { z } from "zod";
export const PIPELINE = "hbg-hybrid-v1";
export const optionsSchema = z.object({
  limitsEnabled: z.boolean().default(false),
  maxFrames: z.number().int().min(1).max(500).default(100),
  maxCalls: z.number().int().min(1).max(500).default(30),
  maxUsd: z.number().positive().max(1000).default(1),
  inputRate: z.number().positive().max(1000).default(1),
  outputRate: z.number().positive().max(1000).default(4),
  windowSeconds: z.number().min(3).max(60).default(15),
  maxFramesPerShot: z.number().int().min(3).max(24).default(12),
  advanced: z.boolean().default(true),
});
export type AnalyzerOptions = z.infer<typeof optionsSchema>;
export const semanticSchema = z.object({
  description: z.string().max(8000), subjects: z.array(z.string()), actions: z.array(z.string()),
  setting: z.string(), angle: z.string(), cameraMotion: z.string(),
  quality: z.enum(["good", "usable", "poor"]), tags: z.array(z.string()),
  visualIntent: z.array(z.string()), uncertainties: z.array(z.string()),
  needsReview: z.boolean(), complexAction: z.boolean(), contradiction: z.boolean(),
});
export type Semantic = z.infer<typeof semanticSchema>;
export interface Shot {
  id: string; hash: string; file: string; startMs: number; endMs: number;
  frames: { path: string; timestampMs: number; blur: number; duplicate: boolean; informative: boolean }[];
  status: string; semantic?: Semantic; model?: string; error?: string;
  confirmedContext?: string; verified?: boolean; pass: number;
}
export interface AnalyzerSnapshot {
  shots: Shot[]; files: { hash: string; file: string; durationMs: number; width: number; height: number; fps: number; status: string }[];
  calls: number; frames: number; inputTokens: number; outputTokens: number; costUsd: number;
}
export function usableForScript(s: Shot): boolean {
  if (s.status !== "complete" || !s.semantic) return false;
  return !!s.verified || (s.semantic.quality !== "poor" && !s.semantic.needsReview && !s.semantic.contradiction);
}
export function rankShots(shots: Shot[], query: string, durationMs: number, context = "", used: string[] = []) {
  const words = query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  return shots.filter(s => s.semantic && s.status === "complete" && s.verified && s.endMs - s.startMs >= durationMs &&
    (!context || s.confirmedContext?.toLocaleLowerCase() === context.toLocaleLowerCase()))
    .map(s => {
      const text = JSON.stringify(s.semantic).toLocaleLowerCase();
      const matches = [...new Set(words)].filter(w => w.length > 2 && text.includes(w));
      return { shot: s, score: matches.length * 3 + (s.semantic!.quality === "good" ? 2 : 0) - (used.includes(s.id) ? 4 : 0), reason: matches.join(", ") };
    }).filter(x => x.reason).sort((a, b) => b.score - a.score);
}
