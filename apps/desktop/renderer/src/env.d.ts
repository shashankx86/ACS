/// <reference path="../.astro/types.d.ts" />

declare global {
  interface Window {
    omt?: {
      window?: {
        minimize?: () => Promise<void> | void;
        toggleMaximize?: () => Promise<boolean> | boolean;
        close?: () => Promise<void> | void;
      };
      server?: {
        getAddr?: () => Promise<string> | string;
        getTerminalAuthToken?: () => Promise<string> | string;
      };
      clipboard?: {
        readText?: () => Promise<string> | string;
        writeText?: (text: string) => Promise<void> | void;
      };
    };
  }
}

export {};
