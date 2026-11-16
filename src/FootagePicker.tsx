import React, { useEffect, useState } from "react";
import type { Asset, Beat, StudioApi } from "../shared/types";
import { ScenePreview } from "./ScenePreview";

export function FootagePicker({ api, assets, beat, disabled, onAssign }: {
  api?: StudioApi; assets: Asset[]; beat: Beat; disabled: boolean;
  onAssign: (asset: Asset, startMs: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(beat.assetId);
  const [start, setStart] = useState(beat.sourceInMs / 1000);
  const [previewStart, setPreviewStart] = useState(start);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    setSelected(beat.assetId);
    setStart(beat.sourceInMs / 1000);
    setMessage("");
  }, [beat.assetId, beat.sourceInMs]);
  useEffect(() => {
    const timer = setTimeout(() => setPreviewStart(start), 400);
    return () => clearTimeout(timer);
  }, [start]);
  const asset = assets.find(a => a.id === selected && !a.error && !a.placeholder);
  const max = asset?.kind === "video" ? Math.max(0, (asset.durationMs - beat.durationMs) / 1000) : 0;
  const validStart = Number.isFinite(start) && start >= 0 && start <= max;
  const tooShort = asset?.kind === "video" && asset.durationMs < beat.durationMs;
  const choices = assets.filter(a => !a.error && !a.placeholder && a.name.toLowerCase().includes(query.toLowerCase()));
  const previewMs = asset?.kind === "video" ? Math.round(Math.min(Math.max(0, previewStart || 0), max) * 1000) : 0;
  const previewBeat = { ...beat, assetId: selected, sourceInMs: previewMs, missingFootage: undefined,
    durationMs: asset?.kind === "video" ? Math.min(beat.durationMs, asset.durationMs) : beat.durationMs };
  return <details className="footage-picker" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Chọn đoạn từ footage đã nhập (thủ công)</summary>
    {open && <div className="footage-picker-content">
      <p>Có thể chọn cả footage chưa được AI phân tích. Thời lượng cảnh: {(beat.durationMs / 1000).toFixed(2)} giây.</p>
      <label>Tìm footage
        <input placeholder="Tìm tên file…" value={query} onChange={e => setQuery(e.target.value)} />
      </label>
      <div className="footage-library-grid footage-picker-grid" aria-label="Footage đã nhập">
        {choices.map(a => <button type="button" key={a.id} disabled={disabled}
          className={`footage-library-tile ${selected === a.id ? "is-selected" : ""}`}
          aria-pressed={selected === a.id} aria-label={`Xem ${a.name}`}
          onClick={() => { setSelected(a.id); setStart(0); setPreviewStart(0); setMessage(""); }}>
          <div className="footage-library-thumb">
            {a.thumbnail || a.kind === "image" ? <img loading="lazy" src={`hbg-media://local/${encodeURIComponent(a.thumbnail || a.path)}`} alt="" /> : <span>Chưa có ảnh xem trước</span>}
            {a.kind === "video" && <span className="footage-library-play">▶</span>}
            <span className="footage-library-duration">{a.kind === "video" ? `${(a.durationMs / 1000).toFixed(1)}s` : "Ảnh"}</span>
          </div>
          <strong title={a.name}>{a.name}</strong>
          <span>{a.description ? "Đã phân tích" : "Chưa phân tích"}{a.kind === "video" && a.durationMs < beat.durationMs ? " · Ngắn hơn cảnh" : ""}</span>
        </button>)}
      </div>
      {!choices.length && <p role="status">Không có footage khớp tìm kiếm.</p>}
      {asset && <div className="footage-picker-selection">
        <strong>Xem trước đoạn chọn · {asset.name}</strong>
        <ScenePreview api={api} asset={asset} beat={previewBeat} />
        {asset.kind === "video" && <label>Bắt đầu tại (giây) — tối đa {max.toFixed(3)}
          <input type="number" disabled={disabled} min={0} max={max} step={0.001} value={start} onChange={e => { setStart(Number(e.target.value)); setMessage(""); }} />
        </label>}
        {tooShort ? <p role="alert">Footage này ngắn hơn cảnh. Hãy chọn file dài hơn hoặc giảm thời lượng cảnh.</p> :
          <p>Đoạn dùng: {asset.kind === "image" ? 0 : start}s → {((asset.kind === "image" ? 0 : start) + beat.durationMs / 1000).toFixed(3)}s</p>}
        {!validStart && <p role="alert">Điểm bắt đầu vượt thời lượng nguồn.</p>}
        <button type="button" className="secondary" disabled={disabled || tooShort || !validStart} onClick={() => {
          const ms = asset.kind === "image" ? 0 : Math.round(start * 1000);
          if (!Number.isFinite(ms) || ms < 0 || (asset.kind === "video" && ms + beat.durationMs > asset.durationMs)) return;
          try { onAssign(asset, ms); setMessage("Đã gán đoạn này cho cảnh."); }
          catch (e) { setMessage((e as Error).message); }
        }}>Dùng đoạn này cho cảnh</button>
      </div>}
      {message && <p role="status">{message}</p>}
    </div>}
  </details>;
}
