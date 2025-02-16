const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openPDFFile: () => ipcRenderer.invoke('dialog:openPDFFile'),
  processAudio: (data) => ipcRenderer.invoke('process-audio', data),
  convertPDFToMarkdown: (data) => ipcRenderer.invoke('convert-pdf-to-markdown', data),
  convertMarkdownToCSV: (data) => ipcRenderer.invoke('convert-markdown-to-csv', data),
  saveAPIKey: (key) => ipcRenderer.invoke('save-api-key', key)
});