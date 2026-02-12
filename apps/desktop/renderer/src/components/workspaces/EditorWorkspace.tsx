import React, { useState } from 'react';
import { FileExplorer } from '../panels/FileExplorer';
import { X, Split, MoreHorizontal, ChevronRight } from 'lucide-react';


export const EditorWorkspace: React.FC<{
  initialPath?: string;
  onOpenFile?: (p: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSave?: (path: string) => void;
  onTitleChange?: (title: string) => void;
}> = ({ initialPath, onOpenFile, onDirtyChange, onSave, onTitleChange }) => {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isDragging, setIsDragging] = useState(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<string | null>(null);

  const isDirty = draft !== null && savedContent !== null && draft !== savedContent;

  // Simple resizing logic
  const handleMouseDown = () => setIsDragging(true);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setSidebarWidth(Math.max(150, Math.min(400, e.clientX)));
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
    if (!initialPath) {
      setSavedContent(null);
      setDraft(null);
      setFolderPath(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);
    setSavedContent(null);
    setDraft(null);
    setFolderPath(null);

    import('../../lib/serverApi').then(({ fsStat, fsRead }) => {
      fsStat(initialPath)
        .then((stat: any) => {
          if (!mounted) return;
          if (stat.isDir) {
            setFolderPath(stat.path);
            setLoading(false);
            return;
          }

          return fsRead(initialPath).then((res: any) => {
            if (!mounted) return;
            const text = res.content ?? '';
            setSavedContent(text);
            setDraft(text);
            setLoading(false);
            onDirtyChange?.(false);
            onTitleChange?.(initialPath.split('/').pop() || initialPath);
          });
        })
        .catch((err: Error) => {
          if (!mounted) return;
          setError(String(err.message ?? err));
          setLoading(false);
        });
    });

    return () => {
      mounted = false;
    };
  }, [initialPath, onDirtyChange, onTitleChange]);

  React.useEffect(() => {
    onDirtyChange?.(Boolean(isDirty));
  }, [isDirty, onDirtyChange]);

  // Save handler (writes to initialPath)
  const save = async () => {
    if (!initialPath) {
      // forward to saveAs when no path exists
      return saveAs();
    }
    if (draft === null) return;
    try {
      setLoading(true);
      await import('../../lib/serverApi').then(({ fsWrite }) => fsWrite(initialPath, draft));
      setSavedContent(draft);
      onSave?.(initialPath);
      onDirtyChange?.(false);
      onTitleChange?.(initialPath.split('/').pop() || initialPath);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  const saveAs = async () => {
    if (draft === null) return;
    const path = window.prompt('Save as (absolute path)', initialPath ?? '');
    if (!path) return;
    try {
      setLoading(true);
      await import('../../lib/serverApi').then(({ fsWrite }) => fsWrite(path, draft));
      setSavedContent(draft);
      onSave?.(path);
      onDirtyChange?.(false);
      onTitleChange?.(path.split('/').pop() || path);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  // keyboard shortcut for save
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
      if (!isSave) return;
      e.preventDefault();
      void save();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft, initialPath]);

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#1e1e1e]">
      {/* Sidebar */}
      <div style={{ width: sidebarWidth }} className="flex-shrink-0 h-full">
        {/* @ts-ignore */}
        <FileExplorer rootPath={folderPath ?? undefined} onOpenFile={onOpenFile} />
      </div>

      {/* Resizer */}
      <div
        className="w-1 hover:bg-emerald-500/50 cursor-col-resize z-10 transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0c0c]">
        {/* Editor Tabs */}
        <div className="flex items-center h-9 bg-[#0a0a0a] border-b border-[#27272a] overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center h-full px-3 py-1 bg-[#1e1e1e] border-t-2 border-t-emerald-500 text-zinc-100 text-xs min-w-[120px] justify-between group cursor-pointer border-r border-[#27272a]">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">⚛</span>
              <span>{initialPath ? `${initialPath.split('/').pop()}${isDirty ? ' *' : ''}` : 'Untitled'}</span>
            </div>
            <div className="flex items-center gap-2 mr-2">
              <button className="px-2 py-0.5 text-xs rounded bg-emerald-700/10 hover:bg-emerald-700/20" onClick={() => void save()}>Save</button>
              <button className="px-2 py-0.5 text-xs rounded bg-amber-700/10 hover:bg-amber-700/20" onClick={() => void saveAs()}>Save As</button>
            </div>
          </div>
          {/* Tab Actions placeholder */}
          <div className="ml-auto flex items-center gap-2 px-2 text-zinc-500">
            <Split size={14} className="hover:text-zinc-300 cursor-pointer" />
            <MoreHorizontal size={14} className="hover:text-zinc-300 cursor-pointer" />
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="h-6 flex items-center px-4 text-xs text-zinc-500 gap-1.5 bg-[#0c0c0c] border-b border-transparent">
          <span>{initialPath ?? 'No file'}</span>
          <ChevronRight size={10} />
          <span>{initialPath ? (initialPath.split('/').pop() || '') : 'Untitled'}</span>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto font-mono text-[13px] leading-6 p-4">
          {loading && <div className="text-zinc-500">Loading...</div>}
          {error && <div className="text-red-400">{error}</div>}

          {!loading && !error && draft !== null && (
            <div className="flex h-full min-h-[200px]">
              {/* Line Numbers */}
              <div className="flex flex-col text-right pr-4 pl-2 select-none text-zinc-600 bg-[#0c0c0c] min-h-full">
                {draft.split('\n').map((_, i) => (
                  <div key={i} className="h-6 w-8">{i + 1}</div>
                ))}
              </div>

              {/* Editable textarea */}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 resize-none bg-[#0c0c0c] text-zinc-100 p-2 outline-none font-mono text-sm leading-6"
                spellCheck={false}
              />
            </div>
          )}

          {!loading && !error && draft === null && (
            <div className="text-zinc-400">No file open. Use the file explorer or pass a path on the command line.</div>
          )}
        </div>
      </div>
    </div>
  );
};
