import React from 'react';
import { ChevronDown, ChevronRight, FileText, RefreshCw } from 'lucide-react';

type TreeEntry = {
  name: string;
  path: string;
  isDir: boolean;
};

type NodeState = {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  entries: TreeEntry[];
};

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function pathLabel(path: string): string {
  const normalized = normalizePath(path).replace(/\/+$/, '');
  if (!normalized) {
    return path;
  }
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

function compareEntries(a: TreeEntry, b: TreeEntry): number {
  if (a.isDir !== b.isDir) {
    return a.isDir ? -1 : 1;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export const FileExplorer: React.FC<{ rootPath?: string; onOpenFile?: (p: string) => void }> = ({ rootPath, onOpenFile }) => {
  const [tree, setTree] = React.useState<Record<string, NodeState>>({});
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const treeRef = React.useRef(tree);

  React.useEffect(() => {
    treeRef.current = tree;
  }, [tree]);

  const openRootFolder = async () => {
    const picker = window.omt?.dialog?.openFolder;
    const picked = picker
      ? await Promise.resolve(picker(rootPath))
      : window.prompt('Open folder (absolute path)', rootPath ?? '') ?? null;
    if (!picked) {
      return;
    }
    onOpenFile?.(picked);
  };

  const loadChildren = React.useCallback(async (dirPath: string, force = false) => {
    const current = treeRef.current[dirPath];
    if (!force && current && (current.loading || current.loaded)) {
      return;
    }

    setTree((previous) => ({
      ...previous,
      [dirPath]: {
        loading: true,
        loaded: previous[dirPath]?.loaded ?? false,
        error: null,
        entries: previous[dirPath]?.entries ?? [],
      }
    }));

    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      setTree((previous) => ({
        ...previous,
        [dirPath]: {
          loading: false,
          loaded: previous[dirPath]?.loaded ?? false,
          entries: previous[dirPath]?.entries ?? [],
          error: 'Timed out while loading folder',
        }
      }));
    }, 12_000);

    try {
      const { fsList } = await import('../../lib/serverApi');
      const response = await fsList(dirPath);
      if (timedOut) {
        return;
      }

      const entries: TreeEntry[] = (response || []).map((entry: any) => ({
        name: String(entry?.name ?? ''),
        path: String(entry?.path ?? ''),
        isDir: Boolean(entry?.isDir),
      })).sort(compareEntries);

      setTree((previous) => ({
        ...previous,
        [dirPath]: {
          loading: false,
          loaded: true,
          error: null,
          entries,
        }
      }));
    } catch (error: any) {
      if (timedOut) {
        return;
      }
      setTree((previous) => ({
        ...previous,
        [dirPath]: {
          loading: false,
          loaded: false,
          entries: previous[dirPath]?.entries ?? [],
          error: String(error?.message ?? error),
        }
      }));
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  React.useEffect(() => {
    if (!rootPath) {
      setTree({});
      setExpanded({});
      return;
    }

    setExpanded((previous) => ({
      ...previous,
      [rootPath]: true,
    }));
    void loadChildren(rootPath, true);
  }, [rootPath, loadChildren]);

  const toggleFolder = (path: string) => {
    const nextOpen = !expanded[path];
    setExpanded((previous) => ({ ...previous, [path]: nextOpen }));
    if (nextOpen) {
      void loadChildren(path);
    }
  };

  const renderEntries = (folderPath: string, depth: number): React.ReactNode => {
    const state = tree[folderPath];
    if (!state) {
      return null;
    }

    if (state.loading && state.entries.length === 0) {
      return <div className="px-3 py-1 text-xs text-zinc-500">Loading...</div>;
    }

    if (state.error && state.entries.length === 0) {
      return <div className="px-3 py-1 text-xs text-red-400">{state.error}</div>;
    }

    return (
      <>
        {state.entries.map((entry) => {
          const isOpen = Boolean(expanded[entry.path]);
          const childState = tree[entry.path];
          const paddingLeft = 10 + depth * 14;

          if (entry.isDir) {
            return (
              <div key={entry.path}>
                <button
                  type="button"
                  className="w-full text-left h-7 px-2 hover:bg-zinc-800/80 text-zinc-300 flex items-center gap-1.5"
                  style={{ paddingLeft }}
                  onClick={() => toggleFolder(entry.path)}
                  title={entry.path}
                >
                  {isOpen ? <ChevronDown size={13} className="text-zinc-500" /> : <ChevronRight size={13} className="text-zinc-500" />}
                  <span className="truncate text-[13px]">{entry.name}</span>
                </button>

                {isOpen && (
                  <div>
                    {childState?.loading && childState.entries.length === 0 && (
                      <div className="text-xs text-zinc-500 px-3 py-1" style={{ paddingLeft: paddingLeft + 20 }}>
                        Loading...
                      </div>
                    )}
                    {childState?.error && childState.entries.length === 0 && (
                      <div className="text-xs text-red-400 px-3 py-1" style={{ paddingLeft: paddingLeft + 20 }}>
                        {childState.error}
                      </div>
                    )}
                    {childState && renderEntries(entry.path, depth + 1)}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={entry.path}
              type="button"
              className="w-full text-left h-7 px-2 hover:bg-zinc-800/80 text-zinc-300 flex items-center gap-1.5"
              style={{ paddingLeft: paddingLeft + 20 }}
              onClick={() => onOpenFile?.(entry.path)}
              title={entry.path}
            >
              <FileText size={13} className="text-zinc-500" />
              <span className="truncate text-[13px]">{entry.name}</span>
            </button>
          );
        })}
      </>
    );
  };

  if (!rootPath) {
    return (
      <div className="h-full w-full flex items-center justify-center px-4 text-sm text-zinc-400">
        <div className="max-w-[220px] text-center">
          <p className="mb-3">No folder open</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
            onClick={() => void openRootFolder()}
          >
            Open Folder
          </button>
        </div>
      </div>
    );
  }

  const rootOpen = Boolean(expanded[rootPath]);
  const rootState = tree[rootPath];

  return (
    <div className="h-full overflow-auto text-zinc-300">
      <div className="h-8 px-3 flex items-center justify-between text-[11px] tracking-wide uppercase text-zinc-500">
        <span>Explorer</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-6 w-6 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 flex items-center justify-center"
            title="Refresh"
            onClick={() => void loadChildren(rootPath, true)}
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            className="h-6 px-2 rounded hover:bg-zinc-800 text-[11px] text-zinc-500 hover:text-zinc-200"
            title="Open folder"
            onClick={() => void openRootFolder()}
          >
            Open
          </button>
        </div>
      </div>

      <div className="pb-2">
        <button
          type="button"
          className="w-full text-left h-7 px-2 hover:bg-zinc-800/80 text-zinc-300 flex items-center gap-1.5"
          onClick={() => toggleFolder(rootPath)}
          title={rootPath}
        >
          {rootOpen ? <ChevronDown size={13} className="text-zinc-500" /> : <ChevronRight size={13} className="text-zinc-500" />}
          <span className="truncate text-[13px]">{pathLabel(rootPath)}</span>
        </button>

        {rootOpen && (
          <div>
            {rootState?.loading && rootState.entries.length === 0 && (
              <div className="px-8 py-1 text-xs text-zinc-500">Loading...</div>
            )}
            {rootState?.error && rootState.entries.length === 0 && (
              <div className="px-8 py-1 text-xs text-red-400">{rootState.error}</div>
            )}
            {rootState && renderEntries(rootPath, 1)}
          </div>
        )}
      </div>
    </div>
  );
};
