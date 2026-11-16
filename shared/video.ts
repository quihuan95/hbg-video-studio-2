import { timeline, voiceSignature, type Project, type Cue } from "./types";

export function bodyDurationMs(p: Project): number {
  if (p.outro && !p.outroDurationMs)
    throw new Error("Chưa đọc được thời lượng outro. Hãy chọn lại file outro.");
  const ms = Math.round(p.duration * 1000) - (p.outro ? p.outroDurationMs! : 0);
  if (ms < 100)
    throw new Error(
      "Outro chiếm hết thời lượng video. Hãy tăng tổng thời lượng hoặc chọn outro ngắn hơn.",
    );
  return ms;
}

export function fitVoiceTimeline(p: Project): void {
  const bodyMs = bodyDurationMs(p);
  if (!p.voiceDurationMs || p.voiceDurationMs > bodyMs)
    throw new Error(
      `Voice dài ${((p.voiceDurationMs || 0) / 1000).toFixed(1)}s, phần nội dung còn ${(bodyMs / 1000).toFixed(1)}s sau khi trừ outro. Hãy tăng tổng thời lượng hoặc rút lời; audio đã tạo được giữ lại.`,
    );
  if (!p.captionCues || p.captionCues.length !== p.beats.length)
    throw new Error("Thiếu alignment để căn timeline.");
  for (let i = 0; i < p.beats.length; i++) {
    const start = i === 0 ? 0 : p.captionCues[i].startMs;
    const end = i + 1 < p.beats.length ? p.captionCues[i + 1].startMs : bodyMs;
    if (end - start < 100 || p.captionCues[i].endMs > end)
      throw new Error("Lời đọc vượt phần nội dung trước outro.");
    p.beats[i].durationMs = end - start;
  }
}

export function validateTimeline(project: Project, requireVoice = false): void {
  if (!project.beats.length) throw new Error("Timeline chưa có cảnh.");
  const ids = new Set<string>();
  const used = new Map<string, { start: number; end: number; index: number }[]>();
  for (const [i, b] of project.beats.entries()) {
    if (b.missingFootage) throw new Error(`Cảnh ${i+1} đang chờ bổ sung footage: ${b.missingFootage.suggestedFootage}`);
    if (ids.has(b.id)) throw new Error("ID cảnh bị trùng.");
    ids.add(b.id);
    const asset = project.assets.find((a) => a.id === b.assetId && !a.error);
    if (!asset) throw new Error(`Cảnh ${i + 1} chưa chọn footage hợp lệ.`);
    if (project.avoidRepeatedShots !== false) {
      const key = asset.path.replace(/\\/g, "/").toLowerCase();
      const previous = used.get(key) || [];
      const overlap = previous.find(r => asset.kind === "image" || (b.sourceInMs < r.end && b.sourceInMs + b.durationMs > r.start));
      if (overlap) throw new Error(`NEEDS_INPUT: Cảnh ${i + 1} lặp footage với cảnh ${overlap.index + 1}. Hãy chọn shot khác, đổi đoạn nguồn hoặc bổ sung footage.`);
      previous.push({ start: b.sourceInMs, end: b.sourceInMs + b.durationMs, index: i });
      used.set(key, previous);
    }
    if (
      !Number.isInteger(b.durationMs) ||
      b.durationMs < 100 ||
      !Number.isInteger(b.sourceInMs) ||
      b.sourceInMs < 0
    )
      throw new Error(`Timing cảnh ${i + 1} không hợp lệ.`);
    if (
      asset.kind === "video" &&
      b.sourceInMs + b.durationMs > asset.durationMs
    )
      throw new Error(
        `Cảnh ${i + 1} vượt thời lượng nguồn. Hãy đổi cảnh hoặc điểm bắt đầu.`,
      );
  }
  const duration = project.beats.reduce((n, b) => n + b.durationMs, 0);
  if (Math.abs(duration - bodyDurationMs(project)) > 1)
    throw new Error(
      `Timeline nội dung dài ${(duration / 1000).toFixed(2)}s, mục tiêu ${(bodyDurationMs(project) / 1000).toFixed(2)}s. Hãy điều chỉnh thời lượng các cảnh.`,
    );
  if (requireVoice) {
    if (
      !project.voicePath ||
      project.voiceSignature !== voiceSignature(project) ||
      !project.captionCues?.length
    )
      throw new Error("Cần tạo voice và alignment cho bản lời thoại hiện tại.");
    if (!project.voiceDurationMs || project.voiceDurationMs > duration)
      throw new Error("Voice vượt thời lượng timeline.");
    const items = timeline(project);
    if (project.captionCues.length !== items.length)
      throw new Error("Số cue không khớp kịch bản. Hãy căn lại voice.");
    for (let i = 0; i < items.length; i++) {
      const c = project.captionCues[i];
      const b = items[i];
      if (
        c.startMs < b.timelineInMs ||
        c.endMs > b.timelineOutMs ||
        c.endMs <= c.startMs ||
        c.text !== b.caption
      )
        throw new Error(
          `Phụ đề cảnh ${i + 1} chưa khớp timeline. Hãy tạo lại voice hoặc khôi phục timing đã căn.`,
        );
    }
  }
}

export interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}
export function selectVoiceAlignment(
  project: Project,
  response: {
    alignment?: Alignment | null;
    normalized_alignment?: Alignment | null;
  },
): Cue[] {
  // Original alignment follows the submitted text; normalized alignment may spell
  // out numbers, abbreviations or pronunciation and cannot be indexed as input.
  for (const candidate of [response.alignment, response.normalized_alignment]) {
    if (!candidate?.characters?.length) continue;
    try {
      return alignBeats(project, candidate);
    } catch {
      /* try the other representation */
    }
  }
  throw new Error(
    "Không có alignment khớp lời gốc. Phản hồi và audio đã được giữ lại; thử lại sẽ dùng cache, không tạo voice mới.",
  );
}
export function alignBeats(project: Project, alignment: Alignment): Cue[] {
  const text = project.beats.map((b) => b.voice.trim()).join(" ");
  if (alignment.characters.join("") !== text)
    throw new Error(
      "Alignment khác văn bản đầu vào. Audio đã lưu trong cache; cần căn chỉnh bổ sung.",
    );
  if (!project.beats.length || project.beats.some((b) => !b.voice.trim()))
    throw new Error("Mỗi cảnh cần có lời đọc trước khi tạo voice.");
  if (
    alignment.characters.length !==
      alignment.character_start_times_seconds.length ||
    alignment.characters.length !== alignment.character_end_times_seconds.length
  )
    throw new Error("Alignment không đủ timestamp.");
  let cursor = 0;
  return project.beats.map((b) => {
    const start = cursor;
    cursor += [...b.voice.trim()].length;
    const startMs = Math.round(
      alignment.character_start_times_seconds[start] * 1000,
    );
    const endMs = Math.round(
      alignment.character_end_times_seconds[cursor - 1] * 1000,
    );
    cursor++;
    if (
      !Number.isFinite(startMs) ||
      !Number.isFinite(endMs) ||
      startMs < 0 ||
      endMs <= startMs
    )
      throw new Error("Alignment chứa timestamp không hợp lệ.");
    return { startMs, endMs, text: b.caption };
  });
}

export function srtTime(ms: number): string {
  const n = Math.max(0, Math.round(ms));
  return `${String(Math.floor(n / 3600000)).padStart(2, "0")}:${String(Math.floor(n / 60000) % 60).padStart(2, "0")}:${String(Math.floor(n / 1000) % 60).padStart(2, "0")},${String(n % 1000).padStart(3, "0")}`;
}
