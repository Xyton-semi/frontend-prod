const { app, BrowserWindow } = require('electron');
const path = require('path');
const serve = require('electron-serve');

// This handles the "TypeError: serve is not a function"
const serveDir = typeof serve === 'function' ? serve : serve.default;
const loadURL = serveDir({ directory: 'out' });

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // This will now work correctly without the TypeError
    loadURL(mainWindow); 
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});