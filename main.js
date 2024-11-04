const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

console.log('App starting...');  // Debug point 1

function createWindow() {
  console.log('Creating window...'); // Debug point 2
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
      webgl: true,
      // Enable WebAssembly
      webassembly: true
    }
  })

  // Open DevTools in dev mode
  if (process.argv.includes('--debug')) {
    win.webContents.openDevTools()
  }

  // Set CSP header
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src blob:"
        ]
      }
    })
  })

  // Load local HTML file
  win.loadFile(path.join(__dirname, 'src', 'index.html'))
}

// Handle camera permissions
ipcMain.handle('get-camera-permissions', async () => {
  const { systemPreferences } = require('electron')
  if (systemPreferences.getMediaAccessStatus('camera') !== 'granted') {
    await systemPreferences.askForMediaAccess('camera')
  }
  return true
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})