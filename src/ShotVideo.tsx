import React,{useEffect,useState} from "react";
import type {StudioApi} from "../shared/types";
import type {Shot} from "../shared/analyzer";
export function ShotVideo({api,shot}:{api?:StudioApi;shot:Shot}) {
  const [source,setSource]=useState("");
  const [error,setError]=useState("");
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let live=true;setSource("");setError("");
    if(!api?.shotPreview){setError("Cần khởi động lại ứng dụng để nạp trình xem mới.");return;}
    api.shotPreview(shot.id).then(file=>{if(live)setSource(`hbg-media://local/${encodeURIComponent(file)}`);}).catch(e=>{if(live)setError(e.message);});
    return ()=>{live=false;};
  },[api,shot.id,shot.startMs,shot.endMs,attempt]);
  return <div>
    {error ? <p role="alert">{error} <button className="secondary" onClick={()=>setAttempt(n=>n+1)}>Thử lại</button></p> : !source ? <p role="status">Đang chuẩn bị video xem trước trên máy…</p> : <video className="analyzer-shot-video" src={source} controls preload="metadata" onError={e=>setError(`Không phát được bản xem trước (mã ${e.currentTarget.error?.code || "không rõ"}).`)} />}
    <p className="muted">Bản xem trước của đoạn {(shot.startMs/1000).toFixed(2)}–{(shot.endMs/1000).toFixed(2)}s. Bộ đếm player bắt đầu từ 0; file gốc dùng dựng/export không thay đổi.</p>
  </div>;
}
