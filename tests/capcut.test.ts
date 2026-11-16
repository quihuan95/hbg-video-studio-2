import {test} from "node:test";
import assert from "node:assert/strict";
import {capcutTimeline} from "../electron/capcut-timeline";
import {createProject} from "../shared/types";
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
