import { z } from "zod";
const text = z.string().max(20000);
const path = z.string().max(32768);
export const beatSchema = z.object({
  id: z.string().max(100),
  voice: text,
  caption: text,
  overlay: text,
  assetId: z.string().max(100),
  durationMs: z.number().int().min(100).max(600000),
  sourceInMs: z.number().int().min(0).max(86400000),
});
export const projectSchema = z.object({
  version: z.literal(1),
  id: z.string().uuid(),
  title: text,
  category: z.enum(["event", "tour"]),
  objective: text,
  audience: text,
  duration: z.number().min(5).max(600),
  ratio: z.enum(["9:16", "1:1", "16:9"]),
  cta: text,
  hotline: text,
  assets: z
    .array(
      z.object({
        id: z.string().max(100),
        name: text,
        path,
        kind: z.enum(["video", "image"]),
        durationMs: z.number().min(0),
        width: z.number().min(0),
        height: z.number().min(0),
        thumbnail: path.optional(),
        error: text.optional(),
        description: text.optional(),
      }),
    )
    .max(5000),
  beats: z.array(beatSchema).max(500),
  flags: z.array(text).max(1000),
  logo: path.optional(),
  outro: path.optional(),
  outroDurationMs: z.number().int().positive().optional(),
  musicPath: path.optional(),
  musicVolume: z.number().min(0).max(0.5).optional(),
  musicEnabled: z.boolean().optional(),
  output: path.optional(),
  outputNotice: text.optional(),
  voicePath: path.optional(),
  voiceSignature: text.optional(),
  voiceDurationMs: z.number().min(0).optional(),
  captionCues: z
    .array(
      z.object({ startMs: z.number().min(0), endMs: z.number().min(0), text }),
    )
    .max(10000)
    .optional(),
  updatedAt: text,
});
export const settingsSchema = z.object({
  openaiKey: z.string().max(500),
  elevenKey: z.string().max(500),
  model: z.string().min(1).max(100),
  voiceId: z.string().max(100),
  voiceModel: z.string().min(1).max(100),
});
