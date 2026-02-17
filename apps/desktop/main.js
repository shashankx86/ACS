"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main/index.ts
var import_electron5 = require("electron");

// src/main/cli.ts
var import_electron = require("electron");

// src/main/constants.ts
var HEALTH_TIMEOUT_MS = 1e3;
var TOTAL_TIMEOUT_MS = 1e4;
var INITIAL_DELAY_MS = 100;
var MAX_DELAY_MS = 1e3;
var TERMINAL_TOKEN_FILE = "terminal-auth-token";
var WINDOW_DEFAULT_WIDTH = 1280;
var WINDOW_DEFAULT_HEIGHT = 840;
var WINDOW_MIN_WIDTH = 1100;
var WINDOW_MIN_HEIGHT = 700;
var IPC_CHANNELS = {
  // Window controls
  windowMinimize: "omt:window:minimize",
  windowToggleMaximize: "omt:window:toggle-maximize",
  windowClose: "omt:window:close",
  // Server info
  serverAddr: "omt:server:get-addr",
  terminalAuthToken: "omt:terminal:get-auth-token",
  // Clipboard
  clipboardReadText: "omt:clipboard:read-text",
  clipboardWriteText: "omt:clipboard:write-text",
  // Dialogs
  dialogOpenFile: "omt:dialog:open-file",
  dialogOpenFolder: "omt:dialog:open-folder",
  dialogSaveFile: "omt:dialog:save-file"
};
var ENV_VARS = {
  serverAddr: "OMT_SERVER_ADDR",
  serverBin: "OMT_SERVER_BIN",
  serverBuild: "OMT_SERVER_BUILD",
  terminalAuthToken: "OMT_TERMINAL_AUTH_TOKEN",
  logLevel: "LOG_LEVEL",
  locale: "OMT_LOCALE",
  verbose: "OMT_VERBOSE",
  serveWeb: "OMT_SERVE_WEB",
  openPaths: "OMT_OPEN_PATHS",
  devAssumeServer: "OMT_DEV_ASSUME_SERVER"
};
var DEFAULTS = {
  serverAddr: "127.0.0.1:8080",
  serverBuild: "release",
  logLevel: "info"
};

