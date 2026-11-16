"""Local-only shot detection and quality-aware sampling. Never modifies source."""
import argparse, json, math, os, subprocess, sys
import cv2
import numpy as np
from scenedetect import detect, ContentDetector

def emit(value):
    print(json.dumps(value, ensure_ascii=True), flush=True)

def run(args):
    result = subprocess.run(args, capture_output=True, check=True)
    return result.stdout

def main():
    parser = argparse.ArgumentParser()
    for name in ['file', 'output', 'ffmpeg', 'ffprobe']:
        parser.add_argument('--' + name, required=True)
    parser.add_argument('--window', type=float, default=15)
    parser.add_argument('--max-frames', type=int, default=12)
    a = parser.parse_args()
    os.makedirs(a.output, exist_ok=True)
    meta = json.loads(run([a.ffprobe, '-v', 'error', '-show_format', '-show_streams', '-of', 'json', a.file]))
    stream = next(s for s in meta['streams'] if s['codec_type'] == 'video')
    num, den = (float(v) for v in stream.get('avg_frame_rate', '0/1').split('/'))
    fps = num / den if den else 0
    still = os.path.splitext(a.file)[1].lower() in ['.jpg', '.jpeg', '.png']
    duration = 5.0 if still else float(meta['format'].get('duration', stream.get('duration', 0)))
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError('Cannot determine video duration')
    emit({'event': 'metadata', 'durationMs': round(duration * 1000), 'width': stream['width'], 'height': stream['height'], 'fps': fps})
    scenes = [] if still else detect(a.file, ContentDetector(threshold=27), show_progress=False)
    ranges = [(s.get_seconds(), e.get_seconds()) for s, e in scenes] or [(0, duration)]
    # Long uninterrupted scenes are represented by temporal windows, retaining source times.
    windows = []
    for start, end in ranges:
        count = max(1, math.ceil((end - start) / a.window))
        for i in range(count):
            windows.append((start + (end-start)*i/count, start + (end-start)*(i+1)/count))
    emit({'event': 'detected', 'count': len(windows)})
    for index, (start, end) in enumerate(windows):
        length = end-start
        count = 1 if still else (2 if length < 3 else 3 if length <= 10 else min(a.max_frames, max(4, math.ceil(length / 2))))
        # Extra candidates on long shots allow changes between uniform samples to survive deduplication.
        candidates = count if length <= 10 else min(a.max_frames * 2, count * 2)
        frames, last = [], None
        for j in range(candidates):
            timestamp = 0 if still else start + length * (j + 0.5) / candidates
            out = os.path.join(a.output, f'{index}-{j}.jpg')
            run([a.ffmpeg, '-v', 'error', '-y', '-ss', str(timestamp), '-i', a.file, '-frames:v', '1', '-vf', 'scale=640:-2', out])
            image = cv2.imdecode(np.fromfile(out, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
            if image is None:
                continue
            small = cv2.resize(image, (32, 32))
            blur = float(cv2.Laplacian(image, cv2.CV_64F).var())
            duplicate = last is not None and float(np.abs(small.astype(float)-last.astype(float)).mean()) < 3
            informative = float(image.std()) > 8 and blur > 15
            frames.append({'path': out, 'timestampMs': round(timestamp*1000), 'blur': blur, 'duplicate': duplicate, 'informative': informative})
            last = small
        selected = [f for f in frames if f['informative'] and not f['duplicate']][:a.max_frames]
        # Preserve one representative even if all frames fail quality checks; AI is not called for these.
        if not selected and frames:
            selected = [max(frames, key=lambda f: f['blur'])]
        emit({'event': 'shot', 'index': index, 'startMs': round(start*1000), 'endMs': round(end*1000), 'frames': selected})

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
