// アプリケーションの共通型定義

// テーマ関連
export type Theme = 'light' | 'dark' | 'system';

// 設定関連
export interface AppSettings {
  theme: Theme;
  language: string;
  audioSettings: AudioSettings;
  pdfSettings: PDFSettings;
  defaultInputDir?: string;
  defaultOutputDir?: string;
  apiKey?: string;
}

// 音声処理関連
export interface AudioSettings {
  sampleRate: number;
  channels: number;
  format: string;
  quality: number;
}

// PDF処理関連
export interface PDFSettings {
  outputFormat: 'markdown' | 'csv';
  includeImages: boolean;
  imageQuality: number;
  extractTables: boolean;
}

// 処理状態
export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  error?: string;
}

// ファイル処理関連
export interface FileProcessingOptions {
  inputPath: string;
  outputPath: string;
  settings: AudioSettings | PDFSettings;
}

// IPC通信のイベント型
export type IPCEvent = {
  type: string;
  payload: any;
}

// エラー型
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// ファイル選択オプション
export interface FileSelectOptions {
  title: string;
  filters: Array<{
    name: string;
    extensions: string[];
  }>;
}

// 変換結果
export interface ConversionResult {
  success: boolean;
  markdown_text?: string;
  error?: string;
  message?: string;
  csvPaths?: string[];
  outputDir?: string;
}

// 音声処理オプション
export interface SeparationOptions {
  vocals: boolean;
  drums: boolean;
  bass: boolean;
  other: boolean;
}

export interface AudioProcessingOptions {
  inputDir: string;
  outputDir: string;
  options: {
    vocals: boolean;
    drums: boolean;
    bass: boolean;
    other: boolean;
    enableRenameMove: boolean;
  };
}

export interface AudioProcessingResult {
  success: boolean;
  error?: string;
  outputFiles?: string[];
}

// Electron API
export interface ElectronAPI {
  // 設定関連
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<boolean>;
  
  // ファイル選択
  selectDirectory: (options: { title: string; defaultPath?: string }) => Promise<string | null>;
  selectFile: (options: FileSelectOptions) => Promise<string | null>;
  
  // 変換関連
  convertPdfToMarkdown: (filePath: string) => Promise<ConversionResult>;
  convertMarkdownToCsv: (params: {
    markdownContent: string;
    outputDir: string | null;
  }) => Promise<ConversionResult>;

  // ファイル移動
  moveFile: (params: {
    sourcePath: string;
    destinationDir: string;
  }) => Promise<{ success: boolean; error?: string }>;

  // 音声処理関連
  processAudio: (options: AudioProcessingOptions) => Promise<AudioProcessingResult>;
}

// Electron イベント
export interface ElectronEvents {
  on: (channel: string, func: (...args: any[]) => void) => void;
  removeListener: (channel: string, func: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron: ElectronEvents;
  }
}

// TranslationKeyをexportする
export type TranslationKey = 
  | 'app.title'
  | 'tab.pdf-csv'
  | 'tab.audio'
  | 'settings.title'
  | 'button.select'
  | 'button.execute'
  | 'button.save'
  | 'input.apiKey'
  | 'input.selectInputDir'
  | 'input.selectOutputDir'
  | 'settings.loaded'
  | 'settings.saving'
  | 'settings.savingDesc'
  | 'settings.saved'
  | 'success.title'
  | 'success.dirSelected'
  | 'error.title'
  | 'error.loadSettings'
  | 'error.saveSettings'
  | 'error.dirSelect'
  | 'audio.vocals'
  | 'audio.drums'
  | 'audio.bass'
  | 'audio.other'
  | 'audio.enableRenameMove'
  | 'audio.processing'
  | 'audio.processingDesc'
  | 'audio.progress'
  | 'pdf.title'
  | 'pdf.file'
  | 'pdf.selectFile'
  | 'pdf.preview'
  | 'pdf.converting'
  | 'pdf.convertingToMarkdown'
  | 'pdf.convertingToCsv'
  | 'pdf.convertError'
  | 'pdf.moveError'
  | 'pdf.noMarkdownGenerated'
  | 'pdf.noCsvGenerated'
  | 'pdf.previewPlaceholder'
  | 'pdf.fileSelected'
  | 'pdf.fileSelectError'
  | 'pdf.conversionComplete'
  | 'pdf.csvSaved'
  | 'pdf.toMarkdown'
  | 'pdf.toCsv'; 