export async function retryGemini<T>(
  operation: () => Promise<T>,
  signal?: AbortSignal,
  notify?: (message: string) => void,
  wait: (ms: number, signal?: AbortSignal) => Promise<void> = (ms, signal) =>
    new Promise((resolve, reject) => {
      signal?.throwIfAborted();
      const abort = () => { clearTimeout(timer); reject(signal?.reason); };
      const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
      signal?.addEventListener("abort", abort, { once: true });
    }),
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try { return await operation(); }
    catch (error) {
      signal?.throwIfAborted();
      const status = Number((error as { status?: number; code?: number })?.status ?? (error as { code?: number })?.code);
      if (status !== 503) throw error;
      if (attempt === 3) throw new Error("Gemini vẫn quá tải sau 4 lần thử. Hãy thử lại sau; kết quả phân tích các file đã hoàn tất vẫn được giữ trong database.");
      const delay = 5000 * 2 ** attempt;
      notify?.(`Gemini đang quá tải. Thử lại ${attempt + 1}/3 sau ${delay / 1000} giây…`);
      await wait(delay, signal);
    }
  }
}
