import React, { useState, useEffect } from 'react';

export const AudioTab = () => {
  const [inputDir, setInputDir] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [separationOptions, setSeparationOptions] = useState({
    vocals: true,
    drums: false,
    bass: false,
    other: false,
  });
  const [enableRenameMove, setEnableRenameMove] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
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
    }
  };

  const handleInputDirSelect = async () => {
    try {
      const result = await window.electronAPI.selectDirectory({
        title: '入力ディレクトリを選択',
        defaultPath: inputDir
      });
      if (result) {
        setInputDir(result);
      }
    } catch (error) {
      console.error('ディレクトリ選択エラー:', error);
    }
  };

  const handleOutputDirSelect = async () => {
    try {
      const result = await window.electronAPI.selectDirectory({
        title: '出力ディレクトリを選択',
        defaultPath: outputDir
      });
      if (result) {
        setOutputDir(result);
      }
    } catch (error) {
      console.error('ディレクトリ選択エラー:', error);
    }
  };

  const handleProcessing = async () => {
    if (!inputDir || !outputDir) {
      alert('入力ディレクトリと出力ディレクトリを指定してください');
      return;
    }

    try {
      setProcessing(true);
      setProgress(0);

      // 進捗状況更新用のイベントリスナーを設定
      const progressHandler = (event, value) => {
        console.log('Progress update:', value);
        setProgress(value);
      };
      window.electron.on('audio-progress', progressHandler);

      const result = await window.electronAPI.processAudio({
        inputDir,
        outputDir,
        options: {
          ...separationOptions,
          enableRenameMove,
        }
      });

      // イベントリスナーを削除
      window.electron.removeListener('audio-progress', progressHandler);

      if (!result.success) {
        throw new Error(result.error || '音声処理に失敗しました');
      }

      setProgress(100);
      alert('音声処理が完了しました');
    } catch (error) {
      console.error('音声処理エラー:', error);
      alert(`音声処理エラー: ${error.message}`);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const toggleOption = (option) => {
    setSeparationOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">入力ディレクトリ</label>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={inputDir}
              readOnly
              className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 dark:bg-slate-700 dark:text-slate-200 light:bg-slate-100 light:text-slate-900"
              placeholder="入力ディレクトリを選択してください"
            />
            <button
              onClick={handleInputDirSelect}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              選択
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">出力ディレクトリ</label>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={outputDir}
              readOnly
              className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-200 dark:bg-slate-700 dark:text-slate-200 light:bg-slate-100 light:text-slate-900"
              placeholder="出力ディレクトリを選択してください"
            />
            <button
              onClick={handleOutputDirSelect}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              選択
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">分離対象</label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={separationOptions.vocals}
                onChange={() => toggleOption('vocals')}
                className="w-4 h-4 rounded border-slate-500"
              />
              <span>ボーカル</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={separationOptions.drums}
                onChange={() => toggleOption('drums')}
                className="w-4 h-4 rounded border-slate-500"
              />
              <span>ドラム</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={separationOptions.bass}
                onChange={() => toggleOption('bass')}
                className="w-4 h-4 rounded border-slate-500"
              />
              <span>ベース</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={separationOptions.other}
                onChange={() => toggleOption('other')}
                className="w-4 h-4 rounded border-slate-500"
              />
              <span>その他</span>
            </label>
          </div>
        </div>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={enableRenameMove}
            onChange={(e) => setEnableRenameMove(e.target.checked)}
            className="w-4 h-4 rounded border-slate-500"
          />
          <span>リネーム＆移動を有効にする</span>
        </label>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleProcessing}
          disabled={!inputDir || !outputDir || processing}
          className={`w-full px-4 py-2 rounded-lg transition-colors ${
            !inputDir || !outputDir || processing
              ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          {processing ? '処理中...' : '実行'}
        </button>

        {processing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>進捗状況</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 