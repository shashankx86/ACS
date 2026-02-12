import { app, BrowserWindow, clipboard, dialog, ipcMain } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const HEALTH_TIMEOUT_MS = 1000;
const TOTAL_TIMEOUT_MS = 10_000;
const INITIAL_DELAY_MS = 100;
const MAX_DELAY_MS = 1000;
const TERMINAL_TOKEN_FILE = 'terminal-auth-token';

let serverProcess: ChildProcess | null = null;
let terminalAuthToken: string | null = null;

function resolveServerAddr(): string {
  const raw = process.env.OMT_SERVER_ADDR ?? '127.0.0.1:8080';
  const trimmed = raw.trim();
  const withoutScheme = trimmed.replace(/^(https?:\/\/|wss?:\/\/)/, '');
  return withoutScheme.replace(/\/+$/, '');
}

function resolveTerminalAuthToken(): string {
  if (terminalAuthToken) {
    return terminalAuthToken;
  }

  const envToken = process.env.OMT_TERMINAL_AUTH_TOKEN?.trim();
  if (envToken) {
    terminalAuthToken = envToken;
    return terminalAuthToken;
  }

  const tokenPath = path.join(app.getPath('userData'), TERMINAL_TOKEN_FILE);
  try {
    const saved = fs.readFileSync(tokenPath, 'utf8').trim();
    if (saved.length > 0) {
      terminalAuthToken = saved;
      return terminalAuthToken;
    }
  } catch {
    // token file does not exist yet
  }

  terminalAuthToken = randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, terminalAuthToken, { mode: 0o600 });
  return terminalAuthToken;
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

async function checkTerminalAuth(addr: string, token: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const endpoint = new URL(`http://${addr}/v1/terminals/auth`);
    endpoint.searchParams.set('token', token);

    const response = await fetch(endpoint.toString(), {
      signal: controller.signal
    });

    return response.status === 204;
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
  if (process.env.OMT_SERVER_BIN) {
    return process.env.OMT_SERVER_BIN;
  }

  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'server');
  }

  const build = process.env.OMT_SERVER_BUILD ?? 'release';
  const appRoot = app.getAppPath();
  return path.resolve(appRoot, '..', '..', 'dist', build, 'server');
}

async function ensureServerRunning(): Promise<void> {
  if (process.env.OMT_DEV_ASSUME_SERVER) {
    return;
  }

  const addr = resolveServerAddr();
  const token = resolveTerminalAuthToken();

  if (await checkHealth(addr)) {
    if (await checkTerminalAuth(addr, token)) {
      return;
    }

    throw new Error(
      'server is already running but terminal authentication token does not match; stop the existing server or set OMT_TERMINAL_AUTH_TOKEN'
    );
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
    env: {
      ...process.env,
      OMT_SERVER_ADDR: addr,
      OMT_TERMINAL_AUTH_TOKEN: token
    },
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

  if (!(await checkTerminalAuth(addr, token))) {
    try {
      serverProcess.kill();
    } catch {
      // ignore
    }
    serverProcess = null;
    throw new Error('server started but terminal authentication check failed');
  }
}

const WINDOW_CHANNELS = {
  minimize: 'omt:window:minimize',
  toggleMaximize: 'omt:window:toggle-maximize',
  close: 'omt:window:close',
  serverAddr: 'omt:server:get-addr',
  terminalAuthToken: 'omt:terminal:get-auth-token',
  clipboardReadText: 'omt:clipboard:read-text',
  clipboardWriteText: 'omt:clipboard:write-text'
} as const;

function registerWindowControlsIpc(): void {
  ipcMain.removeHandler(WINDOW_CHANNELS.minimize);
  ipcMain.removeHandler(WINDOW_CHANNELS.toggleMaximize);
  ipcMain.removeHandler(WINDOW_CHANNELS.close);
  ipcMain.removeHandler(WINDOW_CHANNELS.serverAddr);
  ipcMain.removeHandler(WINDOW_CHANNELS.terminalAuthToken);
  ipcMain.removeHandler(WINDOW_CHANNELS.clipboardReadText);
  ipcMain.removeHandler(WINDOW_CHANNELS.clipboardWriteText);

  ipcMain.handle(WINDOW_CHANNELS.minimize, (event) => {
    const target = BrowserWindow.fromWebContents(event.sender);
    target?.minimize();
  });

  ipcMain.handle(WINDOW_CHANNELS.toggleMaximize, (event) => {
    const target = BrowserWindow.fromWebContents(event.sender);
    if (!target) {
      return false;
    }

    if (target.isMaximized()) {
      target.unmaximize();
      return false;
    }

    target.maximize();
    return true;
  });

  ipcMain.handle(WINDOW_CHANNELS.close, (event) => {
    const target = BrowserWindow.fromWebContents(event.sender);
    target?.close();
  });

  ipcMain.handle(WINDOW_CHANNELS.serverAddr, () => resolveServerAddr());
  ipcMain.handle(WINDOW_CHANNELS.terminalAuthToken, () => resolveTerminalAuthToken());
  ipcMain.handle(WINDOW_CHANNELS.clipboardReadText, () => clipboard.readText());
  ipcMain.handle(WINDOW_CHANNELS.clipboardWriteText, (_event, text: unknown) => {
    if (typeof text !== 'string') {
      return;
    }

    clipboard.writeText(text);
  });
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1100,
    minHeight: 700,
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
    registerWindowControlsIpc();
    createWindow();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Omit', message);
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
