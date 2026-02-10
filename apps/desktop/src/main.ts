import { app, BrowserWindow, dialog } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HEALTH_TIMEOUT_MS = 1000;
const TOTAL_TIMEOUT_MS = 10_000;
const INITIAL_DELAY_MS = 100;
const MAX_DELAY_MS = 1000;

let serverProcess: ChildProcess | null = null;

function resolveServerAddr(): string {
  return process.env.RIFF_SERVER_ADDR ?? '127.0.0.1:8080';
}

async function checkHealth(addr: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`http://${addr}/v1/global/health`, {
      signal: controller.signal
    });
    return response.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForHealth(addr: string): Promise<boolean> {
  const start = Date.now();
  let delay = INITIAL_DELAY_MS;
  while (Date.now() - start < TOTAL_TIMEOUT_MS) {
    if (await checkHealth(addr)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, MAX_DELAY_MS);
  }
  return false;
}

function resolveServerBin(): string {
  if (process.env.RIFF_SERVER_BIN) {
    return process.env.RIFF_SERVER_BIN;
  }

  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'server');
  }

  const build = process.env.RIFF_SERVER_BUILD ?? 'release';
  const appRoot = app.getAppPath();
  return path.resolve(appRoot, '..', '..', 'dist', build, 'server');
}

async function ensureServerRunning(): Promise<void> {
  if (process.env.RIFF_DEV_ASSUME_SERVER) {
    return;
  }

  const addr = resolveServerAddr();
  if (await checkHealth(addr)) {
    return;
  }

  const serverPath = resolveServerBin();
  if (!fs.existsSync(serverPath)) {
    throw new Error(`server binary not found at ${serverPath}`);
  }

  try {
    fs.chmodSync(serverPath, 0o755);
  } catch {
    // ignore permission errors
  }

  serverProcess = spawn(serverPath, [], {
    env: { ...process.env, RIFF_SERVER_ADDR: addr },
    stdio: 'ignore',
    detached: true
  });
  serverProcess.unref();

  const healthy = await waitForHealth(addr);
  if (!healthy) {
    try {
      serverProcess.kill();
    } catch {
      // ignore
    }
    serverProcess = null;
    throw new Error('server failed health check');
  }
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (app.isPackaged) {
    const appPath = app.getAppPath();
    window.loadFile(path.join(appPath, 'renderer', 'dist', 'index.html'));
  } else {
    window.loadURL('http://localhost:4321');
  }
}

app.whenReady().then(async () => {
  try {
    await ensureServerRunning();
    createWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Riff Desktop', message);
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill();
    } catch {
      // ignore
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
