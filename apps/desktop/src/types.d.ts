/**
 * Type declarations for the renderer process
 * Extends Window interface with the exposed OMT API
 */

import type { OmtApi } from './preload';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Window {
    omt: OmtApi;
  }
}

export {};