import { z } from "zod";
export const missingFootageSchema = z.object({
  sceneNumber: z.number().int().positive(),
  narration: z.string().min(1).max(8000),
  suggestedFootage: z.string().min(1).max(4000),
  reason: z.string().min(1).max(4000),
  durationMs: z.number().int().positive(),
  reanalyzeSuggestion: z.string().max(4000),
});
export function missingFootageMessage(items: z.infer<typeof missingFootageSchema>[], flags: string[]) {
  if (!items.length) return `NEEDS_INPUT: Chưa có danh sách cảnh thiếu cụ thể từ AI.\n${flags.join("\n")}\nHãy chia cảnh lại để nhận danh sách chi tiết.`;
  return "NEEDS_INPUT — Các đoạn cần bổ sung footage (thời lượng dự kiến):\n\n" + items.map(x =>
    `Cảnh ${x.sceneNumber} · ${(x.durationMs / 1000).toFixed(1)} giây\nLời đọc: “${x.narration}”\nCần hình: ${x.suggestedFootage}\nLý do: ${x.reason}${x.reanalyzeSuggestion ? `\nCó thể phân tích lại: ${x.reanalyzeSuggestion}` : ""}`
  ).join("\n\n");
}
