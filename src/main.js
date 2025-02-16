const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { execFile } = require('child_process');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
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

ipcMain.handle('process-audio', async (event, data) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '..', 'python', 'api.py');
    const pythonExecutable = isDev
      ? (process.platform === 'win32' ? 'python' : 'python3')
      : path.join(process.resourcesPath, 'api', 'api');
    
    // JavaScriptのbooleanをPythonの形式に変換
    const pythonData = {
      ...data,
      enableRenameMove: data.enableRenameMove ? 'True' : 'False'
    };
    const jsonData = JSON.stringify(pythonData);
    
    console.log('Executing Python process with:', {
      executable: pythonExecutable,
      script: pythonScript,
      data: jsonData
    });

    if (!isDev) {
      try {
        fs.chmodSync(pythonExecutable, '755');
      } catch (error) {
        console.error('Failed to set executable permissions:', error);
      }
    }
    
    const env = {
      ...process.env,
      PYTHONPATH: isDev 
        ? path.join(__dirname, '..', 'python')
        : path.join(process.resourcesPath, 'api'),
      PYTHONIOENCODING: 'utf-8',
      PYTHONUNBUFFERED: '1'
    };

    const childProcess = spawn(pythonExecutable, [pythonScript], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdoutData = '';
    let stderrData = '';
    
    childProcess.stdout.on('data', (data) => {
      stdoutData += data.toString('utf-8');
      console.log('Python stdout:', data.toString('utf-8'));
    });
    
    childProcess.stderr.on('data', (data) => {
      stderrData += data.toString('utf-8');
      console.error('Python stderr:', data.toString('utf-8'));
    });
    
    childProcess.on('close', (code) => {
      console.log('Python process closed with code:', code);
      console.log('Full stdout:', stdoutData);
      console.log('Full stderr:', stderrData);
      
      try {
        const result = JSON.parse(stdoutData.trim());
        if (result.success === false) {
          // エラーレスポンスの場合
          resolve({
            result: {
              success: false,
              error: result.error,
              input_directory: result.input_directory,
              output_directory: result.output_directory,
              processed_files: result.processed_files || [],
              moved_files: result.moved_files || []
            }
          });
        } else {
          // 成功レスポンスの場合
          resolve({
            result: {
              success: true,
              input_directory: result.input_directory,
              output_directory: result.output_directory,
              processed_files: result.processed_files,
              moved_files: result.moved_files,
              message: result.message
            }
          });
        }
      } catch (parseError) {
        console.error('Failed to parse Python output:', stdoutData);
        reject(new Error(`Failed to parse Python output: ${parseError.message}`));
      }
    });
    
    // JSONデータを送信し、明示的に改行を追加
    childProcess.stdin.write(jsonData + '\n');
    childProcess.stdin.end();
  });
});

