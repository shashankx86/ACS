import React from 'react';

export const FileExplorer: React.FC<{ rootPath?: string; onOpenFile?: (p: string) => void }> = ({ rootPath, onOpenFile }) => {
  const [entries, setEntries] = React.useState<Array<{ name: string; path: string; isDir: boolean }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentRoot, setCurrentRoot] = React.useState<string | undefined>(rootPath);

  React.useEffect(() => {
    setCurrentRoot(rootPath);
  }, [rootPath]);

  const refresh = React.useCallback((p?: string) => {
    const target = p ?? currentRoot;
    if (!target) {
      setEntries([]);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    import('../../lib/serverApi').then(({ fsList }) => {
      fsList(target)
        .then((res: any) => {
          if (!mounted) return;
          setEntries((res || []).map((e: any) => ({ name: e.name, path: e.path, isDir: e.isDir })));
          setLoading(false);
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
  }, [currentRoot]);

  React.useEffect(() => {
    refresh();
  }, [currentRoot, refresh]);

  React.useEffect(() => {
    setCurrentRoot(rootPath);
  }, [rootPath]);

  const goUp = () => {
    if (!currentRoot) return;
    const trimmed = currentRoot.replace(/\\/g, '/').replace(/\/$/, '');
    const idx = trimmed.lastIndexOf('/');
    if (idx <= 0) {
      setCurrentRoot('/');
    } else {
      setCurrentRoot(trimmed.slice(0, idx));
    }
  };

  const createNew = async (isDir: boolean) => {
    if (!currentRoot) return;
    const name = window.prompt(isDir ? 'New folder name' : 'New file name');
    if (!name) return;
    const target = `${currentRoot.replace(/\/$/, '')}/${name}`;
    try {
      const api = await import('../../lib/serverApi');
      await api.fsCreate(target, isDir);
      refresh();
      if (!isDir) {
        onOpenFile?.(target);
      }
    } catch (err: any) {
      window.alert(String(err?.message ?? err));
    }
  };

  const removeEntry = async (entryPath: string, isDir: boolean) => {
    if (!window.confirm(`Delete ${entryPath}?`)) return;
    try {
      const api = await import('../../lib/serverApi');
      await api.fsDelete(entryPath, isDir);
      refresh();
    } catch (err: any) {
      window.alert(String(err?.message ?? err));
    }
  };

  if (!currentRoot) return <div className="p-3 text-sm text-zinc-400">No folder opened</div>;

  if (loading) return <div className="p-3 text-sm text-zinc-400">Loading folder...</div>;
  if (error) return <div className="p-3 text-sm text-red-400">{error}</div>;

  return (
    <div className="p-2 text-sm text-zinc-400 overflow-auto h-full">
      <div className="flex items-center justify-between px-2 py-1 text-xs text-zinc-500">
        <div className="truncate mr-2">{currentRoot}</div>
        <div className="flex gap-1">
          <button className="px-2 py-0.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700" onClick={() => goUp()}>Up</button>
          <button className="px-2 py-0.5 text-xs rounded bg-emerald-700/10 hover:bg-emerald-700/20" onClick={() => createNew(false)}>New File</button>
          <button className="px-2 py-0.5 text-xs rounded bg-emerald-700/10 hover:bg-emerald-700/20" onClick={() => createNew(true)}>New Folder</button>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        {entries.map((e) => (
          <div
            key={e.path}
            className="px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer flex items-center justify-between"
          >
            <div
              className="truncate flex-1"
              onClick={() => {
                if (e.isDir) {
                  setCurrentRoot(e.path);
                  return;
                }
                onOpenFile?.(e.path);
              }}
            >
              {e.name}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-zinc-600">{e.isDir ? 'dir' : 'file'}</div>
              <button
                className="text-xs text-red-500 hover:underline"
                onClick={() => removeEntry(e.path, e.isDir)}
                title="Delete"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
