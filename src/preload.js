const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    on: (channel, callback) => ipcRenderer.on(channel, callback),
    removeListener: (channel, callback) => ipcRenderer.removeListener(channel, callback),
});

contextBridge.exposeInMainWorld('electronAPI', {
  processAudio: (params) => ipcRenderer.invoke('process-audio', params),
  convertPDF: (params) => ipcRenderer.invoke('convert-pdf', params),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openPDFFile: () => ipcRenderer.invoke('dialog:openPDFFile'),
  convertPdfToMarkdown: (pdfPath) => ipcRenderer.invoke('convert-pdf-to-markdown', { pdfPath }),
  convertMarkdownToCsv: (markdownContent) => ipcRenderer.invoke('convert-markdown-to-csv', markdownContent),
  saveAPIKey: (key) => ipcRenderer.invoke('save-api-key', key),
  selectDirectory: (options) => ipcRenderer.invoke('dialog:selectDirectory', options),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  selectFile: (options) => ipcRenderer.invoke('dialog:selectFile', options),
  moveFile: (params) => ipcRenderer.invoke('file:move', params),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath)
});