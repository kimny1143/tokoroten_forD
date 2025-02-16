const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { execFile } = require('child_process');
const fs = require('fs');

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
    const pythonExecutable = isDev
      ? (process.platform === 'win32' ? 'python' : 'python3')
      : path.join(process.resourcesPath, 'api', 'api');
    
    const jsonData = JSON.stringify(data);
    
    console.log('Executing Python process with:', {
      executable: pythonExecutable,
      data: jsonData
    });

    if (!isDev) {
      try {
        fs.chmodSync(pythonExecutable, '755');
      } catch (error) {
        console.error('Failed to set executable permissions:', error);
      }
    }
    
    const childProcess = execFile(pythonExecutable, [], {
      env: {
        ...process.env,
        PYTHONPATH: isDev 
          ? process.env.PYTHONPATH 
          : path.join(process.resourcesPath, 'api'),
        DYLD_LIBRARY_PATH: isDev
          ? process.env.DYLD_LIBRARY_PATH
          : path.join(process.resourcesPath, 'api')
      }
    });
    
    childProcess.stdin.write(jsonData + '\n');
    childProcess.stdin.end();
    
    let stdoutData = '';
    let stderrData = '';
    
    childProcess.stdout.on('data', (data) => {
      stdoutData += data;
      console.log('Python stdout:', data);
    });
    
    childProcess.stderr.on('data', (data) => {
      stderrData += data;
      console.error('Python stderr:', data);
    });
    
    childProcess.on('close', (code) => {
      console.log('Python process closed with code:', code);
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error('stderr:', stderrData);
        reject(new Error(`Process exited with code ${code}\n${stderrData}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdoutData);
        resolve(result);
      } catch (parseError) {
        console.error('Failed to parse Python output:', stdoutData);
        reject(parseError);
      }
    });
  });
});