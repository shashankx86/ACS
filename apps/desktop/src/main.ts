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

/* CLI parsing and helpers -------------------------------------------------
   Adds a lightweight command-line interface for the desktop binary so it
   supports the common flags used by editor CLIs (help, version, locale, log,
   disable-gpu, etc.). This is intentionally implementation-light — flags set
   environment variables and call Electron APIs where appropriate; the
   renderer/server can read the environment variables if they need to.
-------------------------------------------------------------------------*/
function printUsage(): void {
  // Mirrors the usage text you provided (keeps it concise and familiar).
  console.log(`Omit IDE ${app.getVersion()}

Usage: omit [options] [paths...]

Options
  --locale <locale>                          The locale to use (e.g. en-US or zh-TW).
  -h, --help                                 Print usage.

Troubleshooting
  -v, --version                              Print version.
  --verbose                                  Print verbose output (sets log level to debug if not
                                             already set).
  --log <level>                              Log level to use. Default is 'info'. Allowed values
                                             are 'critical', 'error', 'warn', 'info', 'debug',
                                             'trace', 'off'.
  -s, --status                               Print process usage and diagnostics information.
  --disable-gpu                              Disable GPU hardware acceleration.
  --disable-chromium-sandbox                 Use this option only when there is requirement to
                                             launch the application as a sudo/elevated user.

Subcommands
  serve-web    Run a server that displays the editor UI in browsers.

Environment variables
  OMT_SERVER_ADDR        Server address (default: 127.0.0.1:8080)
  OMT_SERVER_BIN         Path to server binary
  OMT_SERVER_BUILD       Server build folder (default: release)
  OMT_TERMINAL_AUTH_TOKEN  Terminal auth token (auto-generated)
  LOG_LEVEL              Log level for server (default: info)
  OMT_LOCALE             Locale override for the app
`);
}

function printVersion(): void {
  console.log(`Omit IDE ${app.getVersion()}`);
}

function printStatus(): void {
  const safeEnv = {
    OMT_SERVER_ADDR: process.env.OMT_SERVER_ADDR ?? '(default 127.0.0.1:8080)',
    OMT_SERVER_BIN: !!process.env.OMT_SERVER_BIN,
    OMT_SERVER_BUILD: process.env.OMT_SERVER_BUILD ?? 'release',
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    OMT_LOCALE: process.env.OMT_LOCALE ?? null,
    OMT_TERMINAL_AUTH_TOKEN_SET: !!process.env.OMT_TERMINAL_AUTH_TOKEN
  };

  const status = {
    pid: process.pid,
    platform: process.platform,
    arch: process.arch,
    versions: process.versions,
    memoryUsage: process.memoryUsage(),
    uptimeSeconds: Math.floor(process.uptime()),
    env: safeEnv
  };

  console.log(JSON.stringify(status, null, 2));
}

// Very small argv parser for the supported flags.
const argv = process.argv.slice(2);
const openPaths: string[] = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  switch (a) {
    case '-h':
    case '--help':
      printUsage();
      process.exit(0);
      break;
    case '-v':
    case '--version':
      printVersion();
      process.exit(0);
      break;
    case '--verbose':
      process.env.OMT_VERBOSE = '1';
      if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = 'debug';
      break;
    case '--log': {
      const next = argv[++i];
      if (!next) {
        console.error('--log requires a level (eg. info, debug)');
        process.exit(1);
      }
      process.env.LOG_LEVEL = next;
      break;
    }
    case '-s':
    case '--status':
      printStatus();
      process.exit(0);
      break;
    case '--disable-gpu':
      // Must be called before app ready.
      try {
        app.disableHardwareAcceleration();
      } catch (err) {
        // ignore — best-effort
      }
      break;
    case '--disable-chromium-sandbox':
      // Best-effort to disable Chromium sandbox for elevated runs.
      try {
        app.commandLine.appendSwitch('no-sandbox');
        process.env.ELECTRON_NO_SANDBOX = '1';
      } catch (err) {
        // ignore
      }
      break;
    case '--locale': {
      const next = argv[++i];
      if (!next) {
        console.error('--locale requires a locale value (eg. en-US)');
        process.exit(1);
      }
      process.env.OMT_LOCALE = next;
      try {
        app.commandLine.appendSwitch('lang', next);
      } catch (err) {
        // ignore
      }
      break;
    }
    case 'serve-web':
      // Mark that the serve-web subcommand was requested. Implementation can
      // be added later if/when required.
      process.env.OMT_SERVE_WEB = '1';
      break;
    default:
      if (a.startsWith('-')) {
        console.warn(`Unknown option: ${a}`);
      } else {
        openPaths.push(a);
      }
  }
}

if (openPaths.length > 0) {
  // Make paths available to other parts of the app (stringified for safety).
  process.env.OMT_OPEN_PATHS = JSON.stringify(openPaths);
}


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
  clipboardWriteText: 'omt:clipboard:write-text',
  dialogOpenFile: 'omt:dialog:open-file',
  dialogOpenFolder: 'omt:dialog:open-folder',
  dialogSaveFile: 'omt:dialog:save-file'
} as const;

function registerWindowControlsIpc(): void {
  ipcMain.removeHandler(WINDOW_CHANNELS.minimize);
  ipcMain.removeHandler(WINDOW_CHANNELS.toggleMaximize);
  ipcMain.removeHandler(WINDOW_CHANNELS.close);
  ipcMain.removeHandler(WINDOW_CHANNELS.serverAddr);
  ipcMain.removeHandler(WINDOW_CHANNELS.terminalAuthToken);
  ipcMain.removeHandler(WINDOW_CHANNELS.clipboardReadText);
  ipcMain.removeHandler(WINDOW_CHANNELS.clipboardWriteText);
  ipcMain.removeHandler(WINDOW_CHANNELS.dialogOpenFile);
  ipcMain.removeHandler(WINDOW_CHANNELS.dialogOpenFolder);
  ipcMain.removeHandler(WINDOW_CHANNELS.dialogSaveFile);

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

  ipcMain.handle(WINDOW_CHANNELS.dialogOpenFile, async (event, defaultPath: unknown) => {
    const target = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = await dialog.showOpenDialog(target, {
      properties: ['openFile'],
      defaultPath: typeof defaultPath === 'string' && defaultPath.trim().length > 0 ? defaultPath : undefined
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle(WINDOW_CHANNELS.dialogOpenFolder, async (event, defaultPath: unknown) => {
    const target = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = await dialog.showOpenDialog(target, {
      properties: ['openDirectory'],
      defaultPath: typeof defaultPath === 'string' && defaultPath.trim().length > 0 ? defaultPath : undefined
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle(WINDOW_CHANNELS.dialogSaveFile, async (event, defaultPath: unknown) => {
    const target = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = await dialog.showSaveDialog(target, {
      defaultPath: typeof defaultPath === 'string' && defaultPath.trim().length > 0 ? defaultPath : undefined
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return result.filePath;
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

    // If the user passed the serve-web subcommand, the server will serve the
    // renderer UI; print the address and exit the Electron wrapper (the
    // server runs as a detached background process).
    if (process.env.OMT_SERVE_WEB) {
      const addr = resolveServerAddr();
      const url = `http://${addr}/`;
      // Prefer console output for headless invocation, but also show a dialog
      // when run interactively so users notice the URL.
      console.log(`Omit web UI available at ${url}`);
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
      return;
    }

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
