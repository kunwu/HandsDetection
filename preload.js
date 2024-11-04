const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getCameraPermissions: () => ipcRenderer.invoke('get-camera-permissions')
})