export async function getServerAddr(): Promise<string> {
  const api = (window as any).omt?.server;
  if (!api || !api.getAddr) {
    return '127.0.0.1:8080';
  }
  try {
    const addr = await api.getAddr();
    return String(addr || '127.0.0.1:8080');
  } catch {
    return '127.0.0.1:8080';
  }
}

const defaultServerAddr = '127.0.0.1:8080';
const requestTimeoutMs = 10_000;
let tokenPromise: Promise<string> | null = null;

async function getServerToken(): Promise<string> {
  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    const api = (window as any).omt?.server;
    if (!api || !api.getTerminalAuthToken) {
      return '';
    }
    try {
      const token = await Promise.resolve(api.getTerminalAuthToken());
      return typeof token === 'string' ? token.trim() : '';
    } catch {
      return '';
    }
  })();

  return tokenPromise;
}

function buildHttpUrl(addr: string, path: string): string {
  const trimmed = addr.replace(/\/$/, '');
  return `http://${trimmed}${path}`;
}

async function fetchJson(path: string, opts: RequestInit = {}) {
  const addr = await getServerAddr().catch(() => defaultServerAddr);
  const url = buildHttpUrl(addr, path);
  const token = await getServerToken();

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort('request timeout'), requestTimeoutMs);
  if (opts.signal) {
    if (opts.signal.aborted) {
      controller.abort(opts.signal.reason);
    } else {
      opts.signal.addEventListener('abort', () => controller.abort(opts.signal?.reason), { once: true });
    }
  }

  const headers = new Headers(opts.headers ?? undefined);
  if (token) {
    headers.set('X-OMT-Token', token);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...opts,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    const message = String(err?.message ?? err ?? 'request failed');
    if (String(message).toLowerCase().includes('abort')) {
      throw new Error(`request timed out after ${requestTimeoutMs}ms`);
    }
    throw new Error(message);
  } finally {
    window.clearTimeout(timeout);
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${txt}`);
  }
  return res.json();
}

export async function fsStat(path: string) {
  return fetchJson(`/v1/fs/stat?path=${encodeURIComponent(path)}`);
}

export async function fsList(path: string) {
  return fetchJson(`/v1/fs/list?path=${encodeURIComponent(path)}`);
}

export async function fsRead(path: string) {
  return fetchJson(`/v1/fs/read?path=${encodeURIComponent(path)}`);
}

export async function fsWrite(path: string, content: string) {
  return fetchJson('/v1/fs/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
}

export async function fsCreate(path: string, isDir = false) {
  return fetchJson('/v1/fs/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, isDir }),
  });
}

export async function fsDelete(path: string, recursive = false) {
  return fetchJson('/v1/fs/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, recursive }),
  });
}

export async function workspaceOpen(paths: string[]) {
  return fetchJson('/v1/workspaces/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  });
}
