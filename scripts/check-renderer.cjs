const {app,BrowserWindow}=require('electron');
const path=require('node:path');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,webPreferences:{contextIsolation:true}});
 const errors=[];
 win.webContents.on('console-message',(_e,level,message)=>{if(level===3) errors.push(message);});
 try {
 await win.loadFile(path.resolve(__dirname,'../dist/index.html'));
 await new Promise(r=>setTimeout(r,1500));
 const length=await win.webContents.executeJavaScript('document.getElementById("root").innerText.length');
 if(length<100 || errors.length)throw new Error(JSON.stringify({length,errors}));
 console.log('PASS renderer mounted: '+length+' characters');app.exit(0);
 }catch(e){console.error(e);app.exit(1);}
});
