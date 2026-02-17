/**
 * IPC handlers for renderer-main communication
 */

import { BrowserWindow, clipboard, dialog, ipcMain } from 'electron';
import { IPC_CHANNELS } from './constants';
import { resolveServerAddr, resolveTerminalAuthToken } from './server';

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(): void {
  // Remove existing handlers to prevent duplicates
  ipcMain.removeHandler(IPC_CHANNELS.windowMinimize);
  ipcMain.removeHandler(IPC_CHANNELS.windowToggleMaximize);
  ipcMain.removeHandler(IPC_CHANNELS.windowClose);
  ipcMain.removeHandler(IPC_CHANNELS.serverAddr);
  ipcMain.removeHandler(IPC_CHANNELS.terminalAuthToken);
  ipcMain.removeHandler(IPC_CHANNELS.clipboardReadText);
  ipcMain.removeHandler(IPC_CHANNELS.clipboardWriteText);
  ipcMain.removeHandler(IPC_CHANNELS.dialogOpenFile);
  ipcMain.removeHandler(IPC_CHANNELS.dialogOpenFolder);
  ipcMain.removeHandler(IPC_CHANNELS.dialogSaveFile);

  // Window controls
  registerWindowHandlers();
  
  // Server info
  registerServerHandlers();
  
  // Clipboard
  registerClipboardHandlers();
  
  // Dialogs
  registerDialogHandlers();
}

/**
 * Get the BrowserWindow from an IPC event
 */
function getWindowFromEvent(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender);
}

/**
 * Register window control handlers
 */
function registerWindowHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.windowMinimize, (event) => {
    const window = getWindowFromEvent(event);
    window?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, (event) => {
    const window = getWindowFromEvent(event);
    if (!window) {
      return false;
    }

    if (window.isMaximized()) {
      window.unmaximize();
      return false;
    }

    window.maximize();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.windowClose, (event) => {
    const window = getWindowFromEvent(event);
    window?.close();
  });
}

/**
 * Register server info handlers
 */
function registerServerHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.serverAddr, () => resolveServerAddr());
  ipcMain.handle(IPC_CHANNELS.terminalAuthToken, () => resolveTerminalAuthToken());
}

/**
 * Register clipboard handlers
 */
function registerClipboardHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.clipboardReadText, () => clipboard.readText());
  
  ipcMain.handle(IPC_CHANNELS.clipboardWriteText, (_event, text: unknown) => {
    if (typeof text !== 'string') {
      return;
    }
    clipboard.writeText(text);
  });
}

/**
 * Register dialog handlers
 */
function registerDialogHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.dialogOpenFile,
    async (event, defaultPath: unknown) => {
      const window = getWindowFromEvent(event);
      const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        defaultPath:
          typeof defaultPath === 'string' && defaultPath.trim().length > 0
            ? defaultPath
            : undefined,
      };

      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options);

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.dialogOpenFolder,
    async (event, defaultPath: unknown) => {
      const window = getWindowFromEvent(event);
      const options: Electron.OpenDialogOptions = {
        properties: ['openDirectory'],
        defaultPath:
          typeof defaultPath === 'string' && defaultPath.trim().length > 0
            ? defaultPath
            : undefined,
      };

      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options);

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.dialogSaveFile,
    async (event, defaultPath: unknown) => {
      const window = getWindowFromEvent(event);
      const options: Electron.SaveDialogOptions = {
        defaultPath:
          typeof defaultPath === 'string' && defaultPath.trim().length > 0
            ? defaultPath
            : undefined,
      };

      const result = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options);

      if (result.canceled || !result.filePath) {
        return null;
      }

      return result.filePath;
    }
  );
}