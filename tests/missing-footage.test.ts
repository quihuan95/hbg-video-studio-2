import {test} from "node:test";
import assert from "node:assert/strict";
import {missingFootageMessage} from "../shared/missing-footage";
test("missing footage reports every narration and concrete required shot",()=>{
 const text=missingFootageMessage([1,3].map(n=>({sceneNumber:n,narration:`Lời ${n}`,suggestedFootage:"Đội ngũ bàn giao",reason:"Cảnh đã dùng",durationMs:4000,reanalyzeSuggestion:""})),[]);
 assert.match(text,/Cảnh 1/);assert.match(text,/Cảnh 3/);assert.match(text,/Lời 3/);assert.match(text,/Đội ngũ bàn giao/);assert.match(text,/4.0 giây/);
});
