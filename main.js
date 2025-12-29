const { app, BrowserWindow } = require('electron');
const serve = require('electron-serve');

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
    mainWindow.webContents.openDevTools();
  } else {
    loadURL(mainWindow)
      .then(() => console.log('App loaded'))
      .catch((err) => console.error('Load error:', err));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
