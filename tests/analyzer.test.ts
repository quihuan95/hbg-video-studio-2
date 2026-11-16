import { test } from "node:test";
import assert from "node:assert/strict";
import { optionsSchema, rankShots, usableForScript, type Shot } from "../shared/analyzer";
test("clear shots do not require manual approval; uncertain shots still do", () => {
  const shot = {status:"complete",verified:false,semantic:{quality:"good",needsReview:false,contradiction:false}} as Shot;
  assert.equal(usableForScript(shot),true);
  assert.equal(usableForScript({...shot,status:"pending"}),false);
  assert.equal(usableForScript({...shot,semantic:{...shot.semantic!,needsReview:true}}),false);
  assert.equal(usableForScript({...shot,verified:true,semantic:{...shot.semantic!,needsReview:true}}),true);
});
import { createJsx } from "../electron/jsx-export";
import { createProject } from "../shared/types";
test("analyzer rejects invalid budgets", () => {
  assert.throws(() => optionsSchema.parse({ maxCalls: 0 }));
  assert.throws(() => optionsSchema.parse({ maxUsd: -1 }));
  assert.equal(optionsSchema.parse({}).maxFrames,100);
  assert.equal(optionsSchema.parse({}).limitsEnabled,false);
  assert.equal(optionsSchema.parse({limitsEnabled:true}).limitsEnabled,true);
});
test("ranking requires verified context and sufficient source duration", () => {
  const shot = { id:"1",startMs:0,endMs:4000,status:"complete",verified:true,confirmedContext:"Hanoi",semantic:{description:"hội nghị sân khấu",quality:"good"} } as Shot;
  assert.equal(rankShots([shot],"sân khấu",3000,"Hanoi").length,1);
  assert.equal(rankShots([shot],"sân khấu",5000,"Hanoi").length,0);
  assert.equal(rankShots([shot],"sân khấu",3000,"Bangkok").length,0);
  assert.equal(rankShots([{...shot,verified:false}],"sân khấu",3000).length,0);
});
test("JSX export rejects timelines without aligned voice", () => {
  assert.throws(() => createJsx(createProject()));
});
