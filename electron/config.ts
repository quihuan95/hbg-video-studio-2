import { z } from "zod";
import { settingsSchema } from "./validation";
import type { Settings } from "../shared/types";

const portableSettings = settingsSchema.extend({
  openaiKey: z.string().max(500).default(""),
  elevenKey: z.string().max(500).default(""),
}).strict();
const configSchema = z.object({
  app: z.literal("hbg-shorts-studio"),
  version: z.literal(1),
  settings: portableSettings,
}).strict();

export function mergeSettings(current: Settings, next: Settings): Settings {
  return { ...next, geminiKey: next.geminiKey || current.geminiKey,
    openaiKey: next.openaiKey || current.openaiKey, elevenKey: next.elevenKey || current.elevenKey };
}

export function exportConfig(settings: Settings, includeKeys: boolean) {
  const { openaiKey, elevenKey, geminiKey, ...publicSettings } = settingsSchema.parse(settings);
  return { app: "hbg-shorts-studio", version: 1,
    settings: { ...publicSettings, ...(includeKeys ? { openaiKey, elevenKey, geminiKey } : {}) } };
}

export function importConfig(text: string, current: Settings): Settings {
  try {
    const config = configSchema.parse(JSON.parse(text.replace(/^\uFEFF/, "")));
    return mergeSettings(current, config.settings);
  } catch {
    throw new Error("File config không hợp lệ hoặc phiên bản chưa được hỗ trợ. Hãy chọn file JSON xuất từ HBG Shorts Studio.");
  }
}
