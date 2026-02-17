/**
 * Window management
 * Handles creation and configuration of BrowserWindow instances
 */

import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import { WINDOW_DEFAULT_WIDTH, WINDOW_DEFAULT_HEIGHT, WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT, ENV_VARS } from './constants';
import { resolveServerAddr } from './server';

/**
 * Create the main application window
 */
export function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  loadWindowContent(window);

  return window;
}

/**
 * Load the appropriate content based on whether app is packaged
 */
function loadWindowContent(window: BrowserWindow): void {
  if (app.isPackaged) {
    const appPath = app.getAppPath();
    window.loadFile(path.join(appPath, 'renderer', 'dist', 'index.html'));
  } else {
    window.loadURL('http://localhost:4321');
  }
}

/**
 * Handle the serve-web subcommand
 * Shows the server URL and exits
 */
export async function handleServeWeb(): Promise<void> {
  const addr = resolveServerAddr();
  const url = `http://${addr}/`;

  // Prefer console output for headless invocation
  console.log(`Omit web UI available at ${url}`);

  // Also show a dialog when run interactively
  try {
    await dialog.showMessageBox({
      type: 'info',
      title: 'Omit (serve-web)',
      message: `Omit web UI available at ${url}`
    });
  } catch {
    // ignore
  }

  app.quit();
}

/**
 * Show an error and quit
 */
export function showErrorAndQuit(title: string, message: string): void {
  dialog.showErrorBox(title, message);
  app.quit();
}