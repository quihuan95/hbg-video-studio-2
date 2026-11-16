# Hybrid analyzer implementation

The active analysis route uses Python/PySceneDetect + FFmpeg locally and OpenAI Responses for shot semantics. ElevenLabs remains the voice provider. No Gemini/Ollama calls occur in the active analysis route. Old Gemini modules/data are retained for compatibility but are not used.

## Setup and use

Install Python 3 and run `python -m pip install -r scripts/requirements-analyzer.txt`. Python must be on PATH, including for the packaged application. Restart Electron after building.

Aggregate frame/request/USD limits are disabled by default. Enable the limits checkbox to apply the configured per-session caps. Per-shot sampling limits, bounded retries and cancellation remain active.

In Footage, use Footage Analyzer. Configure maximum frames, requests (including retries), USD estimate, and input/output rates per million tokens. Limits apply per run/resume session, not a monthly billing cap. Rates must match the selected OpenAI model. Unknown request outcomes retain their reserved estimated cost. The application does not claim invoice-accurate pricing.

The analyzer runs one file/request at a time. Pause takes effect between operations; cancel aborts the subprocess/request. Completed shot results are saved immediately. Resume skips completed results. Review/edit shot descriptions, tags, ranges, and confirmed context before generating a script. A changed sampling configuration does not invalidate existing detection automatically; pipeline-version changes invalidate the cache.

SQLite `shots.sqlite` and `shot-frames/` live in Electron userData. Files are keyed by SHA-256 and pipeline version. Shot records contain source times, selected-frame metrics, semantic data, model, status, and manual verification. Request records retain frames, usage and estimated cost. A crash marks pending request outcomes uncertain.

Export Shot JSON includes source paths, shots and project timing. Choose JSX in the export dialog to create an After Effects script from an existing timeline with aligned ElevenLabs voice. The JSX imports source media, cuts source in/out, adds voice, captions, overlays, hotline, logo, background music and outro. It never generates voice or renders a preview.

## Verification and outstanding acceptance items

Build and unit tests cover budget validation, verified-context ranking filters and rejection of JSX without aligned voice. A locally synthesized 18-second continuous video yielded three six-second windows and nine correctly timestamped frames.

Not yet acceptance-tested with real OpenAI requests, user footage or After Effects. The standalone rankShots helper has filtering/ranking tests but is not yet the script-generation selection engine: current scripting receives verified shot descriptions and enforces source-shot boundaries. Exact geographic/event matching against each narration remains to be integrated. JSX styling is a basic implementation of the repository HBG guide; SFX, sidechain ducking and full Master Rule validation remain outstanding. The supplied separate Master Rule and real-footage test inputs are not available.
