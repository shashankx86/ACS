/**
 * Server process management
 * Handles spawning, health checks, and lifecycle of the backend server
 */

import { app } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  HEALTH_TIMEOUT_MS,
  TOTAL_TIMEOUT_MS,
  INITIAL_DELAY_MS,
  MAX_DELAY_MS,
  TERMINAL_TOKEN_FILE,
  ENV_VARS,
  DEFAULTS,
} from './constants';
import type { MainState } from './types';

// Global state
const state: MainState = {
  serverProcess: null,
  terminalAuthToken: null,
};

/**
 * Resolve the server address from environment or default
 */
export function resolveServerAddr(): string {
  const raw = process.env[ENV_VARS.serverAddr] ?? DEFAULTS.serverAddr;
  const trimmed = raw.trim();
  const withoutScheme = trimmed.replace(/^(https?:\/\/|wss?:\/\/)/, '');
  return withoutScheme.replace(/\/+$/, '');
}

/**
 * Get or create the terminal authentication token
 * Uses cached value, environment variable, or generates a new one
 */
export function resolveTerminalAuthToken(): string {
  if (state.terminalAuthToken) {
    return state.terminalAuthToken;
  }

  const envToken = process.env[ENV_VARS.terminalAuthToken]?.trim();
  if (envToken) {
    state.terminalAuthToken = envToken;
    return state.terminalAuthToken;
  }

  const tokenPath = path.join(app.getPath('userData'), TERMINAL_TOKEN_FILE);
  try {
    const saved = fs.readFileSync(tokenPath, 'utf8').trim();
    if (saved.length > 0) {
      state.terminalAuthToken = saved;
      return state.terminalAuthToken;
    }
  } catch {
    // token file does not exist yet
  }

  state.terminalAuthToken = randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, state.terminalAuthToken, { mode: 0o600 });
  return state.terminalAuthToken;
}

/**
 * Check if the server is healthy
 */
export async function checkHealth(addr: string): Promise<boolean> {
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

/**
 * Check if the terminal authentication token is valid
 */
export async function checkTerminalAuth(addr: string, token: string): Promise<boolean> {
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

/**
 * Wait for the server to become healthy with exponential backoff
 */
export async function waitForHealth(addr: string): Promise<boolean> {
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

/**
 * Resolve the path to the server binary
 */
export function resolveServerBin(): string {
  const envBin = process.env[ENV_VARS.serverBin];
  if (envBin) {
    return envBin;
  }

  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'server');
  }

  const build = process.env[ENV_VARS.serverBuild] ?? DEFAULTS.serverBuild;
  const appRoot = app.getAppPath();
  return path.resolve(appRoot, '..', '..', 'dist', build, 'server');
}

/**
 * Ensure the server is running
 * Spawns a new server process if needed
 */
export async function ensureServerRunning(): Promise<void> {
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

  state.serverProcess = spawn(serverPath, [], {
    env: {
      ...process.env,
      OMT_SERVER_ADDR: addr,
      OMT_TERMINAL_AUTH_TOKEN: token
    },
    stdio: 'ignore',
    detached: true
  });
  state.serverProcess.unref();

  const healthy = await waitForHealth(addr);
  if (!healthy) {
    killServer();
    throw new Error('server failed health check');
  }

  if (!(await checkTerminalAuth(addr, token))) {
    killServer();
    throw new Error('server started but terminal authentication check failed');
  }
}

/**
 * Kill the server process if running
 */
export function killServer(): void {
  if (state.serverProcess && !state.serverProcess.killed) {
    try {
      state.serverProcess.kill();
    } catch {
      // ignore
    }
  }
  state.serverProcess = null;
}

/**
 * Get the current server process (for testing/debugging)
 */
export function getServerProcess(): ChildProcess | null {
  return state.serverProcess;
}