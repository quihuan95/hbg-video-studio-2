// Offline integration check: generated fixtures only; no provider API calls.
const { app, BrowserWindow, dialog } = require("electron");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const work = path.join(root, ".local", "smoke", randomUUID());
const fixtures = path.join(work, "footage");
fs.mkdirSync(fixtures, { recursive: true });
const ffmpeg = require.resolve("@ffmpeg-installer/win32-x64/ffmpeg.exe");
function ff(args) {
  const r = spawnSync(ffmpeg, ["-y", ...args], { windowsHide: true });
  if (r.status !== 0) throw new Error(r.stderr.toString());
}
const image = path.join(fixtures, "ảnh thử nghiệm.png");
const video = path.join(fixtures, "video thử nghiệm.mp4");
const audio = path.join(work, "voice.mp3");
const longAudio = path.join(work, "voice-long.mp3");
const background = path.join(work, "music.wav");
ff(["-f", "lavfi", "-i", "sine=frequency=440:duration=9", longAudio]);
ff(["-f", "lavfi", "-i", "sine=frequency=220:duration=1", background]);
const outro = path.join(work, "outro.mp4");
const outroSilent = path.join(work, "outro-silent.mp4");
ff([
  "-f",
  "lavfi",
  "-i",
  "color=c=yellow:s=640x360:r=24:d=1",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=880:sample_rate=44100:duration=1",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-ac",
  "1",
  "-shortest",
  outro,
]);
ff(["-i", outro, "-an", "-c:v", "copy", outroSilent]);
ff([
  "-f",
  "lavfi",
  "-i",
  "color=c=0x163f65:s=320x568:d=1",
  "-frames:v",
  "1",
  image,
]);
ff([
  "-f",
  "lavfi",
  "-i",
  "testsrc=size=320x568:rate=30",
  "-t",
  "6",
  "-pix_fmt",
  "yuv420p",
  video,
]);
ff(["-f", "lavfi", "-i", "sine=frequency=440:duration=4", audio]);
fs.writeFileSync(path.join(fixtures, "broken.mp4"), "invalid footage");
app.setPath("userData", path.join(work, "userdata"));
fs.mkdirSync(app.getPath("userData"), { recursive: true });
const project = {
  version: 1,
  id: randomUUID(),
  title: "Kiểm tra offline",
  category: "event",
  objective: "",
  audience: "",
  duration: 5,
  ratio: "9:16",
  cta: "",
  hotline: "",
  assets: [
    {
      id: "test-image",
      name: "ảnh thử nghiệm.png",
      path: image,
      kind: "image",
      durationMs: 4000,
      width: 320,
      height: 568,
    },
  ],
  beats: [
    {
      id: "b1",
      voice: "Xin chào HBG",
      caption: "Hello HBG",
      overlay: "THE HBG",
      assetId: "test-image",
      sourceInMs: 0,
      durationMs: 5000,
    },
  ],
  flags: [],
  musicPath: background,
  logo: image,
  voicePath: audio,
  voiceSignature: JSON.stringify(["Xin chào HBG"]),
  voiceDurationMs: 4000,
  captionCues: [{ startMs: 0, endMs: 3900, text: "Hello HBG" }],
  updatedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(app.getPath("userData"), "projects.json"),
  JSON.stringify([project]),
);
let saveCount = 0;
dialog.showOpenDialog = async () => ({
  canceled: false,
  filePaths: [fixtures],
});
dialog.showSaveDialog = async () => ({
  canceled: false,
  filePath: path.join(work, ++saveCount === 1 ? "timeline.json" : "result.mp4"),
});
let voiceRequests = 0;
let rewriteRequests = 0;
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  if (String(url) === "https://api.openai.com/v1/responses") {
    rewriteRequests++;
    const prompt = JSON.parse(options.body).input[0].content[0].text;
    const text = prompt.includes("rút gọn câu")
      ? "Xin chào HBG"
      : "Xin chào HBG. Đây là lời đọc được cân theo thời lượng.";
    return new Response(
      JSON.stringify({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
                  beats: [
                    {
                      id: "b1",
                      voice: text,
                      caption: "A narration fitted to the video.",
                    },
                  ],
                }),
              },
            ],
          },
        ],
      }),
      { status: 200 },
    );
  }
  if (String(url).startsWith("https://api.elevenlabs.io/v1/text-to-speech/")) {
    voiceRequests++;
    const text = JSON.parse(options.body).text;
    const chars = [...text];
    const longer = text.length > 20;
    const voicedMs = longer ? 8.6 : 3.6;
    return new Response(
      JSON.stringify({
        audio_base64: fs
          .readFileSync(longer ? longAudio : audio)
          .toString("base64"),
        alignment: {
          characters: chars,
          character_start_times_seconds: chars.map(
            (_, i) => (i * voicedMs) / chars.length,
          ),
          character_end_times_seconds: chars.map(
            (_, i) => ((i + 1) * voicedMs) / chars.length,
          ),
        },
        normalized_alignment: {
          characters: [..."Xin chào The HBG"],
          character_start_times_seconds: [],
          character_end_times_seconds: [],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
  return originalFetch(url, options);
};
require(
  process.argv.includes("--packaged-code")
    ? path.join(
        root,
        process.argv
          .find((arg) => arg.startsWith("--package-dir="))
          ?.slice("--package-dir=".length) || "release",
        "win-unpacked/resources/app.asar/dist-electron/electron/main.js",
      )
    : "../dist-electron/electron/main.js",
);
const timeout = setTimeout(() => {
  console.error("Smoke test timeout");
  app.exit(1);
}, 90000);
app.on("browser-window-created", (_event, window) => {
  window.webContents.once("did-finish-load", async () => {
    try {
      const waitFor = (expression) =>
        window.webContents.executeJavaScript(
          `new Promise((resolve, reject) => { const started = Date.now(); const timer = setInterval(() => { if (${expression}) { clearInterval(timer); resolve(true); } else if(Date.now() - started > 5000) { clearInterval(timer); reject(new Error('UI readiness timeout')); } }, 20); })`,
        );
      await waitFor(
        `document.querySelector('input')?.value === 'Kiểm tra offline'`,
      );
      assert.ok(
        (
          await window.webContents.executeJavaScript("document.body.innerText")
        ).includes("Tạo câu chuyện tiếp theo"),
      );
      await window.webContents.executeJavaScript(
        `Array.from(document.querySelectorAll('.workflow button')).find(b => b.textContent.includes('Kịch bản')).click()`,
      );
      await waitFor(`document.querySelectorAll('.beat-editor').length === 1`);
      await window.webContents.executeJavaScript(
        `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Thêm cảnh')).click()`,
      );
      await waitFor(`document.querySelectorAll('.beat-editor').length === 2`);
      assert.equal(
        await window.webContents.executeJavaScript(
          `document.querySelectorAll('.beat-editor').length`,
        ),
        2,
      );
      const loaded = await window.webContents.executeJavaScript(
        "window.studio.load()",
      );
      assert.equal(loaded.length, 1);
      const settings = await window.webContents.executeJavaScript(
        "window.studio.settings()",
      );
      assert.equal(settings.openaiConfigured, false);
      assert.equal("openaiKey" in settings, false);
      await window.webContents.executeJavaScript(
        `window.studio.saveSettings(${JSON.stringify({ openaiKey: "", elevenKey: "offline-test-only", model: "gpt-4.1-mini", voiceId: "offline-voice", voiceModel: "eleven_multilingual_v2" })})`,
      );
      const voiced = await window.webContents.executeJavaScript(
        `window.studio.voice(${JSON.stringify(project)})`,
      );
      assert.ok(voiced.voicePath);
      assert.equal(voiced.voiceDurationMs, 4800);
      assert.ok(voiced.captionCues[0].endMs < 4800);
      assert.equal(voiced.captionCues[0].text, "Hello HBG");
      await window.webContents.executeJavaScript(
        `window.studio.voice(${JSON.stringify(project)})`,
      );
      assert.equal(
        voiceRequests,
        1,
        "Repeat voice must use persisted response cache",
      );
      console.log(
        "PASS: original alignment preferred, repeat voice uses cache without another provider request",
      );
      const assets = await window.webContents.executeJavaScript(
        "window.studio.importFootage()",
      );
      assert.equal(assets.length, 3);
      assert.equal(assets.filter((a) => a.error).length, 1);
      assert.equal(assets.filter((a) => a.thumbnail).length, 2);
      const thumb = assets.find((a) => a.thumbnail).thumbnail;
      console.log("Smoke: checking media protocol");
      const thumbStatus = await window.webContents.executeJavaScript(
        `new Promise(resolve => { const img = new Image(); img.onload = () => resolve(true); img.onerror = () => resolve(false); img.src = 'hbg-media://local/' + encodeURIComponent(${JSON.stringify(thumb)}); })`,
      );
      assert.equal(thumbStatus, true);
      const forbidden = await window.webContents.executeJavaScript(
        `new Promise(resolve => { const img = new Image(); img.onload = () => resolve(true); img.onerror = () => resolve(false); img.src = 'hbg-media://local/' + encodeURIComponent('C:\\Windows\\win.ini'); })`,
      );
      assert.equal(forbidden, false);
      await window.webContents.executeJavaScript(
        `window.studio.save(${JSON.stringify(project)})`,
      );
      await window.webContents.executeJavaScript(
        `window.studio.exportPlan(${JSON.stringify(project)})`,
      );
      assert.ok(fs.existsSync(path.join(work, "timeline.srt")));
      console.log("Smoke: rendering MP4 with captions");
      const result = await window.webContents.executeJavaScript(
        `window.studio.render(${JSON.stringify(project)})`,
      );
      assert.ok(fs.statSync(result.output).size > 1000);
      const probe = spawnSync(
        require.resolve("@ffprobe-installer/win32-x64/ffprobe.exe"),
        [
          "-v",
          "error",
          "-show_format",
          "-show_streams",
          "-of",
          "json",
          result.output,
        ],
        { windowsHide: true },
      );
      const meta = JSON.parse(probe.stdout);
      assert.ok(Math.abs(Number(meta.format.duration) - 5) <= 0.15);
      assert.equal(
        meta.streams.find((s) => s.codec_type === "video").width,
        1080,
      );
      assert.ok(meta.streams.some((s) => s.codec_type === "audio"));
      const saveDialog = dialog.showSaveDialog;
      dialog.showSaveDialog = async () => ({
        canceled: false,
        filePath: path.join(work, "missing-folder", "output.mp4"),
      });
      const preserved = await window.webContents.executeJavaScript(
        `window.studio.saveVideoCopy(${JSON.stringify(result)})`,
      );
      assert.ok(preserved.outputNotice);
      assert.ok(fs.statSync(preserved.output).size > 1000);
      const occupiedCopy = path.join(work, "copy.mp4");
      fs.writeFileSync(occupiedCopy, "existing video");
      dialog.showSaveDialog = async () => ({
        canceled: false,
        filePath: occupiedCopy,
      });
      const copied = await window.webContents.executeJavaScript(
        `window.studio.saveVideoCopy(${JSON.stringify(preserved)})`,
      );
      assert.notEqual(copied.output, result.output);
      assert.equal(
        fs.statSync(copied.output).size,
        fs.statSync(result.output).size,
      );
      assert.equal(
        voiceRequests,
        1,
        "Saving another copy must not regenerate voice",
      );
      assert.equal(fs.readFileSync(occupiedCopy, "utf8"), "existing video");
      dialog.showSaveDialog = saveDialog;
      console.log(
        "PASS: blocked destination keeps completed video, save-copy retries without re-render or provider calls",
      );
      const mixed = spawnSync(
        ffmpeg,
        [
          "-v",
          "error",
          "-ss",
          "2",
          "-i",
          result.output,
          "-t",
          "0.4",
          "-vn",
          "-ar",
          "8000",
          "-ac",
          "1",
          "-f",
          "s16le",
          "pipe:1",
        ],
        { windowsHide: true },
      );
      assert.equal(mixed.status, 0, mixed.stderr.toString());
      const samples = Array.from({ length: mixed.stdout.length / 2 }, (_, i) =>
        mixed.stdout.readInt16LE(i * 2),
      );
      const amplitude = (hz) => {
        let re = 0,
          im = 0;
        samples.forEach((s, i) => {
          re += s * Math.cos((2 * Math.PI * hz * i) / 8000);
          im += s * Math.sin((2 * Math.PI * hz * i) / 8000);
        });
        return Math.hypot(re, im) / samples.length;
      };
      assert.ok(
        amplitude(220) > 8 && amplitude(440) > 100,
        "Background music and narration must both be audible",
      );
      const builtin = await window.webContents.executeJavaScript(
        "window.studio.defaultMusic()",
      );
      assert.ok(fs.statSync(builtin).size > 100000);
      console.log(
        "PASS: Electron UI, preload, project storage, recursive import, Unicode paths, corrupt file handling, media allowlist, JSON/SRT, FFmpeg MP4 1080x1920 with audio and captions.",
      );
      for (const file of [outro, outroSilent]) {
        const withOutro = {
          ...project,
          duration: 6,
          outro: file,
          musicPath: undefined,
        };
        // Both test files are explicitly restored as selected project files.
        {
          dialog.showOpenDialog = async () => ({
            canceled: false,
            filePaths: [file],
          });
          await window.webContents.executeJavaScript(
            `window.studio.selectFile('outro')`,
          );
        }
        const exported = await window.webContents.executeJavaScript(
          `window.studio.render(${JSON.stringify(withOutro)})`,
        );
        assert.equal(exported.outroDurationMs, 1000);
        assert.equal(
          exported.beats.reduce((n, b) => n + b.durationMs, 0),
          5000,
        );
        const info = spawnSync(
          require.resolve("@ffprobe-installer/win32-x64/ffprobe.exe"),
          [
            "-v",
            "error",
            "-show_format",
            "-show_streams",
            "-of",
            "json",
            exported.output,
          ],
          { windowsHide: true },
        );
        const full = JSON.parse(info.stdout);
        assert.ok(Math.abs(Number(full.format.duration) - 6) <= 0.15);
        const end = spawnSync(
          ffmpeg,
          [
            "-v",
            "error",
            "-ss",
            "5.5",
            "-i",
            exported.output,
            "-vf",
            "crop=10:10:(iw-10)/2:(ih-10)/2,scale=1:1",
            "-frames:v",
            "1",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "pipe:1",
          ],
          { windowsHide: true },
        );
        assert.ok(
          end.stdout[0] > 180 && end.stdout[1] > 180 && end.stdout[2] < 100,
          "Last frame must contain yellow outro, not body or overlay",
        );
        const audioEnd = spawnSync(
          ffmpeg,
          [
            "-v",
            "error",
            "-ss",
            "5.4",
            "-i",
            exported.output,
            "-t",
            "0.3",
            "-vn",
            "-ar",
            "8000",
            "-ac",
            "1",
            "-f",
            "s16le",
            "pipe:1",
          ],
          { windowsHide: true },
        );
        assert.equal(audioEnd.status, 0, audioEnd.stderr.toString());
        const samples = Array.from(
          { length: audioEnd.stdout.length / 2 },
          (_, i) => audioEnd.stdout.readInt16LE(i * 2),
        );
        assert.ok(samples.length > 1000);
        const rms = Math.sqrt(
          samples.reduce((sum, n) => sum + n * n, 0) / samples.length,
        );
        if (file === outroSilent)
          assert.ok(rms < 40, "Silent outro must stay silent");
        else {
          const crossings = samples
            .slice(1)
            .filter((n, i) => n >= 0 && samples[i] < 0).length;
          const hz = crossings / (samples.length / 8000);
          assert.ok(
            rms > 500 && hz > 700 && hz < 1000,
            "Outro must retain its own 880Hz audio, not the body 440Hz",
          );
        }
      }
      console.log(
        "PASS: outro with mono audio and silent outro, different aspect ratio/FPS, final frame and total duration",
      );
      await window.webContents.executeJavaScript(
        `window.studio.saveSettings(${JSON.stringify({ openaiKey: "offline-test-only", elevenKey: "", voiceId: "offline-voice", voiceModel: "eleven_multilingual_v2", model: "offline-model" })})`,
      );
      const expanded = await window.webContents.executeJavaScript(
        `window.studio.voice(${JSON.stringify({ ...project, duration: 10 })})`,
      );
      assert.equal(expanded.voiceDurationMs, 9800);
      assert.ok(expanded.beats[0].voice.length > 20);
      const shortened = await window.webContents.executeJavaScript(
        `window.studio.voice(${JSON.stringify({ ...expanded, duration: 5 })})`,
      );
      assert.equal(shortened.voiceDurationMs, 4800);
      assert.equal(shortened.beats[0].voice, "Xin chào HBG");
      assert.equal(rewriteRequests, 2);
      const withoutMusic = await window.webContents.executeJavaScript(
        `window.studio.render(${JSON.stringify({ ...shortened, musicEnabled: false })})`,
      );
      assert.ok(fs.statSync(withoutMusic.output).size > 1000);
      console.log(
        "PASS: automatic narration expansion/shortening, tempo/timestamp fit, built-in and custom background music, outro audio isolation",
      );
      console.log("Smoke artifacts:", work);
      clearTimeout(timeout);
      app.exit(0);
    } catch (error) {
      console.error(error);
      clearTimeout(timeout);
      app.exit(1);
    }
  });
});
