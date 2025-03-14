import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { execFile, spawn } from 'child_process';
import fs from 'fs';

// 型定義
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

// 設定ファイルのパスを定義
const userDataPath: string = app.getPath('userData');
const settingsPath: string = path.join(userDataPath, 'settings.json');

// 設定を読み込む関数
function loadSettings(): Settings {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('設定ファイルの読み込みエラー:', error);
  }
  return {
    apiKey: '',
    defaultInputDir: '',
    defaultOutputDir: ''
  };
}

// 設定を保存する関数
function saveSettings(settings: Settings): boolean {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('設定ファイルの保存エラー:', error);
    return false;
  }
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 開発環境とプロダクション環境でのロード先を分ける
  if (isDev) {
    console.log('Development mode - loading from Vite dev server');
    mainWindow.loadURL('http://127.0.0.1:3000');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Production mode - loading from dist directory');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // エラーハンドリング
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('Failed to load:', errorCode, errorDescription);
    if (isDev) {
      console.log('Retrying to connect to Vite dev server...');
      setTimeout(() => {
        mainWindow.loadURL('http://127.0.0.1:3000');
      }, 1000);
    }
  });

  return mainWindow;
}

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
  mainWindow = createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 設定の取得
ipcMain.handle('settings:get', async () => {
  return loadSettings();
});

// 設定の保存
ipcMain.handle('settings:save', async (event, settings: Settings) => {
  return saveSettings(settings);
});

// ディレクトリ選択ダイアログ
ipcMain.handle('dialog:selectDirectory', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return canceled ? null : filePaths[0];
});

// ファイル選択ダイアログ
ipcMain.handle('dialog:selectFile', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('dialog:openDirectory', async (): Promise<string | null> => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('process-audio', async (event, params: AudioProcessingParams): Promise<AudioProcessingResult> => {
    try {
        const { inputDir, outputDir, options } = params;
        
        // 入力チェック
        if (!inputDir || !outputDir) {
            throw new Error('入力ディレクトリと出力ディレクトリを指定してください');
        }

        const scriptPath = path.join(__dirname, '..', 'python', 'api.py');
        const pythonPath = isDev ? 'python' : path.join(process.resourcesPath, 'python');
        const env: NodeJS.ProcessEnv = {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            PYTHONIOENCODING: 'utf-8',
            LANG: 'ja_JP.UTF-8',
            LC_ALL: 'ja_JP.UTF-8',
            LC_CTYPE: 'ja_JP.UTF-8'
        };

        if (isDev) {
            env.PYTHONPATH = path.join(__dirname, '..', 'python');
        }

        // sourcesパラメータを構築
        const sources = {
            vocals: options.vocals || false,
            drums: options.drums || false,
            bass: options.bass || false,
            other: options.other || false
        };

        const result = await new Promise<AudioProcessingResult>((resolve, reject) => {
            const args = isDev
                ? [
                    scriptPath,
                    '--mode', 'audio',
                    '--input-dir', inputDir,
                    '--output-dir', outputDir,
                    '--sources', JSON.stringify(sources),
                    '--enable-rename-move', options.enableRenameMove ? 'true' : 'false'
                ]
                : [
                    '--mode', 'audio',
                    '--input-dir', inputDir,
                    '--output-dir', outputDir,
                    '--sources', JSON.stringify(sources),
                    '--enable-rename-move', options.enableRenameMove ? 'true' : 'false'
                ];

            const pythonProcess = spawn(pythonPath, args, {
                env,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdoutData = '';
            let stderrData = '';

            pythonProcess.stdout.on('data', (data: Buffer) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        try {
                            const jsonData = JSON.parse(line);
                            if (jsonData.progress !== undefined) {
                                event.sender.send('audio-progress', jsonData.progress);
                            } else {
                                // 進捗以外のJSONデータは上書き
                                stdoutData = line;
                            }
                        } catch (e) {
                            console.error('JSON parse error:', e);
                            stderrData += line + '\n';
                        }
                    }
                });
            });

            pythonProcess.stderr.on('data', (data: Buffer) => {
                stderrData += data.toString();
            });

            pythonProcess.on('close', (code: number | null) => {
                try {
                    // 出力ディレクトリにファイルが生成されているか確認
                    const checkOutputFiles = (dir: string): boolean => {
                        const files = fs.readdirSync(dir);
                        let hasOutputFiles = false;
                        for (const file of files) {
                            const fullPath = path.join(dir, file);
                            const stat = fs.statSync(fullPath);
                            if (stat.isDirectory()) {
                                if (checkOutputFiles(fullPath)) {
                                    hasOutputFiles = true;
                                }
                            } else if (file.endsWith('.wav')) {
                                hasOutputFiles = true;
                            }
                        }
                        return hasOutputFiles;
                    };

                    const hasProcessedFiles = checkOutputFiles(outputDir);
                    
                    if (hasProcessedFiles) {
                        resolve({
                            success: true,
                            message: '音声処理が完了しました',
                            outputDir
                        });
                    } else if (stdoutData) {
                        const result = JSON.parse(stdoutData);
                        if (result.success) {
                            resolve(result);
                        } else {
                            reject(new Error(result.error || '音声処理エラー'));
                        }
                    } else {
                        reject(new Error('処理結果が見つかりません'));
                    }
                } catch (error) {
                    reject(new Error(`音声処理エラー: ${error instanceof Error ? error.message : '不明なエラー'}\n${stderrData}`));
                }
            });
        });

        return result;
    } catch (error) {
        console.error('Error in audio processing:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '音声処理中にエラーが発生しました'
        };
    }
});

ipcMain.handle('convert-pdf', async (event, params): Promise<{ success: boolean }> => {
  // TODO: PDF変換の実装
  return { success: true };
});

interface PdfToMarkdownParams {
  pdfPath: string;
}

ipcMain.handle('convert-pdf-to-markdown', async (event, params: PdfToMarkdownParams) => {
  try {
    console.log('Converting PDF to Markdown:', params.pdfPath);
    
    const scriptPath = path.join(__dirname, '..', 'python', 'api.py');
    const outputPath = path.join(path.dirname(params.pdfPath), path.basename(params.pdfPath, '.pdf') + '.md');
    
    // 設定からAPIキーを取得
    const settings = loadSettings();
    
    return new Promise((resolve, reject) => {
      const pythonProcess = execFile(
        'python',
        [
          scriptPath,
          '--mode', 'pdf',
          '--input', params.pdfPath,
          '--output', outputPath,
          '--api-key', settings.apiKey
        ],
        (error, stdout, stderr) => {
          if (error) {
            console.error('PDF変換エラー:', error);
            reject(error);
            return;
          }
          
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (e) {
            console.error('JSON解析エラー:', e);
            reject(e);
          }
        }
      );
    });
  } catch (error) {
    console.error('PDF変換エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF変換中にエラーが発生しました'
    };
  }
}); 