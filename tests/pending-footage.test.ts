import {test} from "node:test";
import assert from "node:assert/strict";
import {projectSchema} from "../electron/validation";
import {createProject} from "../shared/types";
import {validateTimeline} from "../shared/video";
test("pending footage survives project persistence and blocks rendering until assigned",()=>{
 const p=createProject();p.duration=5;
 p.beats=[{id:"pending",voice:"Đội ngũ phối hợp",caption:"Teamwork",overlay:"PHỐI HỢP",assetId:"",sourceInMs:0,durationMs:5000,missingFootage:{suggestedFootage:"Đội ngũ bàn giao công việc",reason:"Chưa có cảnh phù hợp",reanalyzeSuggestion:""}}];
 const restored=projectSchema.parse(JSON.parse(JSON.stringify(p)));
 assert.equal(restored.beats[0].missingFootage?.suggestedFootage,"Đội ngũ bàn giao công việc");
 assert.throws(()=>validateTimeline(restored),/Cảnh 1 đang chờ/);
 restored.assets.push({id:"new",path:"new.mp4",name:"new",kind:"video",durationMs:6000,width:1920,height:1080});
 restored.beats[0].assetId="new";delete restored.beats[0].missingFootage;
 assert.doesNotThrow(()=>validateTimeline(restored));
 assert.equal(restored.beats[0].voice,"Đội ngũ phối hợp");
});
