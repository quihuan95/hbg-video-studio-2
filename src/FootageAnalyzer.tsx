import React, { useEffect, useState } from "react";
import type { Project, StudioApi } from "../shared/types";
import { optionsSchema, type AnalyzerSnapshot, type Shot } from "../shared/analyzer";

export function FootageAnalyzer({ api, project, busy }: { api?: StudioApi; project: Project; busy: boolean }) {
  const [data, setData] = useState<AnalyzerSnapshot>();
  const [options, setOptions] = useState(() => optionsSchema.parse({}));
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [edit, setEdit] = useState<Shot>();
  const refresh = () => {
    if (!api?.analyzerSnapshot) { setMessage("Hãy đóng và mở lại ứng dụng để nạp Footage Analyzer mới."); return; }
    api.analyzerSnapshot().then(setData).catch(e => setMessage(e.message));
  };
  useEffect(() => { refresh(); }, []);
  useEffect(() => api?.onProgress(p => { if (p.stage === "analyze") { setMessage(p.message); refresh(); } }), [api]);
  async function run(id?: string) {
    if (!api) return;
    setRunning(true); setMessage("");
    try { setData(await api.analyzerRun(project, options, id)); }
    catch (e) { setMessage((e as Error).message); }
    finally { setRunning(false); refresh(); }
  }
  const shots = data?.shots.filter(s => project.assets.some(a => a.path === s.file) && (!query || JSON.stringify(s.semantic || {}).toLocaleLowerCase().includes(query.toLocaleLowerCase()))) || [];
  return <section className="card" style={{ marginBottom: 20 }}>
    <h2>Footage Analyzer · FFmpeg + PySceneDetect + OpenAI</h2>
    <p>Mặc định phân tích hết footage, không giới hạn tổng frame, lượt gọi hay ngân sách. Cache dùng chung giữa các dự án. Giá USD là ước tính theo đơn giá bạn nhập, không phải hóa đơn.</p>
    <label><input type="checkbox" checked={options.limitsEnabled} disabled={running} onChange={e => setOptions({ ...options, limitsEnabled: e.target.checked })} /> Bật giới hạn frame / lượt API / ngân sách cho mỗi phiên</label>
    <div className="two-cols">
      {([
        ["maxFrames", "Frame gửi tối đa"], ["maxCalls", "Lượt API tối đa (gồm retry)"], ["maxUsd", "Ngân sách USD/phiên"],
        ["inputRate", "USD / 1 triệu input token"], ["outputRate", "USD / 1 triệu output token"],
        ["windowSeconds", "Cửa sổ cảnh dài (giây)"], ["maxFramesPerShot", "Frame tối đa/shot"],
      ] as const).filter(([key]) => options.limitsEnabled || !["maxFrames", "maxCalls", "maxUsd"].includes(key)).map(([key, label]) => <label key={key}>{label}<input type="number" min="0.001" step="any" disabled={running} value={options[key]} onChange={e => setOptions({ ...options, [key]: Number(e.target.value) })} /></label>)}
    </div>
    <label><input type="checkbox" checked={options.advanced} disabled={running} onChange={e => setOptions({ ...options, advanced: e.target.checked })} /> Phân tích nâng cao khi chưa rõ / nhiều hành động / mâu thuẫn</label>
    <div className="export-actions">
      <button disabled={running || busy} onClick={() => run()}>Phân tích / Tiếp tục từ database</button>
      <button disabled={!running} onClick={() => api?.analyzerControl("pause").then(() => setMessage("Tạm dừng sau bước hiện tại."))}>Tạm dừng</button>
      <button disabled={!running} onClick={() => api?.analyzerControl("resume")}>Tiếp tục</button>
      <button disabled={!running} onClick={() => api?.analyzerControl("cancel")}>Hủy</button>
      <button disabled={running || busy} onClick={() => api?.analyzerExport(project).then(f => f && setMessage(`Đã xuất: ${f}`)).catch(e => setMessage(e.message))}>Xuất Shot JSON cho JSX</button>
    </div>
    <p role="status">{message}</p>
    <p>{shots.length} shot · Database: {data?.frames || 0} frame đã gửi · {data?.calls || 0} lượt API · {data?.inputTokens || 0} input / {data?.outputTokens || 0} output tokens · ~${data?.costUsd.toFixed(4) || "0"}</p>
    {data?.files.filter(f => project.assets.some(a => a.path === f.file)).map(f => <p key={f.hash}>{f.file.split(/[\\/]/).pop()} · {f.status} · {f.width}×{f.height} · {f.fps.toFixed(2)} fps</p>)}
    <input placeholder="Tìm shot theo nội dung, tags, hành động…" value={query} onChange={e => setQuery(e.target.value)} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
      {shots.map(s => <article key={s.id} style={{ border: "1px solid #ddd", padding: 12 }}>
        {s.frames[0] && <img style={{ width: "100%" }} src={`hbg-media://local/${encodeURIComponent(s.frames[0].path)}`} />}
        <p>{s.file.split(/[\\/]/).pop()} · {(s.startMs / 1000).toFixed(2)}–{(s.endMs / 1000).toFixed(2)}s · {s.status}</p>
        <p>{s.semantic?.description || s.error || "Chưa phân tích"}</p>
        <p>{s.semantic?.tags.join(", ")}</p>
        <p>{s.semantic?.uncertainties.join(" · ")}</p>
        <p>{s.verified ? `Đã xác nhận: ${s.confirmedContext || "bối cảnh chung"}` : "Chưa xác nhận địa danh/sự kiện; shot rõ vẫn dùng cho nội dung chung"}</p>
        <button disabled={running || busy} onClick={() => setEdit(structuredClone(s))}>Chỉnh sửa / xác nhận</button>
        <button disabled={running || busy} onClick={() => run(s.id)}>Phân tích lại shot</button>
      </article>)}
    </div>
    {edit && <div className="modal-backdrop"><section className="modal"><h3>Chỉnh sửa shot</h3>
      <label>Start ms<input type="number" value={edit.startMs} onChange={e => setEdit({ ...edit, startMs: +e.target.value })} /></label>
      <label>End ms<input type="number" value={edit.endMs} onChange={e => setEdit({ ...edit, endMs: +e.target.value })} /></label>
      <label>Mô tả<textarea value={edit.semantic?.description || ""} onChange={e => setEdit({ ...edit, semantic: { ...edit.semantic!, description: e.target.value } })} /></label>
      <label>Tags (phân cách dấu phẩy)<input value={edit.semantic?.tags?.join(", ") || ""} onChange={e => setEdit({ ...edit, semantic: { ...edit.semantic!, tags: e.target.value.split(",").map(t => t.trim()) } })} /></label>
      <label>Bối cảnh đã xác nhận: quốc gia / địa danh / sự kiện<input value={edit.confirmedContext || ""} onChange={e => setEdit({ ...edit, confirmedContext: e.target.value })} /></label>
      <label><input type="checkbox" checked={!!edit.verified} onChange={e => setEdit({ ...edit, verified: e.target.checked })} /> Tôi đã kiểm tra nội dung và bối cảnh</label>
      <button onClick={() => api?.analyzerEdit(edit.id, { startMs: edit.startMs, endMs: edit.endMs, description: edit.semantic?.description || "", tags: edit.semantic?.tags || [], confirmedContext: edit.confirmedContext || "", verified: !!edit.verified }).then(() => { setEdit(undefined); refresh(); }).catch(e => setMessage(e.message))}>Lưu</button>
      <button onClick={() => setEdit(undefined)}>Đóng</button>
    </section></div>}
  </section>;
}
