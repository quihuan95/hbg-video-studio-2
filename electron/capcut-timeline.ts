import { randomUUID as id } from "node:crypto";
import { timeline, type Project } from "../shared/types";
import { validateTimeline } from "../shared/video";
import { textSafeZone } from "../shared/framing";

export function capcutTimeline(template: any, p: Project, paths: Map<string,string>, musicDurationMs = 0) {
  validateTimeline(p, !!p.voicePath);
  const draft = structuredClone(template);
  const [width,height] = p.ratio === "9:16" ? [1080,1920] : p.ratio === "1:1" ? [1080,1080] : [1920,1080];
  draft.materials ||= {};
  for(const key of Object.keys(draft.materials)) draft.materials[key]=[];
  for(const key of ["videos","audios","texts","canvases"]) draft.materials[key]=[];
  draft.tracks=[]; draft.duration=Math.round(p.duration*1e6); draft.fps=30;
  draft.canvas_config={ratio:p.ratio,width,height,background:null};
  draft.keyframes={videos:[],audios:[],texts:[],stickers:[],filters:[],adjusts:[],handwrites:[],effects:[]};
  draft.keyframe_graph_list=[];
  const track=(type:string,name:string)=>{const t={id:id(),type,name,attribute:0,flag:0,segments:[] as any[]};draft.tracks.push(t);return t;};
  const segment=(material:string,start:number,duration:number,source:number,type:string,volume=1,y=0)=>({id:id(),material_id:material,target_timerange:{start:Math.round(start*1000),duration:Math.round(duration*1000)},source_timerange:type==="text"?null:{start:Math.round(source*1000),duration:Math.round(duration*1000)},speed:1,volume,visible:true,reverse:false,render_index:draft.tracks.length,extra_material_refs:[] as string[],common_keyframes:[],keyframe_refs:[],clip:type==="audio"?null:{alpha:1,rotation:0,scale:{x:1,y:1},transform:{x:0,y},flip:{horizontal:false,vertical:false}}});
  const material=(file:string,type:string,duration:number,w=0,h=0)=>{
    const mapped=paths.get(file);if(!mapped)throw new Error(`Thiếu media: ${file}`);
    const mid=id(); const m:any={id:mid,type,path:mapped.replace(/\\/g,"/"),name:file.split(/[\\/]/).pop(),material_name:file.split(/[\\/]/).pop(),duration:Math.round(duration*1000)};
    if(type==="audio"){m.type="extract_music";m.local_material_id=mid;draft.materials.audios.push(m);}
    else {Object.assign(m,{width:w,height:h,has_audio:type==="video",crop_ratio:"free",crop_scale:1,crop:{upper_left_x:0,upper_left_y:0,upper_right_x:1,upper_right_y:0,lower_left_x:0,lower_left_y:1,lower_right_x:1,lower_right_y:1}});draft.materials.videos.push(m);}
    return mid;
  };
  const visuals=track("video","Footage");
  for(const b of timeline(p)) {
    const a=p.assets.find(a=>a.id===b.assetId)!;
    const mid=material(a.path,a.kind==="image"?"photo":"video",Math.max(a.durationMs,b.durationMs),a.width,a.height);
    const clip=segment(mid,b.timelineInMs,b.durationMs,a.kind==="image"?0:b.sourceInMs,"video",0);
    if(p.backgroundFill === "blur" && !a.placeholder) {
      // Native canvas blur duplicates this clip behind its uncropped, fitted foreground.
      const canvasId=id();
      draft.materials.canvases.push({id:canvasId,type:"canvas_blur",blur:0.5,color:"#00000000",source_platform:0});
      clip.extra_material_refs.push(canvasId);
    } else if(a.width > 0 && a.height > 0 && !a.placeholder) {
      const fit=Math.min(width/a.width,height/a.height);
      const fill=Math.max(width/a.width,height/a.height);
      clip.clip!.scale={x:fill/fit,y:fill/fit};
    }
    visuals.segments.push(clip);
  }
  const body=p.beats.reduce((sum,b)=>sum+b.durationMs,0);
  if(p.outro)visuals.segments.push(segment(material(p.outro,"video",p.outroDurationMs!),body,p.outroDurationMs!,0,"video"));
  if(p.voicePath){const voice=track("audio","ElevenLabs voice");voice.segments.push(segment(material(p.voicePath,"audio",p.voiceDurationMs!),0,p.voiceDurationMs!,0,"audio"));}
  if(p.musicEnabled !== false && p.musicPath && musicDurationMs > 0) {
    const music=track("audio","Background music"), mid=material(p.musicPath,"audio",musicDurationMs);
    for(let start=0;start<body;start+=musicDurationMs) music.segments.push(segment(mid,start,Math.min(musicDurationMs,body-start),0,"audio",p.musicVolume ?? 0.12));
  }
  const addTexts=(name:string,cues:{text:string;startMs:number;endMs:number}[],y:number,size:number)=>{
    const t=track("text",name);
    const safe=textSafeZone(width);
    for(const c of cues){if(!c.text.trim())continue;const mid=id();draft.materials.texts.push({id:mid,type:"subtitle",alignment:1,typesetting:0,line_feed:1,line_max_width:safe.ratio,force_apply_line_max_width:true,fixed_width:-1,fixed_height:-1,oneline_cutoff:false,font_size:size,text_color:"#FFFFFF",content:JSON.stringify({text:c.text,styles:[{range:[0,c.text.length],size,fill:{content:{solid:{color:[1,1,1]}}},bold:true}],layer_weight:1}),global_alpha:1,background_alpha:0,check_flag:7});t.segments.push(segment(mid,c.startMs,c.endMs-c.startMs,0,"text",1,y));}
  };
  addTexts("Subtitles",p.captionCues || timeline(p).map(b=>({text:b.caption,startMs:b.timelineInMs,endMs:b.timelineOutMs})),-0.56,8);
  addTexts("Overlays",timeline(p).map(b=>({text:b.overlay,startMs:b.timelineInMs,endMs:b.timelineOutMs})),0.3,12);
  if(p.hotline)addTexts("Hotline",[{text:p.hotline,startMs:0,endMs:body}],-0.4,8);
  if(p.logo){const logo=track("video","Logo");const seg=segment(material(p.logo,"photo",body),0,body,0,"video",0,0.76);seg.clip!.scale={x:0.25,y:0.25};seg.clip!.transform.x=-0.6;logo.segments.push(seg);}
  return draft;
}
