import type { Project } from "../shared/types";
import { timeline } from "../shared/types";
import { validateTimeline } from "../shared/video";
export function createJsx(p: Project): string {
  validateTimeline(p, true);
  const [width,height] = p.ratio === "9:16" ? [1080,1920] : p.ratio === "1:1" ? [1080,1080] : [1920,1080];
  const data = { ...p, width, height, timeline: timeline(p) };
  return `// HBG: original media + ElevenLabs alignment. Does not render or generate voice.
(function () {
var p = ${JSON.stringify(data).replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")};
app.beginUndoGroup("HBG Reel");
try {
if (!app.project) app.newProject();
function media(file) { var f=new File(file); if(!f.exists) throw new Error("Missing source: "+file); return app.project.importFile(new ImportOptions(f)); }
var comp=app.project.items.addComp(p.title||"HBG Reel",p.width,p.height,1,p.duration,30);
function add(file,start,duration,source,fit,audio) {
 var item=media(file), layer=comp.layers.add(item);
 layer.startTime=start-source; layer.inPoint=start; layer.outPoint=start+duration;
 if(item.width && item.height) {var scale=(fit?Math.min:Math.max)(p.width/item.width,p.height/item.height)*100; layer.property("ADBE Transform Group").property("ADBE Scale").setValue([scale,scale]);}
 if(layer.hasAudio) layer.audioEnabled=audio;
 return layer;
}
function text(value,start,end,y,size) {
 if(!value)return;
 var layer=comp.layers.addText(value), prop=layer.property("Source Text"), style=prop.value;
 style.fontSize=size; style.fillColor=[1,1,1]; style.applyStroke=true;style.strokeColor=[0,0,0];style.strokeWidth=2;style.justification=ParagraphJustification.CENTER_JUSTIFY;prop.setValue(style);
 layer.property("Position").setValue([p.width/2,y]);layer.inPoint=start;layer.outPoint=end;
}
for(var i=0;i<p.timeline.length;i++) {var b=p.timeline[i],a=null;for(var j=0;j<p.assets.length;j++)if(p.assets[j].id===b.assetId)a=p.assets[j];if(!a)throw new Error("Missing asset");add(a.path,b.timelineInMs/1000,b.durationMs/1000,b.sourceInMs/1000,false,false);text(b.overlay,b.timelineInMs/1000,b.timelineOutMs/1000,p.height*.35,48);}
var body=p.timeline.length?p.timeline[p.timeline.length-1].timelineOutMs/1000:0;
add(p.voicePath,0,Math.min(body,p.voiceDurationMs/1000),0,true,true);
if(p.musicEnabled!==false && p.musicPath){var musicItem=media(p.musicPath);for(var t=0;t<body;t+=musicItem.duration){var m=comp.layers.add(musicItem);m.startTime=t;m.inPoint=t;m.outPoint=Math.min(body,t+musicItem.duration);m.property("ADBE Audio Group").property("ADBE Audio Levels").setValue([-24,-24]);}}
for(var k=0;k<(p.captionCues||[]).length;k++){var c=p.captionCues[k];text(c.text,c.startMs/1000,c.endMs/1000,p.height*.78,40);}
text(p.hotline,0,body,p.height*.70,38);
if(p.logo){var logo=add(p.logo,0,body,0,true,false);var scale=p.width*.30/logo.source.width*100;logo.property("Scale").setValue([scale,scale]);logo.property("Position").setValue([p.width*.20,p.height*.12]);}
if(p.outro)add(p.outro,body,p.outroDurationMs/1000,0,true,true);
comp.openInViewer();
} catch(e){alert("HBG: "+e.toString());} finally {app.endUndoGroup();}
})();`;
}
