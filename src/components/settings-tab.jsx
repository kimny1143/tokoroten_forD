import React, { useState, useEffect } from 'react';

export const SettingsTab = () => {
  const [settings, setSettings] = useState({
    apiKey: '',
    defaultInputDir: '',
    defaultOutputDir: '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setStatus(null);
      const savedSettings = await window.electronAPI.getSettings();
      setSettings(savedSettings);
      console.log('設定を読み込みました');
    } catch (error) {
      console.error('設定の読み込みエラー:', error);
      setStatus('error');
      setMessage('設定の読み込みに失敗しました');
    }
  };

  const handleDefaultInputDirSelect = async () => {
    try {
      setStatus(null);
      const result = await window.electronAPI.selectDirectory({
        title: 'デフォルト入力ディレクトリを選択',
      });
      if (result) {
        setSettings((prev) => ({ ...prev, defaultInputDir: result }));
      }
    } catch (error) {
      console.error('ディレクトリ選択エラー:', error);
      setStatus('error');
      setMessage('ディレクトリの選択に失敗しました');
    }
  };

  const handleDefaultOutputDirSelect = async () => {
    try {
      setStatus(null);
      const result = await window.electronAPI.selectDirectory({
        title: 'デフォルト出力ディレクトリを選択',
      });
      if (result) {
        setSettings((prev) => ({ ...prev, defaultOutputDir: result }));
      }
    } catch (error) {
      console.error('ディレクトリ選択エラー:', error);
      setStatus('error');
      setMessage('ディレクトリの選択に失敗しました');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setStatus(null);
      const result = await window.electronAPI.saveSettings(settings);
      if (result) {
        setStatus('success');
        setMessage('設定を保存しました');
      } else {
        setStatus('error');
        setMessage('設定の保存に失敗しました');
      }
    } catch (error) {
      console.error('設定の保存エラー:', error);
      setStatus('error');
      setMessage('設定の保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">API Key</label>
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, apiKey: e.target.value }))
          }
          className="w-full px-4 py-2 rounded-lg bg-slate-700 text-slate-200 dark:bg-slate-700 dark:text-slate-200 light:bg-slate-100 light:text-slate-900"
          placeholder="API Keyを入力してください"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          デフォルト入力ディレクトリ
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={settings.defaultInputDir}
            readOnly
            className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 dark:bg-slate-700 dark:text-slate-200 light:bg-slate-100 light:text-slate-900"
            placeholder="デフォルト入力ディレクトリを選択してください"
          />
          <button
            onClick={handleDefaultInputDirSelect}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            選択
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          デフォルト出力ディレクトリ
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={settings.defaultOutputDir}
            readOnly
            className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 dark:bg-slate-700 dark:text-slate-200 light:bg-slate-100 light:text-slate-900"
            placeholder="デフォルト出力ディレクトリを選択してください"
          />
          <button
            onClick={handleDefaultOutputDirSelect}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            選択
          </button>
        </div>
      </div>

      {status && (
        <div
          className={`p-4 rounded-lg ${
            status === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {message}
        </div>
      )}

      <button
        onClick={handleSaveSettings}
        disabled={saving}
        className={`w-full px-4 py-2 rounded-lg transition-colors ${
          saving
            ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-500'
        }`}
      >
        {saving ? '保存中...' : '設定を保存'}
      </button>
    </div>
  );
}; 