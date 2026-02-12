import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('acs', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },
  server: {
    getAddr: () => ipcRenderer.invoke('server:get-addr'),
    getTerminalAuthToken: () => ipcRenderer.invoke('terminal:get-auth-token')
  }
});
