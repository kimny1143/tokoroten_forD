import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'ja' | 'en';

type TranslationKey = 
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
  | 'pdf.toCsv'
  | 'pdf.usePdfConversion'
  | 'pdf.useExistingMarkdown'
  | 'pdf.selectMarkdownFile'
  | 'pdf.dragAndDropPdf'
  | 'pdf.dragAndDropMarkdown'
  | 'pdf.markdownFileReadError';

type TranslationType = Record<Language, Record<TranslationKey, string>>;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const translations: TranslationType = {
  en: {
    'app.title': 'Tokoroten Audio Processor',
    'tab.pdf-csv': 'PDF/CSV Conversion',
    'tab.audio': 'Audio Processing',
    'settings.title': 'Settings',
    'button.select': 'Select',
    'button.execute': 'Execute',
    'button.save': 'Save',
    'input.apiKey': 'Enter API Key',
    'input.selectInputDir': 'Select Input Directory',
    'input.selectOutputDir': 'Select Output Directory',
    'settings.loaded': 'Settings loaded successfully',
    'settings.saving': 'Saving...',
    'settings.savingDesc': 'Saving settings',
    'settings.saved': 'Settings saved successfully',
    'success.title': 'Success',
    'success.dirSelected': 'Directory selected',
    'error.title': 'Error',
    'error.loadSettings': 'Failed to load settings',
    'error.saveSettings': 'Failed to save settings',
    'error.dirSelect': 'Failed to select directory',
    'audio.vocals': 'Vocals',
    'audio.drums': 'Drums',
    'audio.bass': 'Bass',
    'audio.other': 'Other',
    'audio.enableRenameMove': 'Enable Rename & Move',
    'audio.processing': 'Processing...',
    'audio.processingDesc': 'Processing audio files',
    'audio.progress': 'Progress',
    'pdf.title': 'PDF/CSV Conversion',
    'pdf.file': 'PDF File',
    'pdf.selectFile': 'Select PDF File',
    'pdf.preview': 'Preview',
    'pdf.converting': 'Converting...',
    'pdf.convertingToMarkdown': 'Converting PDF to Markdown',
    'pdf.convertingToCsv': 'Converting Markdown to CSV',
    'pdf.convertError': 'Conversion Error',
    'pdf.moveError': 'Failed to move CSV file',
    'pdf.noMarkdownGenerated': 'No Markdown text was generated',
    'pdf.noCsvGenerated': 'No CSV file was generated',
    'pdf.previewPlaceholder': 'Preview will be displayed here',
    'pdf.fileSelected': 'File selected',
    'pdf.fileSelectError': 'Error occurred while selecting file',
    'pdf.conversionComplete': 'Conversion completed',
    'pdf.csvSaved': 'CSV file saved',
    'pdf.toMarkdown': 'PDF → Markdown',
    'pdf.toCsv': 'Markdown → CSV',
    'pdf.usePdfConversion': 'Convert PDF File',
    'pdf.useExistingMarkdown': 'Use Existing Markdown',
    'pdf.selectMarkdownFile': 'Select Markdown File',
    'pdf.dragAndDropPdf': 'Drag & drop a PDF file here or click the select button',
    'pdf.dragAndDropMarkdown': 'Drag & drop a Markdown file here or click the select button',
    'pdf.markdownFileReadError': 'Failed to read Markdown file'
  },
  ja: {
    'app.title': 'Tokoroten Audio Processor',
    'tab.pdf-csv': 'PDF/CSV変換',
    'tab.audio': '音声処理',
    'settings.title': '設定',
    'button.select': '選択',
    'button.execute': '実行',
    'button.save': '保存',
    'input.apiKey': 'APIキーを入力してください',
    'input.selectInputDir': '入力ディレクトリを選択してください',
    'input.selectOutputDir': '出力ディレクトリを選択してください',
    'settings.loaded': '保存された設定を読み込みました',
    'settings.saving': '保存中...',
    'settings.savingDesc': '設定を保存しています',
    'settings.saved': '設定を保存しました',
    'success.title': '成功',
    'success.dirSelected': 'ディレクトリを選択しました',
    'error.title': 'エラーが発生しました',
    'error.loadSettings': '設定の読み込みに失敗しました',
    'error.saveSettings': '設定の保存に失敗しました',
    'error.dirSelect': 'ディレクトリの選択に失敗しました',
    'audio.vocals': 'ボーカル',
    'audio.drums': 'ドラム',
    'audio.bass': 'ベース',
    'audio.other': 'その他',
    'audio.enableRenameMove': 'リネーム＆移動を有効にする',
    'audio.processing': '処理中...',
    'audio.processingDesc': '音声ファイルを処理しています',
    'audio.progress': '進捗状況',
    'pdf.title': 'PDF/CSV変換',
    'pdf.file': 'PDFファイル',
    'pdf.selectFile': 'PDFファイルを選択',
    'pdf.preview': 'プレビュー',
    'pdf.converting': '変換中...',
    'pdf.convertingToMarkdown': 'PDFをMarkdownに変換しています',
    'pdf.convertingToCsv': 'MarkdownをCSVに変換しています',
    'pdf.convertError': '変換エラー',
    'pdf.moveError': 'CSVファイルの移動に失敗しました',
    'pdf.noMarkdownGenerated': 'Markdownテキストが生成されませんでした',
    'pdf.noCsvGenerated': 'CSVファイルが生成されませんでした',
    'pdf.previewPlaceholder': 'プレビューはここに表示されます',
    'pdf.fileSelected': 'ファイルを選択しました',
    'pdf.fileSelectError': 'ファイルの選択中にエラーが発生しました',
    'pdf.conversionComplete': '変換が完了しました',
    'pdf.csvSaved': 'CSVファイルを保存しました',
    'pdf.toMarkdown': 'PDF → Markdown',
    'pdf.toCsv': 'Markdown → CSV',
    'pdf.usePdfConversion': 'PDFファイルの変換',
    'pdf.useExistingMarkdown': '既存のMarkdownを使用する',
    'pdf.selectMarkdownFile': 'Markdownファイルを選択',
    'pdf.dragAndDropPdf': 'PDFファイルをドラッグ&ドロップするか、選択ボタンをクリックしてください',
    'pdf.dragAndDropMarkdown': 'Markdownファイルをドラッグ&ドロップするか、選択ボタンをクリックしてください',
    'pdf.markdownFileReadError': 'Markdownファイルの読み込みに失敗しました'
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'ja',
  setLanguage: () => null,
  t: (key) => translations.ja[key],
});

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export function LanguageProvider({
  children,
  defaultLanguage = 'ja',
}: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(defaultLanguage);

  const t = (key: TranslationKey): string => {
    return translations[language][key];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 