// src/main/cli.ts
var ELECTRON_SWITCHES = /* @__PURE__ */ new Set([
  // Electron flags
  "--auth-server-whitelist",
  "--auth-negotiate-delegate-whitelist",
  "--disable-ntlm-v2",
  "--disable-http-cache",
  "--disable-http2",
  "--disable-geolocation",
  "--disable-renderer-backgrounding",
  "--disk-cache-size",
  "--enable-logging",
  "--force-fieldtrials",
  "--host-rules",
  "--host-resolver-rules",
  "--ignore-certificate-errors",
  "--ignore-connections-limit",
  "--js-flags",
  "--lang",
  "--log-file",
  "--log-net-log",
  "--log-level",
  "--no-proxy-server",
  "--no-sandbox",
  "--no-stdio-init",
  "--proxy-bypass-list",
  "--proxy-pac-url",
  "--proxy-server",
  "--remote-debugging-port",
  "--v",
  "--vmodule",
  "--force_high_performance_gpu",
  "--force_low_power_gpu",
  "--xdg-portal-required-version",
  // Node.js flags supported by Electron
  "--inspect-brk",
  "--inspect-brk-node",
  "--inspect-port",
  "--inspect",
  "--inspect-publish-uid",
  "--experimental-network-inspection",
  "--no-deprecation",
  "--throw-deprecation",
  "--trace-deprecation",
  "--trace-warnings",
  "--dns-result-order",
  "--diagnostic-dir",
  "--no-experimental-global-navigator",
  // Chromium internal flags commonly seen
  "--type",
  "--electron-args",
  "--app-path",
  "--user-data-dir",
  "--app-name",
  "--gpu-preferences",
  "--mojo-platform-channel-handle",
  "--channel",
  "--metrics-client-id",
  "--enable-crash-reporter",
  "--crash-dumps-dir",
  "--disable-gpu-sandbox",
  "--disable-seccomp-filter-sandbox",
  "--disable-setuid-sandbox",
  "--disable-sandbox",
  "--no-zygote",
  "--disable-features",
  "--enable-features",
  "--flag-switches-begin",
  "--flag-switches-end",
  "--ozone-platform",
  "--original-process-start-time",
  "--renderer-client-id",
  "--lang"
]);
function isElectronSwitch(arg) {
  const switchName = arg.split("=")[0];
  return ELECTRON_SWITCHES.has(switchName);
}
function extractUserArgs() {
  const rawArgs = process.argv.slice(2);
  const userArgs = [];
  let i = 0;
  while (i < rawArgs.length) {
    const arg = rawArgs[i];
    if (isElectronSwitch(arg)) {
      i++;
      if (i < rawArgs.length && !rawArgs[i].startsWith("-") && !arg.includes("=")) {
        const switchName = arg.split("=")[0];
        if (ELECTRON_SWITCHES.has(switchName)) {
          i++;
        }
      }
      continue;
    }
    userArgs.push(arg);
    i++;
  }
  return userArgs;
}
function printUsage() {
  console.log(`Omit IDE ${import_electron.app.getVersion()}

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
function printVersion() {
  console.log(`Omit IDE ${import_electron.app.getVersion()}`);
}
function printStatus() {
  const safeEnv = {
    OMT_SERVER_ADDR: process.env[ENV_VARS.serverAddr] ?? `(default ${DEFAULTS.serverAddr})`,
    OMT_SERVER_BIN: !!process.env[ENV_VARS.serverBin],
    OMT_SERVER_BUILD: process.env[ENV_VARS.serverBuild] ?? DEFAULTS.serverBuild,
    LOG_LEVEL: process.env[ENV_VARS.logLevel] ?? DEFAULTS.logLevel,
    OMT_LOCALE: process.env[ENV_VARS.locale] ?? null,
    OMT_TERMINAL_AUTH_TOKEN_SET: !!process.env[ENV_VARS.terminalAuthToken]
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
function parseArgs() {
  const argv = extractUserArgs();
  const openPaths = [];
  let serveWeb = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        printUsage();
        process.exit(0);
        break;
      case "-v":
      case "--version":
        printVersion();
        process.exit(0);
        break;
      case "--verbose":
        process.env[ENV_VARS.verbose] = "1";
        if (!process.env[ENV_VARS.logLevel]) {
          process.env[ENV_VARS.logLevel] = "debug";
        }
        break;
      case "--log": {
        const next = argv[++i];
        if (!next) {
          console.error("--log requires a level (eg. info, debug)");
          process.exit(1);
        }
        process.env[ENV_VARS.logLevel] = next;
        break;
      }
      case "-s":
      case "--status":
        printStatus();
        process.exit(0);
        break;
      case "--disable-gpu":
        try {
          import_electron.app.disableHardwareAcceleration();
        } catch {
        }
        break;
      case "--disable-chromium-sandbox":
        try {
          import_electron.app.commandLine.appendSwitch("no-sandbox");
          process.env.ELECTRON_NO_SANDBOX = "1";
        } catch {
        }
        break;
      case "--locale": {
        const next = argv[++i];
        if (!next) {
          console.error("--locale requires a locale value (eg. en-US)");
          process.exit(1);
        }
        process.env[ENV_VARS.locale] = next;
        try {
          import_electron.app.commandLine.appendSwitch("lang", next);
        } catch {
        }
        break;
      }
      case "serve-web":
        serveWeb = true;
        break;
      default:
        if (arg.startsWith("-")) {
          console.warn(`Unknown option: ${arg}`);
        } else {
          openPaths.push(arg);
        }
    }
  }
  if (openPaths.length > 0) {
    process.env[ENV_VARS.openPaths] = JSON.stringify(openPaths);
  }
  if (serveWeb) {
    process.env[ENV_VARS.serveWeb] = "1";
  }
  return { openPaths, serveWeb };
}

// src/main/server.ts
var import_electron2 = require("electron");
var import_node_child_process = require("child_process");
var import_node_crypto = require("crypto");
var import_node_fs = __toESM(require("fs"));
var import_node_path = __toESM(require("path"));
var state = {
  serverProcess: null,
  terminalAuthToken: null
};
function resolveServerAddr() {
  const raw = process.env[ENV_VARS.serverAddr] ?? DEFAULTS.serverAddr;
  const trimmed = raw.trim();
  const withoutScheme = trimmed.replace(/^(https?:\/\/|wss?:\/\/)/, "");
  return withoutScheme.replace(/\/+$/, "");
}
function resolveTerminalAuthToken() {
  if (state.terminalAuthToken) {
    return state.terminalAuthToken;
  }
  const envToken = process.env[ENV_VARS.terminalAuthToken]?.trim();
  if (envToken) {
    state.terminalAuthToken = envToken;
    return state.terminalAuthToken;
  }
  const tokenPath = import_node_path.default.join(import_electron2.app.getPath("userData"), TERMINAL_TOKEN_FILE);
  try {
    const saved = import_node_fs.default.readFileSync(tokenPath, "utf8").trim();
    if (saved.length > 0) {
      state.terminalAuthToken = saved;
      return state.terminalAuthToken;
    }
  } catch {
  }
  state.terminalAuthToken = (0, import_node_crypto.randomBytes)(32).toString("hex");
  import_node_fs.default.mkdirSync(import_node_path.default.dirname(tokenPath), { recursive: true });
  import_node_fs.default.writeFileSync(tokenPath, state.terminalAuthToken, { mode: 384 });
  return state.terminalAuthToken;
}
async function checkHealth(addr) {
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
async function checkTerminalAuth(addr, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const endpoint = new URL(`http://${addr}/v1/terminals/auth`);
    endpoint.searchParams.set("token", token);
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
async function waitForHealth(addr) {
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
function resolveServerBin() {
  const envBin = process.env[ENV_VARS.serverBin];
  if (envBin) {
    return envBin;
  }
  if (import_electron2.app.isPackaged) {
    return import_node_path.default.join(process.resourcesPath, "server");
  }
  const build = process.env[ENV_VARS.serverBuild] ?? DEFAULTS.serverBuild;
  const appRoot = import_electron2.app.getAppPath();
  return import_node_path.default.resolve(appRoot, "..", "..", "dist", build, "server");
}
async function ensureServerRunning() {
  if (process.env[ENV_VARS.devAssumeServer]) {
    return;
  }
  const addr = resolveServerAddr();
  const token = resolveTerminalAuthToken();
  if (await checkHealth(addr)) {
    if (await checkTerminalAuth(addr, token)) {
      return;
    }
    throw new Error(
      "server is already running but terminal authentication token does not match; stop the existing server or set OMT_TERMINAL_AUTH_TOKEN"
    );
  }
  const serverPath = resolveServerBin();
  if (!import_node_fs.default.existsSync(serverPath)) {
    throw new Error(`server binary not found at ${serverPath}`);
  }
  try {
    import_node_fs.default.chmodSync(serverPath, 493);
  } catch {
  }
  state.serverProcess = (0, import_node_child_process.spawn)(serverPath, [], {
    env: {
      ...process.env,
      OMT_SERVER_ADDR: addr,
      OMT_TERMINAL_AUTH_TOKEN: token
    },
    stdio: "ignore",
    detached: true
  });
  state.serverProcess.unref();
  const healthy = await waitForHealth(addr);
  if (!healthy) {
    killServer();
    throw new Error("server failed health check");
  }
  if (!await checkTerminalAuth(addr, token)) {
    killServer();
    throw new Error("server started but terminal authentication check failed");
  }
}
function killServer() {
  if (state.serverProcess && !state.serverProcess.killed) {
    try {
      state.serverProcess.kill();
    } catch {
    }
  }
  state.serverProcess = null;
}

// src/main/ipc.ts
var import_electron3 = require("electron");
function registerIpcHandlers() {
  import_electron3.ipcMain.removeHandler(IPC_CHANNELS.windowMinimize);
  import_electron3.ipcMain.removeHandler(IPC_CHANNELS.windowToggleMaximize);
  import_electron3.ipcMain.removeHandler(IPC_CHANNELS.windowClose);
  import_electron3.ipcMain.removeHandler(IPC_CHANNELS.serverAddr);
  import_electron3.ipcMain.removeHandler(IPC_CHANNELS.terminalAuthToken);
  import_electron3.ipcMain.removeHandler(IPC_CHANNELS.clipboardReadText);
  import_electron3.ipcMain.removeHandler(IPC_CHANNELS.clipboardWriteText);
  import_electron3.ipcMain.removeHandler(IPC_CHANNELS.dialogOpenFile);
  import_electron3.ipcMain.removeHandler(IPC_CHANNELS.dialogOpenFolder);
  import_electron3.ipcMain.removeHandler(IPC_CHANNELS.dialogSaveFile);
  registerWindowHandlers();
  registerServerHandlers();
  registerClipboardHandlers();
  registerDialogHandlers();
}
function getWindowFromEvent(event) {
  return import_electron3.BrowserWindow.fromWebContents(event.sender);
}
function registerWindowHandlers() {
  import_electron3.ipcMain.handle(IPC_CHANNELS.windowMinimize, (event) => {
    const window = getWindowFromEvent(event);
    window?.minimize();
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, (event) => {
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
  import_electron3.ipcMain.handle(IPC_CHANNELS.windowClose, (event) => {
    const window = getWindowFromEvent(event);
    window?.close();
  });
}
function registerServerHandlers() {
  import_electron3.ipcMain.handle(IPC_CHANNELS.serverAddr, () => resolveServerAddr());
  import_electron3.ipcMain.handle(IPC_CHANNELS.terminalAuthToken, () => resolveTerminalAuthToken());
}
function registerClipboardHandlers() {
  import_electron3.ipcMain.handle(IPC_CHANNELS.clipboardReadText, () => import_electron3.clipboard.readText());
  import_electron3.ipcMain.handle(IPC_CHANNELS.clipboardWriteText, (_event, text) => {
    if (typeof text !== "string") {
      return;
    }
    import_electron3.clipboard.writeText(text);
  });
}
function registerDialogHandlers() {
  import_electron3.ipcMain.handle(
    IPC_CHANNELS.dialogOpenFile,
    async (event, defaultPath) => {
      const window = getWindowFromEvent(event);
      const options = {
        properties: ["openFile"],
        defaultPath: typeof defaultPath === "string" && defaultPath.trim().length > 0 ? defaultPath : void 0
      };
      const result = window ? await import_electron3.dialog.showOpenDialog(window, options) : await import_electron3.dialog.showOpenDialog(options);
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    }
  );
  import_electron3.ipcMain.handle(
    IPC_CHANNELS.dialogOpenFolder,
    async (event, defaultPath) => {
      const window = getWindowFromEvent(event);
      const options = {
        properties: ["openDirectory"],
        defaultPath: typeof defaultPath === "string" && defaultPath.trim().length > 0 ? defaultPath : void 0
      };
      const result = window ? await import_electron3.dialog.showOpenDialog(window, options) : await import_electron3.dialog.showOpenDialog(options);
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    }
  );
  import_electron3.ipcMain.handle(
    IPC_CHANNELS.dialogSaveFile,
    async (event, defaultPath) => {
      const window = getWindowFromEvent(event);
      const options = {
        defaultPath: typeof defaultPath === "string" && defaultPath.trim().length > 0 ? defaultPath : void 0
      };
      const result = window ? await import_electron3.dialog.showSaveDialog(window, options) : await import_electron3.dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) {
        return null;
      }
      return result.filePath;
    }
  );
}

// src/main/window.ts
var import_electron4 = require("electron");
var import_node_path2 = __toESM(require("path"));
function createWindow() {
  const window = new import_electron4.BrowserWindow({
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    frame: false,
    titleBarStyle: "hidden",
    transparent: true,
    backgroundColor: "#00000000",
    roundedCorners: true,
    webPreferences: {
      contextIsolation: true,
      preload: import_node_path2.default.join(__dirname, "preload.js")
    }
  });
  loadWindowContent(window);
  return window;
}
function loadWindowContent(window) {
  if (import_electron4.app.isPackaged) {
    const appPath = import_electron4.app.getAppPath();
    window.loadFile(import_node_path2.default.join(appPath, "renderer", "dist", "index.html"));
  } else {
    window.loadURL("http://localhost:4321");
  }
}
async function handleServeWeb() {
  const addr = resolveServerAddr();
  const url = `http://${addr}/`;
  console.log(`Omit web UI available at ${url}`);
  try {
    await import_electron4.dialog.showMessageBox({
      type: "info",
      title: "Omit (serve-web)",
      message: `Omit web UI available at ${url}`
    });
  } catch {
  }
  import_electron4.app.quit();
}
function showErrorAndQuit(title, message) {
  import_electron4.dialog.showErrorBox(title, message);
  import_electron4.app.quit();
}
function focusWindow(window) {
  if (window.isMinimized()) {
    window.restore();
  }
  window.focus();
}

// src/main/index.ts
var mainWindow = null;
var gotTheLock = import_electron5.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron5.app.quit();
} else {
  import_electron5.app.on("second-instance", (_event, _commandLine, _workingDirectory) => {
    const userArgs = extractUserArgs();
    for (const arg of userArgs) {
      if (arg === "-h" || arg === "--help") {
        console.log(`Omit IDE ${import_electron5.app.getVersion()}

Usage: omit [options] [paths...]

Options
  --locale <locale>                          The locale to use (e.g. en-US or zh-TW).
  -h, --help                                 Print usage.

Troubleshooting
  -v, --version                              Print version.
  --verbose                                  Print verbose output.
  --log <level>                              Log level to use.
  -s, --status                               Print process usage and diagnostics.
  --disable-gpu                              Disable GPU hardware acceleration.
  --disable-chromium-sandbox                 Disable sandbox for elevated users.

Subcommands
  serve-web    Run a server that displays the editor UI in browsers.
`);
        process.exit(0);
      }
      if (arg === "-v" || arg === "--version") {
        console.log(`Omit IDE ${import_electron5.app.getVersion()}`);
        process.exit(0);
      }
    }
    if (mainWindow) {
      focusWindow(mainWindow);
    }
    const pathsToOpen = userArgs.filter((arg) => !arg.startsWith("-"));
    if (pathsToOpen.length > 0) {
      process.env[ENV_VARS.openPaths] = JSON.stringify(pathsToOpen);
    }
  });
  const { serveWeb } = parseArgs();
  import_electron5.app.whenReady().then(async () => {
    try {
      await ensureServerRunning();
      if (serveWeb) {
        await handleServeWeb();
        return;
      }
      registerIpcHandlers();
      mainWindow = createWindow();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showErrorAndQuit("Omit", message);
    }
  });
  import_electron5.app.on("before-quit", () => {
    killServer();
  });
  import_electron5.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      import_electron5.app.quit();
    }
  });
  import_electron5.app.on("activate", () => {
    if (import_electron5.BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
}
//# sourceMappingURL=main.js.map