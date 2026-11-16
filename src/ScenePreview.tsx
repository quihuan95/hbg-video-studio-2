import React, { useEffect, useState } from "react";
import type { Asset, Beat, StudioApi } from "../shared/types";

export function ScenePreview({ api, asset, beat }: { api?: StudioApi; asset?: Asset; beat: Beat }) {
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const available = !!asset && !asset.error && !beat.missingFootage;
  useEffect(() => {
    let active = true;
    setSource("");
    setError("");
    if (!available || !asset) return;
    const media = (file: string) => `hbg-media://local/${encodeURIComponent(file)}`;
    if (asset.kind === "image") { setSource(media(asset.path)); return; }
    if (!api?.scenePreview) {
      setError("Hãy đóng và mở lại ứng dụng để nạp trình xem video mới.");
      return;
    }
    api.scenePreview({ file: asset.path, startMs: beat.sourceInMs, durationMs: beat.durationMs })
      .then(file => { if (active) setSource(media(file)); })
      .catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [api, available, asset?.path, asset?.kind, beat.sourceInMs, beat.durationMs, attempt]);
  if (!available || !asset) return <div className="scene-preview-empty">Chọn footage để xem trước phân cảnh này.</div>;
  return <figure className="scene-preview">
    {error ? <div role="alert"><p>{error}</p><button className="secondary" onClick={() => setAttempt(n => n + 1)}>Thử lại</button></div> :
      !source ? <div className="scene-preview-empty" role="status">Đang chuẩn bị video xem trước…</div> :
      asset.kind === "image" ? <img src={source} alt={asset.name} onError={() => setError("Không đọc được ảnh nguồn.")} /> :
      <video key={source} src={source} controls preload="metadata" playsInline
        aria-label={`Xem trước ${asset.name}`}
        onError={() => setError("Không phát được bản xem trước. Hãy thử lại hoặc kiểm tra file nguồn.")} />}
    <figcaption>{asset.name} · {(beat.sourceInMs / 1000).toFixed(2)}–{((beat.sourceInMs + beat.durationMs) / 1000).toFixed(2)}s · Preview footage nguồn</figcaption>
  </figure>;
}
