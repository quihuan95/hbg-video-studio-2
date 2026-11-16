import { ShotVideo } from "./ShotVideo";
import React, { useEffect, useState } from "react";
import type { Project, StudioApi } from "../shared/types";
import { optionsSchema, type AnalyzerSnapshot, type Shot } from "../shared/analyzer";

export function FootageAnalyzer({ api, project, busy }: { api?: StudioApi; project: Project; busy: boolean }) {
  const [data, setData] = useState<AnalyzerSnapshot>();
  const [options] = useState(() => optionsSchema.parse({}));
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [edit, setEdit] = useState<Shot>();
  const [selected, setSelected] = useState<string>();
  const [confirming, setConfirming] = useState<string>();
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
  const shots = data?.shots.filter(s => project.assets.some(a => a.path === s.file) && (!query || (s.file + JSON.stringify(s.semantic || {})).toLocaleLowerCase().includes(query.toLocaleLowerCase()))) || [];
  return <section className="card" style={{ marginBottom: 20 }}>
    <div className="footage-library-heading">
      <div><h2>Footage đã phân tích</h2><p className="muted">Chọn một video để xem nội dung và kiểm tra phân tích.</p></div>
      <button className="primary" disabled={running || busy || !project.assets.length} onClick={() => run()}>{running ? "Đang phân tích…" : "Phân tích footage"}</button>
    </div>
    {running && <div className="export-actions">
      <button className="secondary" onClick={() => api?.analyzerControl("pause").then(() => setMessage("Tạm dừng sau bước hiện tại."))}>Tạm dừng</button>
      <button className="secondary" onClick={() => api?.analyzerControl("resume")}>Tiếp tục</button>
      <button className="secondary" onClick={() => api?.analyzerControl("cancel")}>Hủy</button>
    </div>}
    {message && <p role="status">{message}</p>}
    <input placeholder="Tìm shot theo nội dung, tags, hành động…" value={query} onChange={e => setQuery(e.target.value)} />
    <div className="footage-library-grid">
      {shots.map(s => <button key={s.id} className={`footage-library-tile ${selected === s.id ? "is-selected" : ""}`} onClick={() => setSelected(s.id)} aria-label={`Xem ${s.file.split(/[\\/]/).pop()}, ${(s.startMs/1000).toFixed(1)} giây`}>
        <div className="footage-library-thumb">
          {s.frames[0] ? <img loading="lazy" src={`hbg-media://local/${encodeURIComponent(s.frames[0].path)}`} alt="" /> : <span>Chưa có ảnh xem trước</span>}
          <span className="footage-library-play">▶</span>
          <span className="footage-library-duration">{((s.endMs-s.startMs)/1000).toFixed(1)}s</span>
        </div>
        <strong>{s.file.split(/[\\/]/).pop()}</strong>
        <span>{(s.startMs/1000).toFixed(1)}–{(s.endMs/1000).toFixed(1)}s · {s.verified ? "✓ Đã xác nhận" : s.semantic ? "Đã phân tích" : "Chờ phân tích"}</span>
      </button>)}
    </div>
    {!shots.length && <p className="muted">{query ? "Không có footage khớp tìm kiếm." : "Chưa có kết quả. Bấm Phân tích footage để bắt đầu."}</p>}
    {data?.shots.filter(s => s.id === selected).map(s => <div key={s.id} className="modal-backdrop" onClick={e => {if(e.target===e.currentTarget)setSelected(undefined);}}>
      <section className="modal footage-library-detail" role="dialog" aria-modal="true" aria-label="Chi tiết footage" onKeyDown={e => {if(e.key==="Escape")setSelected(undefined);}}>
        <div className="footage-library-heading"><h3>{s.file.split(/[\\/]/).pop()}</h3><button className="secondary" autoFocus onClick={()=>setSelected(undefined)}>Đóng ✕</button></div>
        <div className="analyzer-shot-body">
        {(project.assets.find(a=>a.path===s.file)?.kind === "video" ? <>
          <ShotVideo api={api} shot={s} />
        </> : s.frames[0] && <img loading="lazy" className="analyzer-shot-video" src={`hbg-media://local/${encodeURIComponent(s.frames[0].path)}`} />)}
        <p>{s.semantic?.description || s.error || "Chưa phân tích"}</p>
        <p>{s.semantic?.tags.join(", ")}</p>
        <p>{s.semantic?.uncertainties.join(" · ")}</p>
        <p>{s.verified ? `Đã xác nhận: ${s.confirmedContext || "bối cảnh chung"}` : "Chưa xác nhận địa danh/sự kiện; shot rõ vẫn dùng cho nội dung chung"}</p>
        <div className="analyzer-shot-actions">
          <button className="shot-action-edit" disabled={running || busy || !!confirming} onClick={() => setEdit(structuredClone(s))}>✎ Chỉnh sửa</button>
          <button className="shot-action-confirm" disabled={running || busy || !!confirming || !s.semantic} onClick={async () => {
            if(!api || !s.semantic)return;
            setConfirming(s.id);
            try {
              await api.analyzerEdit(s.id,{startMs:s.startMs,endMs:s.endMs,description:s.semantic.description,tags:s.semantic.tags,confirmedContext:s.confirmedContext || "",verified:true});
              setMessage("Đã xác nhận nội dung shot. Để ghi địa danh/sự kiện cụ thể, dùng Chỉnh sửa.");
              refresh();
            } catch(e){setMessage((e as Error).message);} finally {setConfirming(undefined);}
          }}>{confirming===s.id ? "Đang lưu…" : s.verified ? "✓ Đã xác nhận" : "✓ Xác nhận"}</button>
          <button className="shot-action-reanalyze" disabled={running || busy || !!confirming} onClick={() => run(s.id)}>↻ Phân tích lại</button>
        </div>
        </div>
      </section>
    </div>)}
    {edit && <div className="modal-backdrop" style={{zIndex:1100}}><section className="modal"><h3>Chỉnh sửa shot</h3>
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
