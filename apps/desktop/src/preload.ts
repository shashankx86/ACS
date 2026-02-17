/**
 * Preload script
 * Exposes a type-safe API bridge between renderer and main process
 */

import { contextBridge, ipcRenderer } from 'electron';

// IPC channel names (duplicated to avoid import issues in preload)
const CHANNELS = {
  windowMinimize: 'omt:window:minimize',
  windowToggleMaximize: 'omt:window:toggle-maximize',
  windowClose: 'omt:window:close',
  serverAddr: 'omt:server:get-addr',
  terminalAuthToken: 'omt:terminal:get-auth-token',
  clipboardReadText: 'omt:clipboard:read-text',
  clipboardWriteText: 'omt:clipboard:write-text',
  dialogOpenFile: 'omt:dialog:open-file',
  dialogOpenFolder: 'omt:dialog:open-folder',
  dialogSaveFile: 'omt:dialog:save-file',
} as const;

/**
 * Type definition for the exposed API
 */
export interface OmtApi {
  window: {
    minimize: () => Promise<void>;
    toggleMaximize: () => Promise<boolean>;
    close: () => Promise<void>;
  };
  server: {
    getAddr: () => Promise<string>;
    getTerminalAuthToken: () => Promise<string>;
  };
  clipboard: {
    readText: () => Promise<string>;
    writeText: (text: string) => Promise<void>;
  };
  dialog: {
    openFile: (defaultPath?: string) => Promise<string | null>;
    openFolder: (defaultPath?: string) => Promise<string | null>;
    saveFile: (defaultPath?: string) => Promise<string | null>;
  };
  app: {
    getOpenPaths: () => string[];
    getLocale: () => string | undefined;
  };
}

// Expose API to renderer
contextBridge.exposeInMainWorld('omt', {
  window: {
    minimize: () => ipcRenderer.invoke(CHANNELS.windowMinimize),
    toggleMaximize: () => ipcRenderer.invoke(CHANNELS.windowToggleMaximize),
    close: () => ipcRenderer.invoke(CHANNELS.windowClose),
  },
  server: {
    getAddr: () => ipcRenderer.invoke(CHANNELS.serverAddr),
    getTerminalAuthToken: () => ipcRenderer.invoke(CHANNELS.terminalAuthToken),
  },
  clipboard: {
    readText: () => ipcRenderer.invoke(CHANNELS.clipboardReadText),
    writeText: (text: string) => ipcRenderer.invoke(CHANNELS.clipboardWriteText, text),
  },
  dialog: {
    openFile: (defaultPath?: string) => ipcRenderer.invoke(CHANNELS.dialogOpenFile, defaultPath),
    openFolder: (defaultPath?: string) => ipcRenderer.invoke(CHANNELS.dialogOpenFolder, defaultPath),
    saveFile: (defaultPath?: string) => ipcRenderer.invoke(CHANNELS.dialogSaveFile, defaultPath),
  },
  app: {
    getOpenPaths: () => {
      try {
        return JSON.parse(process.env.OMT_OPEN_PATHS || '[]');
      } catch {
        return [];
      }
    },
    getLocale: () => process.env.OMT_LOCALE || undefined,
  },
} satisfies OmtApi);
