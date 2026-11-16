import {test} from "node:test";
import assert from "node:assert/strict";
import {createProject} from "../shared/types";
import {validateTimeline} from "../shared/video";
import {validateUniqueScenes} from "../shared/unique-scenes";
import type {Shot} from "../shared/analyzer";
test("different windows of the same parent scene cannot repeat, including old projects",()=>{
 const p=createProject();delete p.avoidRepeatedShots;
 p.assets=[{id:"a",path:"a.mp4",name:"a",kind:"video",durationMs:30000,width:100,height:100}];
 p.beats=[{id:"1",assetId:"a",durationMs:3000,sourceInMs:0,voice:"",caption:"",overlay:""},{id:"2",assetId:"a",durationMs:3000,sourceInMs:15000,voice:"",caption:"",overlay:""}];
 const shots=[{file:"a.mp4",hash:"hash",sceneId:"parent",startMs:0,endMs:15000},{file:"a.mp4",hash:"hash",sceneId:"parent",startMs:15000,endMs:30000}] as Shot[];
 assert.throws(()=>validateUniqueScenes(p,shots),/cảnh gốc/);
 shots[1].sceneId="different";assert.doesNotThrow(()=>validateUniqueScenes(p,shots));
 delete shots[0].sceneId;delete shots[1].sceneId;assert.throws(()=>validateUniqueScenes(p,shots),/cảnh gốc/);
 p.avoidRepeatedShots=false;assert.doesNotThrow(()=>validateUniqueScenes(p,shots));
});
test("nonrepeat blocks overlapping source ranges but permits adjacent ranges",()=>{
 const p=createProject();p.duration=6;
 delete p.avoidRepeatedShots;
 p.assets=[{id:"a",path:"a.mp4",name:"a",kind:"video",durationMs:10000,width:100,height:100}];
 p.beats=[{id:"1",assetId:"a",durationMs:3000,sourceInMs:0,voice:"",caption:"",overlay:""},{id:"2",assetId:"a",durationMs:3000,sourceInMs:2000,voice:"",caption:"",overlay:""}];
 assert.throws(()=>validateTimeline(p),/lặp footage/);
 p.beats[1].sourceInMs=3000;assert.doesNotThrow(()=>validateTimeline(p));
 p.assets[0].kind="image";assert.throws(()=>validateTimeline(p),/lặp footage/);
 p.avoidRepeatedShots=false;assert.doesNotThrow(()=>validateTimeline(p));
});

test("still images cannot bypass scene reuse by changing source timestamps",()=>{
 const p=createProject();
 p.assets=[{id:"a",path:"a.png",name:"a",kind:"image",durationMs:0,width:100,height:100}];
 p.beats=[{id:"1",assetId:"a",durationMs:3000,sourceInMs:0,voice:"",caption:"",overlay:""},{id:"2",assetId:"a",durationMs:3000,sourceInMs:15000,voice:"",caption:"",overlay:""}];
 const shots=[{file:"a.png",hash:"hash",sceneId:"parent",startMs:0,endMs:1000}] as Shot[];
 assert.throws(()=>validateUniqueScenes(p,shots),/cảnh gốc/);
 p.beats[0].missingFootage={suggestedFootage:"Replacement",reason:"Pending",reanalyzeSuggestion:""};
 assert.doesNotThrow(()=>validateUniqueScenes(p,shots));
});
