import React, { useState } from 'react';
import path from 'path';

export const PdfCsvTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (): Promise<void> => {
    try {
      setError(null);
      const result = await window.electronAPI.selectFile({
        title: 'PDFファイルを選択',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      console.log('Selected file:', result);
      if (result) {
        setSelectedFile(result);
      }
    } catch (error) {
      console.error('ファイル選択エラー:', error);
      setError('ファイルの選択中にエラーが発生しました');
    }
  };

  const handlePdfToMarkdown = async (): Promise<void> => {
    if (!selectedFile) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await window.electronAPI.convertPdfToMarkdown(selectedFile);
      console.log('PDF to Markdown result:', {
        success: result.success,
        hasMarkdownText: !!result.markdown_text,
        markdownTextLength: result.markdown_text?.length,
        sample: result.markdown_text?.substring(0, 100) + '...',
      });
      if (result.success && result.markdown_text) {
        setPreviewText(result.markdown_text);
      } else {
        setError(
          result.error ||
            'PDF変換中にエラーが発生しました。Markdownテキストが生成されませんでした。'
        );
      }
    } catch (error) {
      console.error('PDF→Markdown変換エラー:', error);
      setError('PDF→Markdown変換中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkdownToCsv = async (): Promise<void> => {
    if (!previewText || !selectedFile) return;
    try {
      setIsLoading(true);
      setError(null);

      console.log('Converting to CSV with markdown:', {
        type: typeof previewText,
        length: previewText.length,
        sample: previewText.substring(0, 100),
      });

      const result = await window.electronAPI.convertMarkdownToCsv({
        markdownContent: previewText,
        outputDir: selectedFile ? path.dirname(selectedFile) : null,
      });

      console.log('CSV conversion result:', result);

      if (!result.success) {
        setError(result.error || 'CSV変換中にエラーが発生しました');
      } else if (result.csvPaths && result.csvPaths.length > 0) {
        console.log('CSV files created:', result.csvPaths);
        setError(null);
        alert(
          result.message || `CSVファイルが生成されました: ${result.outputDir}`
        );
      } else {
        setError('CSVファイルが生成されませんでした');
      }
    } catch (error) {
      console.error('Markdown→CSV変換エラー:', error);
      setError('Markdown→CSV変換中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">PDFファイル</label>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={selectedFile || ''}
              readOnly
              className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 dark:bg-slate-700 dark:text-slate-200 light:bg-slate-100 light:text-slate-900"
              placeholder="PDFファイルを選択してください"
            />
            <button
              onClick={handleFileSelect}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              選択
            </button>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handlePdfToMarkdown}
            disabled={!selectedFile || isLoading}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !selectedFile || isLoading
                ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {isLoading ? '変換中...' : 'PDF → Markdown'}
          </button>
          <button
            onClick={handleMarkdownToCsv}
            disabled={!previewText || !selectedFile || isLoading}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !previewText || !selectedFile || isLoading
                ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {isLoading ? '変換中...' : 'Markdown → CSV'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500 text-white rounded-lg">{error}</div>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">プレビュー</label>
        <div className="h-[400px] p-4 rounded-lg bg-slate-700 dark:bg-slate-700 light:bg-slate-100 overflow-auto">
          <pre className="whitespace-pre-wrap font-mono text-sm">
            {isLoading
              ? '変換中...'
              : previewText || 'プレビューはここに表示されます'}
          </pre>
        </div>
      </div>
    </div>
  );
}; 