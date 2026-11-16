import {test} from "node:test";
import assert from "node:assert/strict";
import {capcutTimeline} from "../electron/capcut-timeline";
import {createProject} from "../shared/types";
import {textSafeZone} from "../shared/framing";
import {projectSchema} from "../electron/validation";
test("CapCut exports source cuts and editable Unicode captions without rendered MP4",()=>{
 const p=createProject();p.duration=5;p.musicEnabled=false;
 p.assets=[{id:"a",name:"a",path:"a.mp4",kind:"video",durationMs:10000,width:1920,height:1080}];
 p.beats=[{id:"b",assetId:"a",durationMs:5000,sourceInMs:2000,voice:"Xin chào",caption:"Xin chào Việt Nam",overlay:"HBG"}];
 const template={id:"test",materials:{videos:[],texts:[]}};
 const d=capcutTimeline(template,p,new Map([["a.mp4","copied.mp4"]]));
 assert.equal(d.tracks[0].segments[0].source_timerange.start,2000000);
 assert.equal(d.tracks[0].segments[0].target_timerange.duration,5000000);
 assert.equal(JSON.parse(d.materials.texts[0].content).text,"Xin chào Việt Nam");
 assert.equal(d.tracks[1].segments[0].source_timerange,null);
 assert.equal(template.materials.videos.length,0);
 assert.throws(()=>capcutTimeline(template,p,new Map()));
});

test("CapCut applies the 860px safe text width to every text track",()=>{
 const p=createProject();p.duration=5;p.hotline="0123456789";
 p.assets=[{id:"a",name:"a",path:"a.mp4",kind:"video",durationMs:10000,width:1920,height:1080}];
 p.beats=[{id:"b",assetId:"a",durationMs:5000,sourceInMs:0,voice:"",caption:"Phụ đề rất dài tiếng Việt có dấu và English captions ".repeat(10),overlay:"Thẻ từ khóa dài ".repeat(10)}];
 const d=capcutTimeline({},p,new Map([["a.mp4","copied.mp4"]]));
 assert.deepEqual(textSafeZone(1080),{left:110,right:970,width:860,ratio:860/1080});
 assert.equal(d.materials.texts.length,3);
 for(const m of d.materials.texts){assert.equal(m.type,"subtitle");assert.equal(m.line_max_width,860/1080);assert.equal(m.force_apply_line_max_width,true);assert.equal(m.oneline_cutoff,false);}
 assert.equal(JSON.parse(d.materials.texts[0].content).text,p.beats[0].caption);
 for(const t of d.tracks.filter((t:any)=>t.type==="text")) for(const s of t.segments){assert.equal(s.clip.transform.x,0);assert.equal(s.clip.scale.x,1);}
});

test("blur fill uses editable source and native blurred canvas without changing source timing",()=>{
 const p=createProject();p.duration=5;p.backgroundFill="blur";
 p.assets=[{id:"a",name:"a",path:"a.mp4",kind:"video",durationMs:10000,width:1920,height:1080}];
 p.beats=[{id:"b",assetId:"a",durationMs:5000,sourceInMs:2000,voice:"",caption:"",overlay:""}];
 const restored=projectSchema.parse(JSON.parse(JSON.stringify(p)));
 const d=capcutTimeline({},restored,new Map([["a.mp4","copied.mp4"]]));
 const s=d.tracks[0].segments[0];
 assert.equal(d.materials.canvases[0].type,"canvas_blur");
 assert.ok(s.extra_material_refs.includes(d.materials.canvases[0].id));
 assert.deepEqual(s.clip.scale,{x:1,y:1});
 assert.equal(s.source_timerange.start,2000000);
 assert.equal(s.target_timerange.duration,5000000);
 assert.equal(s.volume,0);
 assert.equal(d.materials.videos[0].path,"copied.mp4");
 p.backgroundFill="crop";
 const cropped=capcutTimeline({},p,new Map([["a.mp4","copied.mp4"]]));
 assert.equal(cropped.materials.canvases.length,0);
 assert.ok(cropped.tracks[0].segments[0].clip.scale.x>1);
});
