/**
 * Type definitions for the main process
 */

import type { ChildProcess } from 'node:child_process';

/**
 * Global state for the main process
 */
export interface MainState {
  serverProcess: ChildProcess | null;
  terminalAuthToken: string | null;
}

/**
 * Parsed CLI arguments
 */
export interface CliArgs {
  openPaths: string[];
  showHelp: boolean;
  showVersion: boolean;
  showStatus: boolean;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  addr: string;
  token: string;
  binPath: string;
}

/**
 * Window creation options
 */
export interface WindowOptions {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  authValid: boolean;
}

/**
 * Dialog result types
 */
export interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}
