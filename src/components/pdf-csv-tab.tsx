import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-provider';

export const PdfCsvTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      // @ts-ignore - Electron specific property
      const filePath = file.path || file.webkitRelativePath;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(filePath);
        toast({
          type: 'success',
          title: t('success.title'),
          description: filePath,
        });
      } else {
        toast({
          type: 'error',
          title: t('error.title'),
          description: 'PDFファイルのみ対応しています',
        });
      }
    }
  }, [toast, t]);

  const handleFileSelect = async (): Promise<void> => {
    try {
      const result = await window.electronAPI.selectFile({
        title: t('pdf.selectFile'),
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (result) {
        setSelectedFile(result);
        toast({
          type: 'success',
          title: t('success.title'),
          description: result,
        });
      }
    } catch (error) {
      console.error('ファイル選択エラー:', error);
      toast({
        type: 'error',
        title: t('error.title'),
        description: t('pdf.fileSelectError'),
      });
    }
  };

  const handlePdfToMarkdown = async (): Promise<void> => {
    if (!selectedFile) return;
    try {
      setIsLoading(true);
      toast({
        type: 'loading',
        title: t('pdf.converting'),
        description: t('pdf.convertingToMarkdown'),
      });

      const result = await window.electronAPI.convertPdfToMarkdown(selectedFile);
      if (result.success && result.markdown_text) {
        setPreviewText(result.markdown_text);
        toast({
          type: 'success',
          title: t('success.title'),
          description: t('pdf.conversionComplete'),
        });
      } else {
        toast({
          type: 'error',
          title: t('pdf.convertError'),
          description: result.error || t('pdf.noMarkdownGenerated'),
        });
      }
    } catch (error) {
      console.error('PDF→Markdown変換エラー:', error);
      toast({
        type: 'error',
        title: t('pdf.convertError'),
        description: error instanceof Error ? error.message : t('pdf.convertError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkdownToCsv = async (): Promise<void> => {
    if (!previewText || !selectedFile) return;
    try {
      setIsLoading(true);
      toast({
        type: 'loading',
        title: t('pdf.converting'),
        description: t('pdf.convertingToCsv'),
      });

      // 設定から出力ディレクトリを取得
      const settings = await window.electronAPI.getSettings();
      const outputDir = settings.defaultOutputDir || selectedFile.substring(0, selectedFile.lastIndexOf('/'));

      // まずinputディレクトリにCSVを生成
      const result = await window.electronAPI.convertMarkdownToCsv({
        markdownContent: previewText,
        outputDir: selectedFile.substring(0, selectedFile.lastIndexOf('/')),
      });

      if (!result.success) {
        toast({
          type: 'error',
          title: t('pdf.convertError'),
          description: result.error || t('pdf.noCsvGenerated'),
        });
      } else if (result.csvPaths && result.csvPaths.length > 0) {
        // CSVファイルが生成されたら、outputDirに移動
        try {
          const moveResult = await window.electronAPI.moveFile({
            sourcePath: result.csvPaths[0],
            destinationDir: outputDir,
          });

          if (moveResult.success) {
            toast({
              type: 'success',
              title: t('success.title'),
              description: `${t('pdf.csvSaved')}: ${outputDir}`,
            });
          } else {
            toast({
              type: 'error',
              title: t('pdf.moveError'),
              description: moveResult.error || t('pdf.moveError'),
            });
          }
        } catch (moveError) {
          console.error('ファイル移動エラー:', moveError);
          toast({
            type: 'error',
            title: t('pdf.moveError'),
            description: moveError instanceof Error ? moveError.message : t('pdf.moveError'),
          });
        }
      } else {
        toast({
          type: 'error',
          title: t('pdf.convertError'),
          description: t('pdf.noCsvGenerated'),
        });
      }
    } catch (error) {
      console.error('Markdown→CSV変換エラー:', error);
      toast({
        type: 'error',
        title: t('pdf.convertError'),
        description: error instanceof Error ? error.message : t('pdf.convertError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('pdf.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('pdf.file')}</label>
              <div
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    value={selectedFile || ''}
                    readOnly
                    placeholder={t('pdf.selectFile')}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleFileSelect}
                    disabled={isLoading}
                    variant="secondary"
                  >
                    {t('button.select')}
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  PDFファイルをドラッグ&ドロップするか、選択ボタンをクリックしてください
                </p>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handlePdfToMarkdown}
                disabled={!selectedFile || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('pdf.converting')}
                  </>
                ) : (
                  t('pdf.toMarkdown')
                )}
              </Button>
              <Button
                onClick={handleMarkdownToCsv}
                disabled={!previewText || !selectedFile || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('pdf.converting')}
                  </>
                ) : (
                  t('pdf.toCsv')
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('pdf.preview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-[400px] rounded-md border">
            <pre className="absolute inset-0 overflow-auto p-4 font-mono text-sm">
              {isLoading
                ? t('pdf.converting')
                : previewText || t('pdf.previewPlaceholder')}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 