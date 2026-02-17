/**
 * CLI argument parsing and handling
 */

import { app } from 'electron';
import { ENV_VARS, DEFAULTS } from './constants';

/**
 * Print usage information
 */
export function printUsage(): void {
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

/**
 * Print version information
 */
export function printVersion(): void {
  console.log(`Omit IDE ${app.getVersion()}`);
}

/**
 * Print status information
 */
export function printStatus(): void {
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

/**
 * Parse command line arguments
 * Sets environment variables and returns paths to open
 */
export function parseArgs(): string[] {
  const argv = process.argv.slice(2);
  const openPaths: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
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
        process.env[ENV_VARS.verbose] = '1';
        if (!process.env[ENV_VARS.logLevel]) {
          process.env[ENV_VARS.logLevel] = 'debug';
        }
        break;

      case '--log': {
        const next = argv[++i];
        if (!next) {
          console.error('--log requires a level (eg. info, debug)');
          process.exit(1);
        }
        process.env[ENV_VARS.logLevel] = next;
        break;
      }

      case '-s':
      case '--status':
        printStatus();
        process.exit(0);
        break;

      case '--disable-gpu':
        try {
          app.disableHardwareAcceleration();
        } catch {
          // ignore - best-effort
        }
        break;

      case '--disable-chromium-sandbox':
        try {
          app.commandLine.appendSwitch('no-sandbox');
          process.env.ELECTRON_NO_SANDBOX = '1';
        } catch {
          // ignore
        }
        break;

      case '--locale': {
        const next = argv[++i];
        if (!next) {
          console.error('--locale requires a locale value (eg. en-US)');
          process.exit(1);
        }
        process.env[ENV_VARS.locale] = next;
        try {
          app.commandLine.appendSwitch('lang', next);
        } catch {
          // ignore
        }
        break;
      }

      case 'serve-web':
        process.env[ENV_VARS.serveWeb] = '1';
        break;

      default:
        if (arg.startsWith('-')) {
          console.warn(`Unknown option: ${arg}`);
        } else {
          openPaths.push(arg);
        }
    }
  }

  if (openPaths.length > 0) {
    process.env[ENV_VARS.openPaths] = JSON.stringify(openPaths);
  }

  return openPaths;
}