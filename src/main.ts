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

// デフォルトの設定値
const defaultSettings: Settings = {
  apiKey: '',
  defaultInputDir: '',
  defaultOutputDir: ''
};

// 設定を読み込む関数
function loadSettings(): Settings {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(data);
      
      // 開発環境の場合は設定をそのまま返す
      if (isDev) {
        return settings;
      }
      
      // 本番環境の場合は、APIキーを初期化する
      // これにより、開発時のAPIキーが本番環境に漏れることを防ぐ
      return {
        ...settings,
        apiKey: '' // APIキーを常に空にする
      };
    } else {
      // 設定ファイルが存在しない場合は、デフォルト値で新しく作成
      saveSettings(defaultSettings);
      return { ...defaultSettings };
    }
  } catch (error) {
    console.error('設定ファイルの読み込みエラー:', error);
    // エラーが発生した場合もデフォルト値を返す
    return { ...defaultSettings };
  }
}

// 設定を保存する関数
function saveSettings(settings: Settings): boolean {
  try {
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(path.dirname(settingsPath))) {
      fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    }
    
    // 本番環境の場合は、APIキーを初期化する
    const settingsToSave = isDev ? settings : {
      ...settings,
      apiKey: '' // APIキーを常に空にする
    };
    
    fs.writeFileSync(settingsPath, JSON.stringify(settingsToSave, null, 2));
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
    mainWindow.loadFile(path.join(__dirname, './dist/index.html'));
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
  // 本番環境の場合、既存の設定ファイルを削除して初期化する
  if (!isDev && fs.existsSync(settingsPath)) {
    try {
      // 既存の設定を読み込む
      const data = fs.readFileSync(settingsPath, 'utf8');
      const existingSettings = JSON.parse(data);
      
      // APIキーを削除した設定を保存
      const cleanSettings = {
        ...existingSettings,
        apiKey: '' // APIキーを削除
      };
      
      // 設定を保存
      fs.writeFileSync(settingsPath, JSON.stringify(cleanSettings, null, 2));
      console.log('設定ファイルを初期化しました');
    } catch (error) {
      console.error('設定ファイルの初期化エラー:', error);
      // エラーが発生した場合は、ファイルを削除して新しく作成
      try {
        fs.unlinkSync(settingsPath);
        saveSettings(defaultSettings);
      } catch (e) {
        console.error('設定ファイルの削除エラー:', e);
      }
    }
  } else if (!fs.existsSync(settingsPath)) {
    // 設定ファイルが存在しない場合は作成
    saveSettings(defaultSettings);
    console.log('新しい設定ファイルを作成しました');
  }
  
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
ipcMain.handle('dialog:selectFile', async (event, options = {}) => {
  if (!mainWindow) return null;
  
  // デフォルトのフィルター
  const defaultFilters = [
    { name: 'PDF Files', extensions: ['pdf'] },
    { name: 'Markdown Files', extensions: ['md'] },
    { name: 'All Files', extensions: ['*'] }
  ];
  
  // オプションからフィルターを取得するか、デフォルトを使用
  const filters = options.filters || defaultFilters;
  
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters,
    title: options.title || 'ファイルを選択'
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

        const scriptPath = isDev 
          ? path.join(app.getAppPath(), 'python', 'api.py')
          : path.join(process.resourcesPath, 'python');
        console.log('Script path:', scriptPath);
        
        const pythonPath = isDev ? 'python' : path.join(process.resourcesPath, 'python');
        console.log('Python path:', pythonPath);
        
        const env: NodeJS.ProcessEnv = {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            PYTHONIOENCODING: 'utf-8',
            LANG: 'ja_JP.UTF-8',
            LC_ALL: 'ja_JP.UTF-8',
            LC_CTYPE: 'ja_JP.UTF-8'
        };

        if (isDev) {
            env.PYTHONPATH = path.join(app.getAppPath(), 'python');
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
    
    const scriptPath = isDev 
      ? path.join(app.getAppPath(), 'python', 'api.py')
      : path.join(process.resourcesPath, 'python');
    console.log('Script path:', scriptPath);
    
    const outputPath = path.join(path.dirname(params.pdfPath), path.basename(params.pdfPath, '.pdf') + '.md');
    
    // 設定からAPIキーを取得
    const settings = loadSettings();
    
    return new Promise((resolve, reject) => {
      const pythonPath = isDev ? 'python' : path.join(process.resourcesPath, 'python');
      console.log('Python path:', pythonPath);
      
      const args = isDev
        ? [
            scriptPath,
            '--mode', 'pdf',
            '--input', params.pdfPath,
            '--output', outputPath,
            '--api-key', settings.apiKey
          ]
        : [
            '--mode', 'pdf',
            '--input', params.pdfPath,
            '--output', outputPath,
            '--api-key', settings.apiKey
          ];
      
      const pythonProcess = execFile(
        pythonPath,
        args,
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

// マークダウンからCSVへの変換
interface MarkdownToCsvParams {
  markdownContent: string;
  outputDir: string | null;
}

ipcMain.handle('convert-markdown-to-csv', async (event, params: MarkdownToCsvParams) => {
  try {
    console.log('Converting Markdown to CSV');
    console.log('Markdown content length:', params.markdownContent.length);
    console.log('Output directory:', params.outputDir);
    
    // マークダウンの前処理：テーブル形式を修正
    let markdownContent = params.markdownContent;
    
    // 簡易的なテーブルを作成
    // 元のマークダウンが複雑すぎる場合は、シンプルなテーブルを新たに作成
    const lines = markdownContent.split('\n');
    let tableData = [];
    
    // テーブルデータを抽出
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        // 行を分割して配列に格納
        const cells = line.split('|')
          .filter(cell => cell !== '') // 空のセルを除外
          .map(cell => cell.trim()); // 各セルの前後の空白を削除
        
        if (cells.length > 0) {
          tableData.push(cells);
        }
      }
    }
    
    // テーブルデータが存在する場合、新しいマークダウンテーブルを作成
    if (tableData.length > 0) {
      // ヘッダー行を取得
      const headerRow = tableData[0];
      
      // 新しいマークダウンテーブルを作成
      let newMarkdown = "# 録音シート\n\n";
      
      // ヘッダー行を追加
      newMarkdown += "| " + headerRow.join(" | ") + " |\n";
      
      // セパレータ行を追加
      newMarkdown += "|" + headerRow.map(() => " --- |").join("");
      newMarkdown += "\n";
      
      // データ行を追加
      for (let i = 1; i < tableData.length; i++) {
        const row = tableData[i];
        // ヘッダーと同じ列数になるように調整
        while (row.length < headerRow.length) {
          row.push(''); // 足りない列を空文字で埋める
        }
        newMarkdown += "| " + row.slice(0, headerRow.length).join(" | ") + " |\n";
      }
      
      // 新しいマークダウンを使用
      markdownContent = newMarkdown;
      console.log('Created simplified markdown table');
    } else {
      console.log('No table data found, using original markdown');
      
      // テーブルの行を正規化
      const lines = markdownContent.split('\n');
      let inTable = false;
      let tableStartIndex = -1;
      let headerRow = '';
      let separatorRow = '';
      
      // テーブルを検出して修正
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // テーブルの開始を検出（|で始まる行）
        if (line.startsWith('|') && !inTable) {
          inTable = true;
          tableStartIndex = i;
          headerRow = line;
          
          // 次の行がセパレータ行かチェック
          if (i + 1 < lines.length && lines[i + 1].trim().startsWith('|') && lines[i + 1].includes('-')) {
            separatorRow = lines[i + 1].trim();
            i++; // セパレータ行をスキップ
          } else {
            // セパレータ行がない場合は作成
            const columns = headerRow.split('|').filter(Boolean).length;
            separatorRow = '|' + ' --- |'.repeat(columns);
            // セパレータ行を挿入
            lines.splice(i + 1, 0, separatorRow);
            i++; // 挿入したセパレータ行をスキップ
          }
          continue;
        }
        
        // テーブル内の行を処理
        if (inTable && line.startsWith('|')) {
          // 処理は必要なし、そのまま続行
          continue;
        }
        
        // テーブルの終了を検出（空行または|で始まらない行）
        if (inTable && (line === '' || !line.startsWith('|'))) {
          inTable = false;
        }
      }
      
      // 修正したマークダウンを結合
      markdownContent = lines.join('\n');
    }
    
    console.log('Preprocessed markdown content');
    
    // 開発環境とプロダクション環境でのパスを分ける
    const scriptPath = isDev 
      ? path.join(app.getAppPath(), 'python', 'api.py')
      : path.join(process.resourcesPath, 'python');
    console.log('Script path:', scriptPath);
    console.log('App path:', app.getAppPath());
    
    // 一時的なマークダウンファイルを作成
    const tempDir = app.getPath('temp');
    const tempMarkdownPath = path.join(tempDir, `temp_${Date.now()}.md`);
    console.log('Temp markdown path:', tempMarkdownPath);
    
    // マークダウン内容をファイルに書き込む
    fs.writeFileSync(tempMarkdownPath, markdownContent);
    console.log('Wrote markdown content to temp file');
    
    // 出力ディレクトリの設定
    const outputDir = params.outputDir || path.dirname(tempMarkdownPath);
    console.log('Final output directory:', outputDir);
    
    // 設定からAPIキーを取得
    const settings = loadSettings();
    
    return new Promise((resolve, reject) => {
      console.log('Executing Python process...');
      
      // 開発環境とプロダクション環境で引数を分ける
      const args = isDev
        ? [
            scriptPath,
            '--mode', 'markdown-to-csv',
            '--input', tempMarkdownPath,
            '--output-dir', outputDir,
            '--api-key', settings.apiKey
          ]
        : [
            '--mode', 'markdown-to-csv',
            '--input', tempMarkdownPath,
            '--output-dir', outputDir,
            '--api-key', settings.apiKey
          ];
      
      const pythonPath = isDev ? 'python' : path.join(process.resourcesPath, 'python');
      console.log('Python path:', pythonPath);
      console.log('Args:', args);
      
      const pythonProcess = execFile(
        pythonPath,
        args,
        (error, stdout, stderr) => {
          console.log('Python process completed');
          console.log('stdout:', stdout);
          console.log('stderr:', stderr);
          
          // 一時ファイルを削除
          try {
            fs.unlinkSync(tempMarkdownPath);
            console.log('Deleted temp markdown file');
          } catch (e) {
            console.error('一時ファイル削除エラー:', e);
          }
          
          if (error) {
            console.error('CSV変換エラー:', error);
            reject(error);
            return;
          }
          
          try {
            const result = JSON.parse(stdout);
            console.log('Parsed result:', result);
            resolve(result);
          } catch (e) {
            console.error('JSON解析エラー:', e);
            reject(e);
          }
        }
      );
    });
  } catch (error) {
    console.error('CSV変換エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'CSV変換中にエラーが発生しました'
    };
  }
});

// ファイル移動
interface MoveFileParams {
  sourcePath: string;
  destinationDir: string;
}

ipcMain.handle('file:move', async (event, params: MoveFileParams) => {
  try {
    const { sourcePath, destinationDir } = params;
    
    // 送信元ファイルが存在するか確認
    if (!fs.existsSync(sourcePath)) {
      return {
        success: false,
        error: '送信元ファイルが見つかりません'
      };
    }
    
    // 送信先ディレクトリが存在するか確認
    if (!fs.existsSync(destinationDir)) {
      // ディレクトリが存在しない場合は作成
      fs.mkdirSync(destinationDir, { recursive: true });
    }
    
    const fileName = path.basename(sourcePath);
    const destinationPath = path.join(destinationDir, fileName);
    
    // ファイルをコピー
    fs.copyFileSync(sourcePath, destinationPath);
    
    // 元のファイルを削除
    fs.unlinkSync(sourcePath);
    
    return {
      success: true,
      destinationPath
    };
  } catch (error) {
    console.error('ファイル移動エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ファイル移動中にエラーが発生しました'
    };
  }
});

// ファイル読み込み
ipcMain.handle('file:read', async (event, filePath: string) => {
  try {
    // ファイルが存在するか確認
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'ファイルが見つかりません'
      };
    }
    
    // ファイルを読み込む
    const content = fs.readFileSync(filePath, 'utf8');
    
    return {
      success: true,
      content
    };
  } catch (error) {
    console.error('ファイル読み込みエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ファイル読み込み中にエラーが発生しました'
    };
  }
});

// PDFファイル選択ダイアログ
ipcMain.handle('dialog:openPDFFile', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] }
    ]
  });
  return canceled ? null : filePaths[0];
}); 