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

function buildHttpUrl(addr: string, path: string): string {
  const trimmed = addr.replace(/\/$/, '');
  return `http://${trimmed}${path}`;
}

async function fetchJson(path: string, opts: RequestInit = {}) {
  const addr = await getServerAddr();
  const url = buildHttpUrl(addr, path);
  const res = await fetch(url, opts);
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
