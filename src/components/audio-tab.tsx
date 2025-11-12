import React, { useState, useEffect } from 'react';
import { SeparationOptions, AudioProcessingParams } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-provider';
import * as Dialog from '@radix-ui/react-dialog';

export const AudioTab: React.FC = () => {
  const [inputDir, setInputDir] = useState<string>('');
  const [outputDir, setOutputDir] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      const savedSettings = await window.electronAPI.getSettings();
      if (savedSettings.defaultInputDir) {
        setInputDir(savedSettings.defaultInputDir);
      }
      if (savedSettings.defaultOutputDir) {
        setOutputDir(savedSettings.defaultOutputDir);
      }
    } catch (error) {
      console.error('設定の読み込みエラー:', error);
      toast({
        type: 'error',
        title: t('error.title'),
        description: t('error.loadSettings'),
      });
    }
  };

  const handleInputDirSelect = async (): Promise<void> => {
    try {
      const result = await window.electronAPI.selectDirectory({
        title: t('input.selectInputDir'),
      });
      if (result) {
        setInputDir(result);
        toast({
          type: 'success',
          title: t('success.title'),
          description: t('success.dirSelected'),
        });
      }
    } catch (error) {
      console.error('ディレクトリ選択エラー:', error);
      toast({
        type: 'error',
        title: t('error.title'),
        description: t('error.dirSelect'),
      });
    }
  };

  const handleOutputDirSelect = async (): Promise<void> => {
    try {
      const result = await window.electronAPI.selectDirectory({
        title: t('input.selectOutputDir'),
      });
      if (result) {
        setOutputDir(result);
        toast({
          type: 'success',
          title: t('success.title'),
          description: t('success.dirSelected'),
        });
      }
    } catch (error) {
      console.error('ディレクトリ選択エラー:', error);
      toast({
        type: 'error',
        title: t('error.title'),
        description: t('error.dirSelect'),
      });
    }
  };

  const handleProcessing = async (): Promise<void> => {
    if (!inputDir || !outputDir) {
      toast({
        type: 'error',
        title: t('error.title'),
        description: t('error.dirSelect'),
      });
      return;
    }

    try {
      setProcessing(true);
      setProgress(0);
      toast({
        type: 'loading',
        title: t('audio.processing'),
        description: t('audio.processingDesc'),
      });

      const progressHandler = (_event: any, value: number): void => {
        console.log('Progress update:', value);
        setProgress(value);
      };
      window.electron.on('audio-progress', progressHandler);

      const params: AudioProcessingParams = {
        inputDir,
        outputDir,
        options: {
          vocals: true,
          drums: true,
          bass: true,
          other: true,
          enableRenameMove: true,
        },
      };

      const result = await window.electronAPI.processAudio(params);
      window.electron.removeListener('audio-progress', progressHandler);

      console.log('Audio processing result:', result);

      if (!result.success) {
        throw new Error(result.error || '音声処理に失敗しました');
      }

      console.log('Processing completed successfully');
      setProgress(100);
      setShowSuccessDialog(true);  // 成功ダイアログを表示

      // 処理完了後も進捗バーを表示し続ける
      setTimeout(() => {
        setProcessing(false);
        setProgress(0);
      }, 2000);
    } catch (error) {
      console.error('音声処理エラー:', error);
      toast({
        type: 'error',
        title: t('error.title'),
        description: error instanceof Error ? error.message : t('error.dirSelect'),
        duration: 5000
      });
      setProcessing(false);
      setProgress(0);
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
                音声処理が完了しました
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
          <CardTitle>{t('tab.audio')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('input.selectInputDir')}
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  value={inputDir}
                  readOnly
                  placeholder={t('input.selectInputDir')}
                  className="flex-1"
                />
                <Button
                  onClick={handleInputDirSelect}
                  disabled={processing}
                  variant="secondary"
                >
                  {t('button.select')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('input.selectOutputDir')}
              </label>
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  value={outputDir}
                  readOnly
                  placeholder={t('input.selectOutputDir')}
                  className="flex-1"
                />
                <Button
                  onClick={handleOutputDirSelect}
                  disabled={processing}
                  variant="secondary"
                >
                  {t('button.select')}
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={handleProcessing}
            disabled={!inputDir || !outputDir || processing}
            className="w-full"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('audio.processing')}
              </>
            ) : (
              t('button.execute')
            )}
          </Button>

          {processing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('audio.progress')}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 