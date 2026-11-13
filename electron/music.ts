import { promises as fs } from "node:fs";

// Original, deterministic instrumental loop generated locally; no samples or downloads.
export async function createMusic(file: string): Promise<void> {
  try {
    await fs.access(file);
    return;
  } catch {
    /* first run */
  }
  const rate = 44100,
    seconds = 16,
    frames = rate * seconds;
  const pcm = Buffer.alloc(44 + frames * 4);
  pcm.write("RIFF", 0);
  pcm.writeUInt32LE(pcm.length - 8, 4);
  pcm.write("WAVEfmt ", 8);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20);
  pcm.writeUInt16LE(2, 22);
  pcm.writeUInt32LE(rate, 24);
  pcm.writeUInt32LE(rate * 4, 28);
  pcm.writeUInt16LE(4, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write("data", 36);
  pcm.writeUInt32LE(frames * 4, 40);
  const chords = [
    [52, 55, 59, 64],
    [48, 52, 55, 60],
    [43, 47, 50, 55],
    [50, 54, 57, 62],
  ];
  const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
  let seed = 20261114;
  for (let i = 0; i < frames; i++) {
    const t = i / rate,
      bar = Math.floor(t / 4),
      local = t % 4,
      chord = chords[bar % 4];
    const edge = Math.min(1, local / 0.15, (4 - local) / 0.25);
    const pad =
      chord.reduce(
        (sum, n, k) => sum + Math.sin(2 * Math.PI * hz(n) * t + k * 0.2),
        0,
      ) *
      0.027 *
      edge;
    const step = Math.floor(local / 0.5),
      pluckTime = local % 0.5;
    const pluck =
      Math.sin(2 * Math.PI * hz(chord[step % 4] + 12) * pluckTime) *
      Math.exp(-pluckTime * 9) *
      0.095;
    const kickTime = local % 0.5;
    const kick =
      Math.sin(
        2 * Math.PI * (48 * kickTime + 6 * (1 - Math.exp(-kickTime * 25))),
      ) *
      Math.exp(-kickTime * 24) *
      0.1;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const hat =
      ((seed / 4294967296) * 2 - 1) * Math.exp(-(local % 0.25) * 100) * 0.018;
    const fade = Math.min(1, t / 0.05, (seconds - t) / 0.08);
    const sample = Math.max(-1, Math.min(1, (pad + pluck + kick + hat) * fade));
    const value = Math.round(sample * 32767);
    pcm.writeInt16LE(value, 44 + i * 4);
    pcm.writeInt16LE(value, 46 + i * 4);
  }
  await fs.writeFile(file, pcm);
}
