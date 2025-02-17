import React, { useState, useEffect } from 'react';
import { AppSettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './language-provider';

export const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    language: 'ja',
    audioSettings: {
      sampleRate: 44100,
      channels: 2,
      format: 'wav',
      quality: 1.0,
    },
    pdfSettings: {
      outputFormat: 'markdown',
      includeImages: true,
      imageQuality: 0.8,
      extractTables: true,
    },
    apiKey: '',
    defaultInputDir: '',
    defaultOutputDir: '',
  });
  const [saving, setSaving] = useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      const savedSettings = await window.electronAPI.getSettings();
      setSettings(savedSettings);
      toast({
        type: 'success',
        title: t('settings.title'),
        description: t('settings.loaded'),
      });
    } catch (error) {
      console.error('設定の読み込みエラー:', error);
      toast({
        type: 'error',
        title: t('error.title'),
        description: t('error.loadSettings'),
      });
    }
  };

  const handleDefaultInputDirSelect = async (): Promise<void> => {
    try {
      const result = await window.electronAPI.selectDirectory({
        title: t('input.selectInputDir'),
      });
      if (result) {
        setSettings((prev) => ({ ...prev, defaultInputDir: result }));
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

  const handleDefaultOutputDirSelect = async (): Promise<void> => {
    try {
      const result = await window.electronAPI.selectDirectory({
        title: t('input.selectOutputDir'),
      });
      if (result) {
        setSettings((prev) => ({ ...prev, defaultOutputDir: result }));
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

  const handleSaveSettings = async (): Promise<void> => {
    try {
      setSaving(true);
      toast({
        type: 'loading',
        title: t('settings.saving'),
        description: t('settings.savingDesc'),
      });

      const result = await window.electronAPI.saveSettings(settings);
      if (result) {
        toast({
          type: 'success',
          title: t('success.title'),
          description: t('settings.saved'),
        });
      } else {
        toast({
          type: 'error',
          title: t('error.title'),
          description: t('error.saveSettings'),
        });
      }
    } catch (error) {
      console.error('設定の保存エラー:', error);
      toast({
        type: 'error',
        title: t('error.title'),
        description: t('error.saveSettings'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('input.apiKey')}
            </label>
            <Input
              type="password"
              value={settings.apiKey || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSettings((prev) => ({ ...prev, apiKey: e.target.value }))
              }
              className="w-full"
              placeholder={t('input.apiKey')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('input.selectInputDir')}
            </label>
            <div className="flex items-center space-x-4">
              <Input
                type="text"
                value={settings.defaultInputDir || ''}
                readOnly
                className="flex-1"
                placeholder={t('input.selectInputDir')}
              />
              <Button
                onClick={handleDefaultInputDirSelect}
                disabled={saving}
                variant="secondary"
              >
                {t('button.select')}
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('input.selectOutputDir')}
            </label>
            <div className="flex items-center space-x-4">
              <Input
                type="text"
                value={settings.defaultOutputDir || ''}
                readOnly
                className="flex-1"
                placeholder={t('input.selectOutputDir')}
              />
              <Button
                onClick={handleDefaultOutputDirSelect}
                disabled={saving}
                variant="secondary"
              >
                {t('button.select')}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('settings.saving')}
              </>
            ) : (
              t('button.save')
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}; 