const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { execFile } = require('child_process');
const fs = require('fs');
const { spawn } = require('child_process');

// 設定ファイルのパスを定義
const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');

// 設定を読み込む関数
function loadSettings() {
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
function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('設定ファイルの保存エラー:', error);
    return false;
  }
}

function createWindow() {
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

let mainWindow;

app.whenReady().then(() => {
  mainWindow = createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('process-audio', async (event, params) => {
    try {
        const { inputDir, outputDir, options } = params;
        
        // 入力チェック
        if (!inputDir || !outputDir) {
            throw new Error('入力ディレクトリと出力ディレクトリを指定してください');
        }

        const scriptPath = path.join(__dirname, '..', 'python', 'api.py');
        const pythonPath = isDev ? 'python' : path.join(process.resourcesPath, 'python');
        const env = {
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

        const result = await new Promise((resolve, reject) => {
            const pythonProcess = spawn(pythonPath, [
                scriptPath,
                '--mode', 'audio',
                '--input-dir', inputDir,
                '--output-dir', outputDir,
                '--sources', JSON.stringify(sources),
                '--enable-rename-move', options.enableRenameMove ? 'true' : 'false'
            ], {
                env,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdoutData = '';
            let stderrData = '';

            pythonProcess.stdout.on('data', (data) => {
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

            pythonProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            pythonProcess.on('close', (code) => {
                try {
                    // 出力ディレクトリにファイルが生成されているか確認
                    const checkOutputFiles = (dir) => {
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
                    reject(new Error(`音声処理エラー: ${error.message}\n${stderrData}`));
                }
            });
        });

        return result;
    } catch (error) {
        console.error('Error in audio processing:', error);
        return {
            success: false,
            error: error.message || '音声処理中にエラーが発生しました'
        };
    }
});

ipcMain.handle('convert-pdf', async (event, params) => {
  // TODO: PDF変換の実装
  return { success: true };
});

ipcMain.handle('convert-pdf-to-markdown', async (event, params) => {
  try {
    console.log('Converting PDF to Markdown:', params.pdfPath);
    
    const scriptPath = path.join(__dirname, '..', 'python', 'api.py');
    const outputPath = path.join(path.dirname(params.pdfPath), path.basename(params.pdfPath, '.pdf') + '.md');
    
    // 設定からAPIキーを取得
    const settings = loadSettings();
    const apiKey = settings.apiKey;
    
    if (!apiKey) {
      throw new Error('APIキーが設定されていません。設定画面でAPIキーを設定してください。');
    }

    console.log('Starting PDF conversion with:', {
      scriptPath,
      pdfPath: params.pdfPath,
      outputPath,
      hasApiKey: !!apiKey
    });

    const result = await new Promise((resolve, reject) => {
      const pythonPath = isDev ? 'python' : path.join(process.resourcesPath, 'python');
      const env = {
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

      console.log('Python environment:', {
        pythonPath,
        PYTHONPATH: env.PYTHONPATH,
        scriptPath,
        encoding: env.PYTHONIOENCODING,
        locale: env.LANG
      });

      const pythonProcess = spawn(pythonPath, [
        scriptPath,
        '--mode', 'pdf-to-markdown',
        '--input', params.pdfPath,
        '--output', outputPath,
        '--api-key', apiKey
      ], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });

      let outputData = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString('utf8');
        console.log('Python stdout:', output);
        if (output.includes('{"status":')) {
          outputData = output.substring(output.indexOf('{'), output.lastIndexOf('}') + 1);
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString('utf8');
        console.error('Python stderr:', error);
        errorOutput += error;
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error(`Python実行エラー: ${error.message}`));
      });

      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        if (code === 0) {
          try {
            if (!outputData) {
              throw new Error('JSONデータが見つかりませんでした');
            }
            const result = JSON.parse(outputData);
            if (result.status === 'success') {
              resolve({
                success: true,
                markdown_text: result.markdown_text,
                outputPath
              });
            } else {
              reject(new Error(result.message || 'PDF変換に失敗しました'));
            }
          } catch (error) {
            reject(new Error(`JSON解析エラー: ${error.message}`));
          }
        } else {
          reject(new Error(`PDF変換エラー (終了コード: ${code})\n${errorOutput}`));
        }
      });
    });

    return result;
  } catch (error) {
    console.error('Error in PDF to Markdown conversion:', error);
    return {
      success: false,
      error: error.message || 'PDF変換中にエラーが発生しました'
    };
  }
});

ipcMain.handle('convert-markdown-to-csv', async (event, params) => {
  try {
    // デバッグ用のログ出力を追加
    console.log('Raw params:', params);
    
    if (!params.markdownContent) {
      throw new Error('Markdownコンテンツが提供されていません');
    }

    // markdownContentの型チェックと変換
    let markdown = params.markdownContent;
    if (typeof markdown === 'object' && markdown !== null) {
      if (markdown.toString === undefined) {
        console.log('markdownContent object:', markdown);
        throw new Error('Markdownコンテンツをテキストに変換できません');
      }
      markdown = markdown.toString();
    }
    
    if (typeof markdown !== 'string') {
      throw new Error(`Markdownコンテンツの型が不正です: ${typeof markdown}`);
    }

    if (!markdown.trim()) {
      throw new Error('Markdownコンテンツが空です');
    }

    // 変換後のコンテンツをログ出力
    console.log('Processed markdown content:', {
      type: typeof markdown,
      length: markdown.length,
      sample: markdown.substring(0, 100)
    });
    
    const scriptPath = path.join(__dirname, '..', 'python', 'api.py');
    
    // 出力ディレクトリの設定
    const settings = loadSettings();
    const outputDir = params.outputDir || settings.defaultOutputDir || app.getPath('temp');
    
    // 一時的なMarkdownファイルを作成
    const markdownPath = path.join(outputDir, `converted_${Date.now()}.md`);
    await fs.promises.writeFile(markdownPath, markdown, 'utf8');

    console.log('Temporary markdown file created:', markdownPath);

    const result = await new Promise((resolve, reject) => {
      const pythonPath = isDev ? 'python' : path.join(process.resourcesPath, 'python');
      const env = {
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

      console.log('Starting Markdown to CSV conversion with:', {
        scriptPath,
        markdownPath,
        outputDir
      });

      const pythonProcess = spawn(pythonPath, [
        scriptPath,
        '--mode', 'markdown-to-csv',
        '--input', markdownPath,
        '--output-dir', outputDir
      ], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });

      let outputData = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString('utf8');
        console.log('Python stdout:', output);
        if (output.includes('{"status":')) {
          outputData = output.substring(output.indexOf('{'), output.lastIndexOf('}') + 1);
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString('utf8');
        console.error('Python stderr:', error);
        errorOutput += error;
      });

      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error(`Python実行エラー: ${error.message}`));
      });

      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        if (code === 0) {
          try {
            if (!outputData) {
              throw new Error('JSONデータが見つかりませんでした');
            }
            const result = JSON.parse(outputData);
            if (result.status === 'success') {
              resolve({
                success: true,
                csvPaths: result.output_files,
                outputDir
              });
            } else {
              reject(new Error(result.message || 'CSV変換に失敗しました'));
            }
          } catch (error) {
            reject(new Error(`JSON解析エラー: ${error.message}`));
          }
        } else {
          reject(new Error(`CSV変換エラー (終了コード: ${code})\n${errorOutput}`));
        }
      });
    });

    // 一時的なMarkdownファイルを削除
    await fs.promises.unlink(markdownPath).catch(console.error);

    return {
      ...result,
      message: `CSVファイルが ${outputDir} に保存されました`
    };
  } catch (error) {
    console.error('Error in Markdown to CSV conversion:', error);
    return {
      success: false,
      error: error.message || 'CSV変換中にエラーが発生しました'
    };
  }
});

