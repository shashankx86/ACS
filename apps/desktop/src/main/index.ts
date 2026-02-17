/**
 * Main entry point for the Electron application
 * Orchestrates CLI parsing, server management, and window creation
 */

import { app } from 'electron';
import { parseArgs } from './cli';
import { ensureServerRunning, killServer } from './server';
import { registerIpcHandlers } from './ipc';
import { createWindow, handleServeWeb, showErrorAndQuit } from './window';
import { ENV_VARS } from './constants';

// Parse CLI arguments first (before app is ready)
parseArgs();

// App lifecycle
app.whenReady().then(async () => {
  try {
    await ensureServerRunning();

    // Handle serve-web subcommand if requested
    if (process.env[ENV_VARS.serveWeb]) {
      await handleServeWeb();
      return;
    }

    // Register IPC handlers and create window
    registerIpcHandlers();
    createWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showErrorAndQuit('Omit', message);
  }
});

// Cleanup before quit
app.on('before-quit', () => {
  killServer();
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});