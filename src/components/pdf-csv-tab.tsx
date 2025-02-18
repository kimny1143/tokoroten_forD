import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-provider';
import * as Dialog from '@radix-ui/react-dialog';
import { Checkbox } from '@/components/ui/checkbox';

export const PdfCsvTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [usePdfConversion, setUsePdfConversion] = useState<boolean>(true);
  const [useExistingMarkdown, setUseExistingMarkdown] = useState<boolean>(false);
  const [markdownFile, setMarkdownFile] = useState<string | null>(null);
  const [isMarkdownDragging, setIsMarkdownDragging] = useState<boolean>(false);
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
    if (!previewText) return;
    try {
      setIsLoading(true);
      toast({
        type: 'loading',
        title: t('pdf.converting'),
        description: t('pdf.convertingToCsv'),
      });

      // 設定から出力ディレクトリを取得
      const settings = await window.electronAPI.getSettings();
      const filePath = useExistingMarkdown ? markdownFile : selectedFile;
      if (!filePath) return;
      
      const outputDir = settings.defaultOutputDir || filePath.substring(0, filePath.lastIndexOf('/'));

      // まずinputディレクトリにCSVを生成
      const result = await window.electronAPI.convertMarkdownToCsv({
        markdownContent: previewText,
        outputDir: filePath.substring(0, filePath.lastIndexOf('/')),
      });

      if (result.success && result.csvPaths && result.csvPaths.length > 0) {
        // CSVファイルが生成されたら、outputDirに移動
        try {
          const moveResult = await window.electronAPI.moveFile({
            sourcePath: result.csvPaths[0],
            destinationDir: outputDir,
          });

          if (moveResult.success) {
            setShowSuccessDialog(true);  // 成功ダイアログを表示
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
          description: result.error || t('pdf.noCsvGenerated'),
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

  const handleMarkdownDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMarkdownDragging(true);
  }, []);

  const handleMarkdownDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMarkdownDragging(false);
  }, []);

  const handleMarkdownDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMarkdownDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      // @ts-ignore - Electron specific property
      const filePath = file.path || file.webkitRelativePath;
      if (file.name.toLowerCase().endsWith('.md')) {
        setMarkdownFile(filePath);
        // ファイルの内容を読み込んでプレビューに表示
        try {
          const result = await window.electronAPI.readFile(filePath);
          if (result.success && result.content) {
            setPreviewText(result.content);
            toast({
              type: 'success',
              title: t('success.title'),
              description: filePath,
            });
          } else {
            throw new Error(result.error || t('pdf.markdownFileReadError'));
          }
        } catch (error) {
          console.error('Markdownファイル読み込みエラー:', error);
          toast({
            type: 'error',
            title: t('error.title'),
            description: t('pdf.markdownFileReadError'),
          });
        }
      } else {
        toast({
          type: 'error',
          title: t('error.title'),
          description: 'Markdownファイルのみ対応しています',
        });
      }
    }
  }, [toast, t]);

  const handleMarkdownFileSelect = async (): Promise<void> => {
    try {
      const result = await window.electronAPI.selectFile({
        title: t('pdf.selectMarkdownFile'),
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (result) {
        setMarkdownFile(result);
        // ファイルの内容を読み込んでプレビューに表示
        const fileResult = await window.electronAPI.readFile(result);
        if (fileResult.success && fileResult.content) {
          setPreviewText(fileResult.content);
          toast({
            type: 'success',
            title: t('success.title'),
            description: result,
          });
        } else {
          throw new Error(fileResult.error || t('pdf.markdownFileReadError'));
        }
      }
    } catch (error) {
      console.error('ファイル選択エラー:', error);
      toast({
        type: 'error',
        title: t('error.title'),
        description: t('pdf.markdownFileReadError'),
      });
    }
  };

  return (
    <div className="space-y-6">
      <Dialog.Root open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <Dialog.Title className="text-2xl font-semibold leading-none tracking-tight">
                Success!!!
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground">
                {t('pdf.conversionComplete')}
              </Dialog.Description>
            </div>
            <div className="flex justify-center">
              <Button
                onClick={() => setShowSuccessDialog(false)}
                className="w-24"
              >
                OK
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Card>
        <CardHeader>
          <CardTitle>{t('pdf.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={usePdfConversion}
                onCheckedChange={(checked: boolean | 'indeterminate') => {
                  setUsePdfConversion(checked === true);
                  if (checked === true) {
                    setUseExistingMarkdown(false);
                    setMarkdownFile(null);
                  }
                }}
                id="pdf-conversion"
              />
              <label
                htmlFor="pdf-conversion"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('pdf.usePdfConversion')}
              </label>
            </div>

            {usePdfConversion && (
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
                    {t('pdf.dragAndDropPdf')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={useExistingMarkdown}
                onCheckedChange={(checked: boolean | 'indeterminate') => {
                  setUseExistingMarkdown(checked === true);
                  if (checked === true) {
                    setUsePdfConversion(false);
                    setSelectedFile(null);
                  }
                }}
                id="existing-markdown"
              />
              <label
                htmlFor="existing-markdown"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('pdf.useExistingMarkdown')}
              </label>
            </div>

            {useExistingMarkdown && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('pdf.selectMarkdownFile')}</label>
                <div
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors ${
                    isMarkdownDragging
                      ? 'border-primary bg-primary/10'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onDragOver={handleMarkdownDragOver}
                  onDragLeave={handleMarkdownDragLeave}
                  onDrop={handleMarkdownDrop}
                >
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={markdownFile || ''}
                      readOnly
                      placeholder={t('pdf.selectMarkdownFile')}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleMarkdownFileSelect}
                      disabled={isLoading}
                      variant="secondary"
                    >
                      {t('button.select')}
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('pdf.dragAndDropMarkdown')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={handlePdfToMarkdown}
                disabled={!selectedFile || isLoading || !usePdfConversion}
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
                disabled={!previewText || isLoading || (!useExistingMarkdown && !usePdfConversion)}
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