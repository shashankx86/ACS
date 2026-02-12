import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

type ConnectionState = 'connecting' | 'connected' | 'closed' | 'error';

type TerminalServerEvent = {
  type: string;
  message?: string;
  code?: number;
  shell?: string;
};

const DEFAULT_SERVER_ADDR = '127.0.0.1:8080';
const UTF8_ENCODER = new TextEncoder();

function toTerminalSocketURL(addr: string): string {
  const trimmed = addr.trim();
  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
    return `${trimmed.replace(/\/$/, '')}/v1/terminals/ws`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const url = new URL(trimmed);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}/v1/terminals/ws`;
  }

  return `ws://${trimmed.replace(/\/$/, '')}/v1/terminals/ws`;
}

async function resolveServerAddr(): Promise<string> {
  const getter = (window as any).omt?.server?.getAddr;
  if (!getter) {
    return DEFAULT_SERVER_ADDR;
  }

  try {
    const result = await Promise.resolve(getter());
    if (typeof result !== 'string') {
      return DEFAULT_SERVER_ADDR;
    }

    const trimmed = result.trim();
    return trimmed.length > 0 ? trimmed : DEFAULT_SERVER_ADDR;
  } catch {
    return DEFAULT_SERVER_ADDR;
  }
}

async function readTerminalBytes(payload: Blob | ArrayBuffer): Promise<Uint8Array> {
  if (payload instanceof ArrayBuffer) {
    return new Uint8Array(payload);
  }

  const data = await payload.arrayBuffer();
  return new Uint8Array(data);
}

async function resolveTerminalAuthToken(): Promise<string> {
  const getter = (window as any).omt?.server?.getTerminalAuthToken;
  if (!getter) {
    return '';
  }

  try {
    const result = await Promise.resolve(getter());
    if (typeof result !== 'string') {
      return '';
    }

    return result.trim();
  } catch {
    return '';
  }
}

function isMacPlatform(): boolean {
  return navigator.platform.toLowerCase().includes('mac');
}

async function readClipboardText(): Promise<string> {
  const reader = (window as any).omt?.clipboard?.readText;
  if (reader) {
    try {
      const result = await Promise.resolve(reader());
      return typeof result === 'string' ? result : '';
    } catch {
      // fall back to browser clipboard API
    }
  }

  if (navigator.clipboard?.readText) {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return '';
    }
  }

  return '';
}

async function writeClipboardText(value: string): Promise<void> {
  const writer = (window as any).omt?.clipboard?.writeText;
  if (writer) {
    try {
      await Promise.resolve(writer(value));
      return;
    } catch {
      // fall back to browser clipboard API
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore clipboard write failures
    }
  }
}

type TerminalWorkspaceProps = {
  onExit?: () => void;
  onTitleChange?: (title: string) => void;
};

