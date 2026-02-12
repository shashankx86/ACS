/// <reference path="../.astro/types.d.ts" />

declare global {
  interface Window {
    acs?: {
      window?: {
        minimize?: () => Promise<void> | void;
        toggleMaximize?: () => Promise<boolean> | boolean;
        close?: () => Promise<void> | void;
      };
      server?: {
        getAddr?: () => Promise<string> | string;
        getTerminalAuthToken?: () => Promise<string> | string;
      };
    };
  }
}

export {};
