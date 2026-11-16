import type { Project } from "./types";

export function textSafeZone(width: number) {
  const margin = Math.round(width * 110 / 1080);
  return { left: margin, right: width - margin, width: width - 2 * margin, ratio: (width - 2 * margin) / width };
}

export function framingFilter(width: number, height: number, mode: Project["backgroundFill"]) {
  if (mode === "blur") {
    return `[0:v]split=2[back][front];[back]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,boxblur=20:2[blur];[front]scale=${width}:${height}:force_original_aspect_ratio=decrease,setsar=1[sharp];[blur][sharp]overlay=(W-w)/2:(H-h)/2:shortest=1,setsar=1,fps=30[v]`;
  }
  return `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=30[v]`;
}