export const TerminalWorkspace: React.FC<TerminalWorkspaceProps> = ({ onExit, onTitleChange }) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const connectionStateRef = useRef<ConnectionState>('connecting');
  const refreshOrReconnectRef = useRef<(() => void) | null>(null);
  const onExitRef = useRef(onExit);
  const onTitleChangeRef = useRef(onTitleChange);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [connectionLabel, setConnectionLabel] = useState('Connecting…');

  const setConnection = (state: ConnectionState, label: string) => {
    connectionStateRef.current = state;
    setConnectionState(state);
    setConnectionLabel(label);
  };

  useEffect(() => {
    onExitRef.current = onExit;
    onTitleChangeRef.current = onTitleChange;
  }, [onExit, onTitleChange]);

  useEffect(() => {
    const streamDecoder = new TextDecoder();

    const terminal = new Terminal({
      allowTransparency: false,
      convertEol: false,
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: 'DejaVu Sans Mono, Menlo, Monaco, Consolas, ui-monospace, monospace',
      fontSize: 13,
      lineHeight: 1,
      letterSpacing: 0,
      scrollback: 10000,
      theme: {
        background: '#0c0c0c',
        foreground: '#d4d4d8',
        cursor: '#f4f4f5',
        selectionBackground: '#3f3f46',
        black: '#0c0c0c',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#e4e4e7',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#e879f9',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa'
      }
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    const container = terminalContainerRef.current;
    if (!container) {
      terminal.dispose();
      return;
    }

    terminal.open(container);
    fitAddon.fit();

    let isDisposed = false;
    let inputDisposable: { dispose: () => void } | undefined;
    let keyDisposable: { dispose: () => void } | undefined;
    let titleDisposable: { dispose: () => void } | undefined;
    let resizeDisposable: { dispose: () => void } | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let socket: WebSocket | null = null;
    let commandBuffer = '';

    const isMac = isMacPlatform();

    const sendTerminalInput = (value: string) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }

      if (value.length === 0) {
        return;
      }

      socket.send(UTF8_ENCODER.encode(value));
    };

    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') {
        return true;
      }

      const key = event.key.toLowerCase();
      const isCopyShortcut = isMac
        ? event.metaKey && !event.ctrlKey && !event.altKey && key === 'c'
        : (event.ctrlKey && event.shiftKey && key === 'c') || (event.ctrlKey && !event.shiftKey && !event.altKey && key === 'insert');
      const isPasteShortcut = isMac
        ? event.metaKey && !event.ctrlKey && !event.altKey && key === 'v'
        : (event.ctrlKey && event.shiftKey && key === 'v') || (!event.ctrlKey && !event.altKey && event.shiftKey && key === 'insert');

      if (isCopyShortcut) {
        event.preventDefault();
        const selectedText = terminal.getSelection();
        if (selectedText.length > 0) {
          void writeClipboardText(selectedText);
        }
        terminal.clearSelection();
        return false;
      }

      if (isPasteShortcut) {
        event.preventDefault();
        void readClipboardText().then((text) => {
          sendTerminalInput(text);
        });
        return false;
      }

      return true;
    });

    const sendResize = () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      if (terminal.cols === 0 || terminal.rows === 0) {
        return;
      }

      socket.send(JSON.stringify({
        type: 'resize',
        cols: terminal.cols,
        rows: terminal.rows
      }));
    };

    const disconnectTerminal = () => {
      inputDisposable?.dispose();
      inputDisposable = undefined;
      keyDisposable?.dispose();
      keyDisposable = undefined;
      titleDisposable?.dispose();
      titleDisposable = undefined;
      resizeDisposable?.dispose();
      resizeDisposable = undefined;
      resizeObserver?.disconnect();
      resizeObserver = undefined;
      commandBuffer = '';
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close(1000, 'terminal-disconnect');
      }
      socket = null;
    };

    const refreshTerminalView = () => {
      fitAddon.fit();
      if (terminal.rows > 0) {
        terminal.refresh(0, terminal.rows - 1);
      }
      sendResize();
    };

    const setTerminalTitle = (nextTitle: string) => {
      const normalizedTitle = nextTitle.replace(/[\u0000-\u001f\u007f]/g, '').trim();
      if (normalizedTitle.length === 0) {
        return;
      }

      onTitleChangeRef.current?.(normalizedTitle);
    };

    const connectTerminal = async () => {
      setConnection('connecting', 'Connecting…');

      const [serverAddr, terminalToken] = await Promise.all([
        resolveServerAddr(),
        resolveTerminalAuthToken()
      ]);

      let nextSocket: WebSocket;
      try {
        const socketURL = new URL(toTerminalSocketURL(serverAddr));
        if (terminalToken.length > 0) {
          socketURL.searchParams.set('token', terminalToken);
        }

        nextSocket = new WebSocket(socketURL.toString());
      } catch {
        setConnection('error', 'Connection error');
        return;
      }

      socket = nextSocket;
      socket.binaryType = 'arraybuffer';

      socket.onopen = () => {
        if (isDisposed) {
          return;
        }

        setConnection('connected', 'Connected');
        terminal.focus();

        titleDisposable = terminal.onTitleChange((nextTitle) => {
          setTerminalTitle(nextTitle);
        });

        keyDisposable = terminal.onKey(({ domEvent }) => {
          if (domEvent.key === 'Enter') {
            const command = commandBuffer.trim();
            if (command.length > 0) {
              setTerminalTitle(command);
            }
            commandBuffer = '';
            return;
          }

          if (domEvent.key === 'Backspace') {
            commandBuffer = commandBuffer.slice(0, -1);
            return;
          }

          if (domEvent.ctrlKey || domEvent.metaKey || domEvent.altKey) {
            return;
          }

          if (domEvent.key.length === 1) {
            commandBuffer += domEvent.key;
          }
        });

        inputDisposable = terminal.onData((data) => {
          sendTerminalInput(data);
        });

        resizeDisposable = terminal.onResize(() => {
          sendResize();
        });

        resizeObserver = new ResizeObserver(() => {
          fitAddon.fit();
          sendResize();
        });
        resizeObserver.observe(container);

        refreshTerminalView();
      };

      socket.onmessage = async (event) => {
        if (isDisposed) {
          return;
        }

        if (typeof event.data === 'string') {
          try {
            const message = JSON.parse(event.data) as TerminalServerEvent;
            if (message.type === 'ready') {
              terminal.writeln(`\x1b[90mConnected to shell ${message.shell ?? ''}\x1b[0m`);
              return;
            }

            if (message.type === 'exit') {
              setConnection('closed', `Exited (${message.code ?? -1})`);
              terminal.writeln(`\r\n\x1b[31mTerminal process exited with code ${message.code ?? -1}.\x1b[0m`);
              disconnectTerminal();
              onExitRef.current?.();
              return;
            }

            if (message.type === 'error') {
              setConnection('error', 'Server error');
              terminal.writeln(`\r\n\x1b[31m${message.message ?? 'Unknown terminal error'}\x1b[0m`);
            }
          } catch {
            terminal.writeln(event.data);
          }
          return;
        }

        const output = await readTerminalBytes(event.data as Blob | ArrayBuffer);
        terminal.write(streamDecoder.decode(output, { stream: true }));
      };

      socket.onerror = () => {
        if (isDisposed) {
          return;
        }
        setConnection('error', 'Connection error');
      };

      socket.onclose = (event) => {
        if (isDisposed) {
          return;
        }

        inputDisposable?.dispose();
        inputDisposable = undefined;
        keyDisposable?.dispose();
        keyDisposable = undefined;
        titleDisposable?.dispose();
        titleDisposable = undefined;
        resizeDisposable?.dispose();
        resizeDisposable = undefined;
        resizeObserver?.disconnect();
        resizeObserver = undefined;
        commandBuffer = '';

        if (connectionStateRef.current !== 'error') {
          if (event.code === 1000) {
            setConnection('closed', 'Disconnected');
          } else {
            setConnection('closed', `Disconnected (${event.code})`);
          }
        }
      };
    };

    refreshOrReconnectRef.current = () => {
      if (connectionStateRef.current === 'connected') {
        refreshTerminalView();
        return;
      }

      disconnectTerminal();
      void connectTerminal();
    };

    void connectTerminal();

    return () => {
      isDisposed = true;
      refreshOrReconnectRef.current = null;
      disconnectTerminal();
      terminal.dispose();
    };
  }, []);

  return (
    <div className="h-full w-full bg-[#0c0c0c] text-zinc-300 flex flex-col overflow-hidden">
      <div ref={terminalContainerRef} className="terminal-host flex-1 min-h-0" />

      <div className="h-10 border-t border-[#27272a] px-3 flex items-center justify-between text-xs bg-[#111113]">
        <div className="flex items-center gap-2 text-zinc-400">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connectionState === 'connected'
                ? 'bg-emerald-500'
                : connectionState === 'connecting'
                  ? 'bg-amber-500'
                  : connectionState === 'error'
                    ? 'bg-rose-500'
                    : 'bg-zinc-500'
            }`}
          />
          <span>{connectionLabel}</span>
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => refreshOrReconnectRef.current?.()}
          disabled={connectionState === 'connecting'}
        >
          <RotateCcw size={12} />
          <span>Reconnect</span>
        </button>
      </div>
    </div>
  );
};