ipcMain.handle('dialog:openPDFFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] }
    ]
  });
  if (canceled) {
    return null;
  } else {
    return filePaths[0];
  }
});

ipcMain.handle('save-api-key', async (event, key) => {
  try {
    // APIキーを設定ファイルと環境変数の両方に保存
    const settings = loadSettings();
    settings.apiKey = key;
    const result = saveSettings(settings);
    
    if (result) {
      process.env.ANTHROPIC_API_KEY = key;
      return { success: true };
    } else {
      throw new Error('APIキーの保存に失敗しました');
    }
  } catch (error) {
    console.error('Error saving API key:', error);
    return { success: false, error: error.message };
  }
});

// ファイル選択のハンドラーを追加
ipcMain.handle('dialog:selectFile', async (event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    properties: ['openFile'],
    filters: options?.filters || [],
    title: options?.title || '選択',
  });
  if (canceled) {
    return null;
  }
  return filePaths[0];
});

// 設定の保存時にコンソールログを追加
ipcMain.handle('settings:save', async (event, settings) => {
  console.log('Saving settings:', settings);
  const result = saveSettings(settings);
  console.log('Save result:', result);
  return result;
});

// 設定の読み込み時にコンソールログを追加
ipcMain.handle('settings:get', async () => {
  const settings = loadSettings();
  console.log('Loaded settings:', settings);
  return settings;
});

ipcMain.handle('dialog:selectDirectory', async (event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
    properties: ['openDirectory'],
    title: options?.title || '選択',
  });
  if (canceled) {
    return null;
  }
  return filePaths[0];
});

// ファイル移動のハンドラーを追加
ipcMain.handle('file:move', async (event, params) => {
  try {
    const { sourcePath, destinationDir } = params;
    
    // 出力ディレクトリが存在しない場合は作成
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    const fileName = path.basename(sourcePath);
    const destinationPath = path.join(destinationDir, fileName);

    // ファイルを移動
    fs.renameSync(sourcePath, destinationPath);

    return { success: true };
  } catch (error) {
    console.error('ファイル移動エラー:', error);
    return { success: false, error: error.message };
  }
});