ipcMain.handle('convert-pdf-to-markdown', async (event, { pdfPath, apiKey }) => {
    try {
        const scriptPath = path.join(__dirname, '..', 'python', 'pdf_markdown.py');
        const outputPath = path.join(path.dirname(pdfPath), path.basename(pdfPath, '.pdf') + '.md');
        const args = [pdfPath, outputPath];
        
        if (apiKey) {
            process.env.ANTHROPIC_API_KEY = apiKey;
        }
        
        console.log('Starting PDF conversion with:', {
            scriptPath,
            args,
            hasApiKey: !!process.env.ANTHROPIC_API_KEY
        });
        
        const result = await new Promise((resolve, reject) => {
            // Pythonの実行環境を設定
            const pythonPath = isDev ? 'python' : path.join(process.resourcesPath, 'python');
            const env = {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                PYTHONIOENCODING: 'utf-8',
                LANG: 'ja_JP.UTF-8',
                LC_ALL: 'ja_JP.UTF-8',
                LC_CTYPE: 'ja_JP.UTF-8',
                ANTHROPIC_API_KEY: apiKey || process.env.ANTHROPIC_API_KEY
            };
            
            if (isDev) {
                env.PYTHONPATH = path.join(__dirname, '..', 'python');
            }
            
            console.log('Python environment:', {
                pythonPath,
                PYTHONPATH: env.PYTHONPATH,
                scriptPath,
                encoding: env.PYTHONIOENCODING,
                locale: env.LANG,
                hasApiKey: !!env.ANTHROPIC_API_KEY
            });
            
            const pythonProcess = spawn(pythonPath, [scriptPath, ...args], {
                env,
                stdio: ['pipe', 'pipe', 'pipe'],
                windowsHide: true
            });
            
            let allOutput = '';
            let markdownContent = null;
            
            pythonProcess.stdout.on('data', (data) => {
                const output = data.toString('utf8');
                allOutput += output;
                console.log('Python stdout:', output);
                
                if (output.includes('===MARKDOWN_START===')) {
                    markdownContent = '';
                } else if (output.includes('===MARKDOWN_END===')) {
                    markdownContent = markdownContent.replace('===MARKDOWN_END===', '').trim();
                } else if (markdownContent !== null) {
                    markdownContent += output;
                }
            });
            
            pythonProcess.stderr.on('data', (data) => {
                const error = data.toString('utf8');
                console.error('Python stderr:', error);
                allOutput += `[ERROR] ${error}\n`;
            });
            
            pythonProcess.on('error', (error) => {
                console.error('Failed to start Python process:', error);
                reject(new Error(`Python process failed to start: ${error.message}`));
            });
            
            pythonProcess.on('close', (code) => {
                console.log(`Python process exited with code ${code}`);
                console.log('All output:', allOutput);
                
                if (code === 0 && markdownContent) {
                    resolve({ success: true, markdown: markdownContent });
                } else {
                    reject(new Error('Markdownの生成に失敗しました。\n\n' + allOutput));
                }
            });
        });
        
        return result;
    } catch (error) {
        console.error('Error in PDF conversion:', error);
        return {
            success: false,
            error: error.message || 'PDF変換中にエラーが発生しました'
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
    // APIキーを環境変数に設定
    process.env.ANTHROPIC_API_KEY = key;
    return { success: true };
  } catch (error) {
    console.error('Error saving API key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('convert-markdown-to-csv', async (event, { markdownPath }) => {
    try {
        const scriptPath = path.join(__dirname, '..', 'python', 'markdown_csv.py');
        const outputPath = path.join(path.dirname(markdownPath), path.basename(markdownPath, '.md') + '.csv');
        const args = [markdownPath, outputPath];
        
        console.log('Starting CSV conversion with:', {
            scriptPath,
            args
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
            
            const pythonProcess = spawn(pythonPath, [scriptPath, ...args], {
                env,
                stdio: ['pipe', 'pipe', 'pipe'],
                windowsHide: true
            });
            
            let allOutput = '';
            
            pythonProcess.stdout.on('data', (data) => {
                const output = data.toString('utf8');
                allOutput += output;
                console.log('Python stdout:', output);
            });
            
            pythonProcess.stderr.on('data', (data) => {
                const error = data.toString('utf8');
                console.error('Python stderr:', error);
                allOutput += `[ERROR] ${error}\n`;
            });
            
            pythonProcess.on('error', (error) => {
                console.error('Failed to start Python process:', error);
                reject(new Error(`Python process failed to start: ${error.message}`));
            });
            
            pythonProcess.on('close', (code) => {
                console.log(`Python process exited with code ${code}`);
                console.log('All output:', allOutput);
                
                if (code === 0) {
                    resolve({ 
                        success: true, 
                        csvPath: outputPath,
                        output: allOutput 
                    });
                } else {
                    reject(new Error('CSVの生成に失敗しました。\n\n' + allOutput));
                }
            });
        });
        
        return result;
    } catch (error) {
        console.error('Error in CSV conversion:', error);
        return {
            success: false,
            error: error.message || 'CSV変換中にエラーが発生しました'
        };
    }
});