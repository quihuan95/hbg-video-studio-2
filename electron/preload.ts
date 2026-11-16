import { contextBridge, ipcRenderer } from "electron";
import type { StudioApi } from "../shared/types";
const api: StudioApi = {
  analyzerSnapshot: () => ipcRenderer.invoke("analyzer:snapshot"),
  analyzerRun: (p, o, id) => ipcRenderer.invoke("analyzer:run", p, o, id),
  analyzerControl: action => ipcRenderer.invoke("analyzer:control", action),
  analyzerEdit: (id, patch) => ipcRenderer.invoke("analyzer:edit", id, patch),
  analyzerExport: p => ipcRenderer.invoke("analyzer:export", p),
  load: () => ipcRenderer.invoke("projects:load"),
  save: (p) => ipcRenderer.invoke("projects:save", p),
  importFootage: () => ipcRenderer.invoke("assets:import"),
  selectFile: (k) => ipcRenderer.invoke("assets:select", k),
  outroInfo: (file) => ipcRenderer.invoke("assets:outro-info", file),
  defaultMusic: () => ipcRenderer.invoke("assets:default-music"),
  settings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (s) => ipcRenderer.invoke("settings:save", s),
  analyze: (p) => ipcRenderer.invoke("job:analyze", p),
  script: (p) => ipcRenderer.invoke("job:script", p),
  voice: (p) => ipcRenderer.invoke("job:voice", p),
  render: (p) => ipcRenderer.invoke("job:render", p),
  saveVideoCopy: (p) => ipcRenderer.invoke("job:save-video-copy", p),
  exportPlan: (p) => ipcRenderer.invoke("project:export", p),
  exportCapCut: (p, destination) => ipcRenderer.invoke("project:capcut", p, destination),
  cancel: () => ipcRenderer.invoke("job:cancel"),
  reveal: (p) => ipcRenderer.invoke("file:reveal", p),
  onProgress: (callback) => {
    const listener = (_: unknown, p: Parameters<typeof callback>[0]) =>
      callback(p);
    ipcRenderer.on("job:progress", listener);
    return () => ipcRenderer.removeListener("job:progress", listener);
  },
};
contextBridge.exposeInMainWorld("studio", api);
