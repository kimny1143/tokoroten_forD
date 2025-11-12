import { contextBridge, ipcRenderer } from 'electron';

// 型定義
interface ElectronAPI {
  processAudio: (params: AudioProcessingParams) => Promise<AudioProcessingResult>;
  convertPDF: (params: any) => Promise<{ success: boolean }>;
  openDirectory: () => Promise<string | null>;
  openPDFFile: () => Promise<string | null>;
  convertPdfToMarkdown: (pdfPath: string) => Promise<any>;
  convertMarkdownToCsv: (params: { markdownContent: string; outputDir: string | null }) => Promise<any>;
  saveAPIKey: (key: string) => Promise<void>;
  selectDirectory: (options: any) => Promise<string | null>;
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<boolean>;
  selectFile: (options: any) => Promise<string | null>;
  moveFile: (params: { sourcePath: string; destinationDir: string }) => Promise<any>;
  readFile: (filePath: string) => Promise<any>;
}

interface Settings {
  apiKey: string;
  defaultInputDir: string;
  defaultOutputDir: string;
}

interface AudioProcessingOptions {
  vocals: boolean;
  drums: boolean;
  bass: boolean;
  other: boolean;
  enableRenameMove: boolean;
}

interface AudioProcessingParams {
  inputDir: string;
  outputDir: string;
  options: AudioProcessingOptions;
}

interface AudioProcessingResult {
  success: boolean;
  message?: string;
  outputDir?: string;
  error?: string;
}

// Electron APIの公開
contextBridge.exposeInMainWorld('electron', {
  on: (channel: string, callback: (...args: any[]) => void) => ipcRenderer.on(channel, callback),
  removeListener: (channel: string, callback: (...args: any[]) => void) => ipcRenderer.removeListener(channel, callback),
});

// ElectronAPIの公開
contextBridge.exposeInMainWorld('electronAPI', {
  processAudio: (params: AudioProcessingParams) => ipcRenderer.invoke('process-audio', params),
  convertPDF: (params: any) => ipcRenderer.invoke('convert-pdf', params),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openPDFFile: () => ipcRenderer.invoke('dialog:openPDFFile'),
  convertPdfToMarkdown: (pdfPath: string) => ipcRenderer.invoke('convert-pdf-to-markdown', { pdfPath }),
  convertMarkdownToCsv: (params: { markdownContent: string; outputDir: string | null }) => 
    ipcRenderer.invoke('convert-markdown-to-csv', params),
  saveAPIKey: (key: string) => ipcRenderer.invoke('save-api-key', key),
  selectDirectory: (options: any) => ipcRenderer.invoke('dialog:selectDirectory', options),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Settings) => ipcRenderer.invoke('settings:save', settings),
  selectFile: (options: any) => ipcRenderer.invoke('dialog:selectFile', options),
  moveFile: (params: { sourcePath: string; destinationDir: string }) => 
    ipcRenderer.invoke('file:move', params),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath)
}); 