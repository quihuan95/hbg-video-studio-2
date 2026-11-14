export function normalizeGeminiModel(value: string): string {
  const model = value.trim().replace(/^models\//i, "").toLowerCase().replace(/\s+/g, "-");
  if (!/^gemini-[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(model)) {
    throw new Error("Tên Gemini model không hợp lệ. Nhập mã model, ví dụ gemini-2.5-flash, không nhập URL.");
  }
  return model;
}
