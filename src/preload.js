const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app-version'),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // Menu event listeners
  onMenuNewGame: (callback) => ipcRenderer.on('menu-new-game', callback),
  onMenuPauseToggle: (callback) => ipcRenderer.on('menu-pause-toggle', callback),
  onMenuSettings: (callback) => ipcRenderer.on('menu-settings', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
