import { test } from "node:test";
import assert from "node:assert/strict";
import { createProject, timeline, voiceSignature } from "../shared/types";
import {
  alignBeats,
  selectVoiceAlignment,
  srtTime,
  validateTimeline,
  bodyDurationMs,
  fitVoiceTimeline,
} from "../shared/video";
const fixture = () => ({
  ...createProject(),
  duration: 6,
  assets: [
    {
      id: "a",
      name: "test.mp4",
      path: "D:/test.mp4",
      kind: "video" as const,
      durationMs: 8000,
      width: 1080,
      height: 1920,
    },
  ],
  beats: [
    {
      id: "b1",
      voice: "Xin chào",
      caption: "Hello",
      overlay: "",
      assetId: "a",
      sourceInMs: 0,
      durationMs: 3000,
    },
    {
      id: "b2",
      voice: "HBG",
      caption: "HBG",
      overlay: "",
      assetId: "a",
      sourceInMs: 4000,
      durationMs: 3000,
    },
  ],
});
test("ElevenLabs: dùng alignment gốc khi normalized alignment thay đổi văn bản", () => {
  const p = fixture();
  const chars = [...p.beats.map((b) => b.voice.trim()).join(" ")];
  const original = {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => i * 0.2),
    character_end_times_seconds: chars.map((_, i) => i * 0.2 + 0.1),
  };
  const normalized = {
    characters: [..."Xin chào The HBG Official"],
    character_start_times_seconds: [],
    character_end_times_seconds: [],
  };
  assert.deepEqual(
    selectVoiceAlignment(p, {
      alignment: original,
      normalized_alignment: normalized,
    }),
    alignBeats(p, original),
  );
  assert.deepEqual(
    selectVoiceAlignment(p, { normalized_alignment: original }),
    alignBeats(p, original),
  );
});
test("timeline giữ timecode nguồn và tạo khoảng liên tiếp", () => {
  const p = fixture();
  validateTimeline(p);
  const t = timeline(p);
  assert.equal(t[1].timelineInMs, 3000);
  assert.equal(t[1].timelineOutMs, 6000);
  assert.equal(t[1].sourceOutMs, 7000);
});
test("từ chối đoạn vượt nguồn, thiếu asset và tổng duration sai", () => {
  const p = fixture();
  p.avoidRepeatedShots = false; // This test isolates source and total-duration validation.
  p.beats[1].sourceInMs = 6000;
  assert.throws(() => validateTimeline(p), /vượt thời lượng nguồn/);
  p.beats[1].sourceInMs = 0;
  p.beats[1].assetId = "missing";
  assert.throws(() => validateTimeline(p), /chưa chọn footage/);
  p.beats[1].assetId = "a";
  p.duration = 7;
  assert.throws(() => validateTimeline(p), /mục tiêu/);
});
test("alignment ánh xạ phụ đề dịch theo câu voice và hỗ trợ Unicode", () => {
  const p = fixture();
  p.beats[0].voice = "Chào 👋";
  const chars = [..."Chào 👋 HBG"];
  const cues = alignBeats(p, {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => i * 0.2),
    character_end_times_seconds: chars.map((_, i) => i * 0.2 + 0.1),
  });
  assert.deepEqual(cues, [
    { startMs: 0, endMs: 1100, text: "Hello" },
    { startMs: 1400, endMs: 1900, text: "HBG" },
  ]);
});
test("từ chối alignment sai thay vì xuất timestamp giả", () => {
  assert.throws(
    () =>
      alignBeats(fixture(), {
        characters: ["x"],
        character_start_times_seconds: [0],
        character_end_times_seconds: [1],
      }),
    /khác văn bản/,
  );
});
test("bản voice cũ và cue sai không được render", () => {
  const p = {
    ...fixture(),
    voicePath: "voice.mp3",
    voiceDurationMs: 5900,
    voiceSignature: "",
    captionCues: [
      { startMs: 0, endMs: 2900, text: "Hello" },
      { startMs: 3000, endMs: 5900, text: "HBG" },
    ],
  };
  p.voiceSignature = voiceSignature(p);
  validateTimeline(p, true);
  p.beats[0].voice = "Đã sửa";
  assert.throws(() => validateTimeline(p, true), /bản lời thoại/);
  p.voiceSignature = voiceSignature(p);
  p.captionCues[0].endMs = 3100;
  assert.throws(() => validateTimeline(p, true), /chưa khớp timeline/);
});
test("SRT đổi mốc giờ và mili giây đúng định dạng", () => {
  assert.equal(srtTime(3661123), "01:01:01,123");
  assert.equal(srtTime(-10), "00:00:00,000");
});
test("outro nằm trong tổng thời lượng và dùng lại timing voice", () => {
  const p = {
    ...fixture(),
    duration: 7,
    outro: "outro.mp4",
    outroDurationMs: 1000,
    voicePath: "voice.mp3",
    voiceDurationMs: 5900,
    captionCues: [
      { startMs: 0, endMs: 2900, text: "Hello" },
      { startMs: 3000, endMs: 5900, text: "HBG" },
    ],
    voiceSignature: "",
  };
  p.voiceSignature = voiceSignature(p);
  assert.equal(bodyDurationMs(p), 6000);
  fitVoiceTimeline(p);
  validateTimeline(p, true);
  p.duration = 6;
  assert.throws(() => fitVoiceTimeline(p), /phần nội dung còn/);
  p.duration = 1;
  assert.throws(() => bodyDurationMs(p), /chiếm hết/);
});
