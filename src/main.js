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
  // TODO: 音声処理の実装
  return { success: true };
});

ipcMain.handle('convert-pdf', async (event, params) => {
  // TODO: PDF変換の実装
  return { success: true };
});

ipcMain.handle('convert-pdf-to-markdown', async (event, { pdfPath }) => {
  try {
    console.log('Converting PDF to Markdown:', pdfPath);
    // TODO: 実際のPDF→Markdown変換処理を実装
    // 現在はテスト用のダミーレスポンス
    return {
      success: true,
      markdown: `# Test Markdown\nPDFファイル: ${pdfPath}\n\nこれはテスト変換です。`
    };
  } catch (error) {
    console.error('Error in PDF to Markdown conversion:', error);
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

ipcMain.handle('convert-markdown-to-csv', async (event, { markdownContent }) => {
  try {
    console.log('Converting Markdown to CSV');
    // TODO: 実際のMarkdown→CSV変換処理を実装
    // 現在はテスト用のダミーレスポンス
    return {
      success: true,
      csvPath: '/path/to/output.csv'
    };
  } catch (error) {
    console.error('Error in Markdown to CSV conversion:', error);
    return {
      success: false,
      error: error.message || 'CSV変換中にエラーが発生しました'
    };
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