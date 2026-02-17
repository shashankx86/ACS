import React, { useCallback, useMemo, useState } from 'react';
import { ChevronRight, FileText, FolderOpen, Save } from 'lucide-react';
import { FileExplorer } from '../panels/FileExplorer';
import { fsRead, fsStat, fsWrite } from '../../lib/serverApi';

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function getBaseName(path: string): string {
  const normalized = normalizePath(path).replace(/\/+$/, '');
  if (!normalized) {
    return path;
  }
  const parts = normalized.split('/');
  return parts[parts.length - 1] || path;
}

function getParentPath(path: string): string {
  const normalized = normalizePath(path).replace(/\/+$/, '');
  if (!normalized || normalized === '/') {
    return '/';
  }
  if (/^[A-Za-z]:$/.test(normalized)) {
    return normalized;
  }
  const splitIndex = normalized.lastIndexOf('/');
  if (splitIndex <= 0) {
    return '/';
  }
  if (splitIndex === 2 && normalized[1] === ':') {
    return `${normalized.slice(0, 2)}/`;
  }
  return normalized.slice(0, splitIndex);
}

export const EditorWorkspace: React.FC<{
  initialPath?: string;
  onOpenPath?: (p: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSave?: (path: string) => void;
  onTitleChange?: (title: string) => void;
}> = ({ initialPath, onOpenPath, onDirtyChange, onSave, onTitleChange }) => {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isDragging, setIsDragging] = useState(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [activePath, setActivePath] = useState<string | null>(initialPath ?? null);
  const lineNumbersRef = React.useRef<HTMLDivElement | null>(null);
  const onOpenPathRef = React.useRef(onOpenPath);
  const onDirtyChangeRef = React.useRef(onDirtyChange);
  const onSaveRef = React.useRef(onSave);
  const onTitleChangeRef = React.useRef(onTitleChange);

  React.useEffect(() => {
    onOpenPathRef.current = onOpenPath;
    onDirtyChangeRef.current = onDirtyChange;
    onSaveRef.current = onSave;
    onTitleChangeRef.current = onTitleChange;
  }, [onOpenPath, onDirtyChange, onSave, onTitleChange]);

  const isDirty = draft !== null && savedContent !== null && draft !== savedContent;
  const lineCount = useMemo(() => (draft ?? '').split('\n').length, [draft]);

  const emitOpenPath = useCallback((path: string) => {
    setActivePath(path);
    onOpenPathRef.current?.(path);
  }, []);

  const promptDiscardChanges = useCallback(() => {
    if (!isDirty) {
      return true;
    }
    return window.confirm('You have unsaved changes. Discard them and continue?');
  }, [isDirty]);

  const openFileWithDialog = useCallback(async () => {
    const openFilePicker = window.omt?.dialog?.openFile;
    const defaultPath = activePath ?? folderPath ?? undefined;
    const selectedPath = openFilePicker
      ? await Promise.resolve(openFilePicker(defaultPath))
      : window.prompt('Open file (absolute path)', defaultPath ?? '') ?? null;
    if (!selectedPath) {
      return;
    }
    if (!promptDiscardChanges()) {
      return;
    }
    emitOpenPath(selectedPath);
  }, [activePath, emitOpenPath, folderPath, promptDiscardChanges]);

  const openFolderWithDialog = useCallback(async () => {
    const openFolderPicker = window.omt?.dialog?.openFolder;
    const defaultPath = folderPath ?? activePath ?? undefined;
    const selectedPath = openFolderPicker
      ? await Promise.resolve(openFolderPicker(defaultPath))
      : window.prompt('Open folder (absolute path)', defaultPath ?? '') ?? null;
    if (!selectedPath) {
      return;
    }
    if (!promptDiscardChanges()) {
      return;
    }
    emitOpenPath(selectedPath);
  }, [activePath, emitOpenPath, folderPath, promptDiscardChanges]);

  const saveAs = useCallback(async () => {
    if (draft === null) {
      return;
    }
    const savePicker = window.omt?.dialog?.saveFile;
    const defaultPath = activePath ?? `${folderPath ?? ''}/untitled.txt`;
    const selectedPath = savePicker
      ? await Promise.resolve(savePicker(defaultPath))
      : window.prompt('Save as (absolute path)', defaultPath) ?? null;
    if (!selectedPath) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const stat = await fsWrite(selectedPath, draft);
      const resolvedPath = String(stat?.path ?? selectedPath);
      setSavedContent(draft);
      setFolderPath(getParentPath(resolvedPath));
      setActivePath(resolvedPath);
      onOpenPathRef.current?.(resolvedPath);
      onSaveRef.current?.(resolvedPath);
      onTitleChangeRef.current?.(getBaseName(resolvedPath));
      onDirtyChangeRef.current?.(false);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }, [activePath, draft, folderPath]);

  const save = useCallback(async () => {
    if (draft === null) {
      return;
    }
    if (!activePath || draft === null) {
      await saveAs();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const stat = await fsWrite(activePath, draft);
      const resolvedPath = String(stat?.path ?? activePath);
      setSavedContent(draft);
      setFolderPath(getParentPath(resolvedPath));
      setActivePath(resolvedPath);
      onOpenPathRef.current?.(resolvedPath);
      onSaveRef.current?.(resolvedPath);
      onDirtyChangeRef.current?.(false);
      onTitleChangeRef.current?.(getBaseName(resolvedPath));
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }, [activePath, draft, saveAs]);

  React.useEffect(() => {
    setActivePath(initialPath ?? null);
  }, [initialPath]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setSidebarWidth(Math.max(180, Math.min(420, e.clientX)));
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDragging]);

  React.useEffect(() => {
    if (!activePath) {
      setLoading(false);
      setError(null);
      setSavedContent(null);
      setDraft(null);
      setFolderPath(null);
      onDirtyChangeRef.current?.(false);
      return;
    }

    let cancelled = false;
    let watchdogTimer: number | undefined;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setSavedContent(null);
        setDraft(null);
        watchdogTimer = window.setTimeout(() => {
          if (cancelled) {
            return;
          }
          setError('Timed out while loading this path. Try opening a different file or folder.');
          setLoading(false);
        }, 12_000);

        const stat = await fsStat(activePath);
        if (cancelled) {
          return;
        }

        if (!stat?.exists) {
          throw new Error(`Path does not exist: ${activePath}`);
        }

        const resolvedPath = String(stat?.path ?? activePath);
        if (stat?.isDir) {
          setFolderPath(resolvedPath);
          onTitleChangeRef.current?.(getBaseName(resolvedPath));
          onDirtyChangeRef.current?.(false);
          return;
        }

        setFolderPath(getParentPath(resolvedPath));
        const file = await fsRead(resolvedPath);
        if (cancelled) {
          return;
        }
        const text = String(file?.content ?? '');
        setSavedContent(text);
        setDraft(text);
        onDirtyChangeRef.current?.(false);
        onTitleChangeRef.current?.(getBaseName(resolvedPath));
      } catch (err: any) {
        if (cancelled) {
          return;
        }
        setError(String(err?.message ?? err));
      } finally {
        if (watchdogTimer !== undefined) {
          window.clearTimeout(watchdogTimer);
        }
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (watchdogTimer !== undefined) {
        window.clearTimeout(watchdogTimer);
      }
    };
  }, [activePath]);

  React.useEffect(() => {
    onDirtyChangeRef.current?.(Boolean(isDirty));
  }, [isDirty]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isSave = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (!isSave) {
        return;
      }
      event.preventDefault();
      void save();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [save]);

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#1e1e1e]">
      <div style={{ width: sidebarWidth }} className="flex-shrink-0 h-full border-r border-[#222]">
        <FileExplorer
          rootPath={folderPath ?? undefined}
          onOpenFile={(path) => {
            if (!promptDiscardChanges()) {
              return;
            }
            emitOpenPath(path);
          }}
        />
      </div>

      <div
        className="w-1 hover:bg-emerald-500/50 cursor-col-resize z-10 transition-colors"
        onMouseDown={() => setIsDragging(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0c0c]">
        <div className="flex items-center h-9 bg-[#0a0a0a] border-b border-[#27272a] overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center h-full px-3 py-1 bg-[#1e1e1e] border-t-2 border-t-emerald-500 text-zinc-100 text-xs min-w-[160px] justify-between border-r border-[#27272a]">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={13} className="text-cyan-400 flex-shrink-0" />
              <span className="truncate">{activePath ? `${getBaseName(activePath)}${isDirty ? ' *' : ''}` : 'Untitled'}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 px-2 text-zinc-500">
            <button
              type="button"
              className="px-2 py-0.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              onClick={() => void openFileWithDialog()}
            >
              Open File
            </button>
            <button
              type="button"
              className="px-2 py-0.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              onClick={() => void openFolderWithDialog()}
            >
              Open Folder
            </button>
            <button
              type="button"
              className="px-2 py-0.5 text-xs rounded bg-emerald-700/15 hover:bg-emerald-700/30 text-emerald-300 disabled:opacity-50"
              onClick={() => void save()}
              disabled={draft === null || loading}
            >
              <span className="inline-flex items-center gap-1">
                <Save size={12} />
                Save
              </span>
            </button>
            <button
              type="button"
              className="px-2 py-0.5 text-xs rounded bg-amber-700/15 hover:bg-amber-700/30 text-amber-300 disabled:opacity-50"
              onClick={() => void saveAs()}
              disabled={draft === null || loading}
            >
              Save As
            </button>
          </div>
        </div>

        <div className="h-6 flex items-center px-4 text-xs text-zinc-500 gap-1.5 bg-[#0c0c0c] border-b border-[#1f1f21]">
          <span className="truncate">{folderPath ?? 'No folder open'}</span>
          <ChevronRight size={10} className="flex-shrink-0" />
          <span className="truncate">{activePath ? getBaseName(activePath) : 'No file open'}</span>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden font-mono text-[13px] leading-6">
          {loading && <div className="text-zinc-500 p-4">Loading...</div>}
          {!loading && error && <div className="text-red-400 p-4">{error}</div>}

          {!loading && !error && draft !== null && (
            <div className="h-full min-h-0 px-4 py-3">
              <div className="flex h-full min-h-0 overflow-hidden rounded border border-[#1f1f21] bg-[#0c0c0c]">
                <div
                  ref={lineNumbersRef}
                  className="w-[52px] flex-shrink-0 overflow-hidden py-2 pr-3 pl-2 text-right select-none text-zinc-600"
                >
                  {Array.from({ length: lineCount }, (_, index) => (
                    <div key={index} className="h-6">{index + 1}</div>
                  ))}
                </div>

                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onScroll={(event) => {
                    if (lineNumbersRef.current) {
                      lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Tab') {
                      return;
                    }
                    event.preventDefault();
                    const textarea = event.currentTarget;
                    const start = event.currentTarget.selectionStart;
                    const end = event.currentTarget.selectionEnd;
                    const source = draft ?? '';
                    const next = `${source.slice(0, start)}  ${source.slice(end)}`;
                    setDraft(next);
                    requestAnimationFrame(() => {
                      textarea.selectionStart = start + 2;
                      textarea.selectionEnd = start + 2;
                    });
                  }}
                  className="flex-1 h-full min-h-0 resize-none overflow-auto bg-[#0c0c0c] py-2 pr-3 pl-2 outline-none font-mono text-sm leading-6 text-zinc-100"
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {!loading && !error && draft === null && (
            <div className="h-full min-h-[240px] flex items-center justify-center text-zinc-400 px-4">
              <div className="max-w-md text-center">
                <p className="text-sm mb-2">{activePath ? `Folder open: ${activePath}` : 'No file open'}</p>
                <p className="text-xs text-zinc-500 mb-4">Open a file to start editing.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
                    onClick={() => void openFileWithDialog()}
                  >
                    <FileText size={13} />
                    Open File
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700"
                    onClick={() => void openFolderWithDialog()}
                  >
                    <FolderOpen size={13} />
                    Open Folder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
