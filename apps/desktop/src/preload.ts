import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('omt', {
  window: {
    minimize: () => ipcRenderer.invoke('omt:window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('omt:window:toggle-maximize'),
    close: () => ipcRenderer.invoke('omt:window:close')
  },
  server: {
    getAddr: () => ipcRenderer.invoke('omt:server:get-addr'),
    getTerminalAuthToken: () => ipcRenderer.invoke('omt:terminal:get-auth-token')
  },
  clipboard: {
    readText: () => ipcRenderer.invoke('omt:clipboard:read-text'),
    writeText: (text: string) => ipcRenderer.invoke('omt:clipboard:write-text', text)
  },
  dialog: {
    openFile: (defaultPath?: string) => ipcRenderer.invoke('omt:dialog:open-file', defaultPath),
    openFolder: (defaultPath?: string) => ipcRenderer.invoke('omt:dialog:open-folder', defaultPath),
    saveFile: (defaultPath?: string) => ipcRenderer.invoke('omt:dialog:save-file', defaultPath)
  },
  // expose CLI-provided values (if any)
  app: {
    getOpenPaths: () => {
      try {
        return JSON.parse(process.env.OMT_OPEN_PATHS || '[]');
      } catch {
        return [];
      }
    },
    getLocale: () => process.env.OMT_LOCALE || undefined
  }
});
