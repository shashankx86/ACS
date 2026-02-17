/**
 * Application-wide constants for the main process
 */

// Health check timeouts
export const HEALTH_TIMEOUT_MS = 1000;
export const TOTAL_TIMEOUT_MS = 10_000;
export const INITIAL_DELAY_MS = 100;
export const MAX_DELAY_MS = 1000;

// File paths
export const TERMINAL_TOKEN_FILE = 'terminal-auth-token';

// Window defaults
export const WINDOW_DEFAULT_WIDTH = 1280;
export const WINDOW_DEFAULT_HEIGHT = 840;
export const WINDOW_MIN_WIDTH = 1100;
export const WINDOW_MIN_HEIGHT = 700;

// IPC channel names
export const IPC_CHANNELS = {
  // Window controls
  windowMinimize: 'omt:window:minimize',
  windowToggleMaximize: 'omt:window:toggle-maximize',
  windowClose: 'omt:window:close',
  
  // Server info
  serverAddr: 'omt:server:get-addr',
  terminalAuthToken: 'omt:terminal:get-auth-token',
  
  // Clipboard
  clipboardReadText: 'omt:clipboard:read-text',
  clipboardWriteText: 'omt:clipboard:write-text',
  
  // Dialogs
  dialogOpenFile: 'omt:dialog:open-file',
  dialogOpenFolder: 'omt:dialog:open-folder',
  dialogSaveFile: 'omt:dialog:save-file',
} as const;

// Environment variable names
export const ENV_VARS = {
  serverAddr: 'OMT_SERVER_ADDR',
  serverBin: 'OMT_SERVER_BIN',
  serverBuild: 'OMT_SERVER_BUILD',
  terminalAuthToken: 'OMT_TERMINAL_AUTH_TOKEN',
  logLevel: 'LOG_LEVEL',
  locale: 'OMT_LOCALE',
  verbose: 'OMT_VERBOSE',
  serveWeb: 'OMT_SERVE_WEB',
  openPaths: 'OMT_OPEN_PATHS',
  devAssumeServer: 'OMT_DEV_ASSUME_SERVER',
} as const;

// Default values
export const DEFAULTS = {
  serverAddr: '127.0.0.1:8080',
  serverBuild: 'release',
  logLevel: 'info',
} as const;
