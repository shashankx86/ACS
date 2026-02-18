import React, { useMemo, useState } from 'react';
import {
  Check,
  Clock3,
  Folder,
  FolderGit2,
  GitBranch,
  Link2,
  Plus,
  Star,
  Database,
  Settings,
  ChevronRight,
  FolderPlus,
  SlidersHorizontal,
} from 'lucide-react';
import { workspaceOpen } from '../../lib/serverApi';

interface SidebarProps {
  width: number;
  onNewThread: () => void;
}

type WorkspaceProject = {
  name: string;
  isOpen: boolean;
};

const pathLabel = (value: string) => value.split(/[\\/]/).filter(Boolean).pop() || value;

const resolveProjects = (): WorkspaceProject[] => {
  const openPaths = (window as any).omt?.app?.getOpenPaths?.() as string[] | undefined;
  if (!openPaths || openPaths.length === 0) {
    return [];
  }

  const names = Array.from(
    new Set(
      openPaths
        .map(pathLabel)
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );

  return names.map((name, index) => ({
    name,
    isOpen: index === 0,
  }));
};

const SidebarItem: React.FC<{ icon?: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer group transition-colors text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]"
    type="button"
  >
    <span className="flex items-center gap-2.5 overflow-hidden">
      {icon && (
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
          {icon}
        </span>
      )}
      <span className="truncate">{label}</span>
    </span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ width, onNewThread }) => {
  const initialProjects = useMemo(() => resolveProjects(), []);
  const [projects, setProjects] = useState<WorkspaceProject[]>(initialProjects);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [organizeBy, setOrganizeBy] = useState<'project' | 'chronological'>('project');
  const [sortBy, setSortBy] = useState<'created' | 'updated'>('updated');
  const [showBy, setShowBy] = useState<'all' | 'relevant'>('all');

  const toggleProject = (name: string) => {
    setProjects((previous) => previous.map((project) => (
      project.name === name ? { ...project, isOpen: !project.isOpen } : project
    )));
  };

  const handleAddProject = async () => {
    const folderPath = await (window as any).omt?.dialog?.openFolder?.();
    if (!folderPath || typeof folderPath !== 'string') {
      return;
    }

    const name = pathLabel(folderPath).trim();
    if (!name) {
      return;
    }

    setProjects((previous) => {
      if (previous.some((project) => project.name === name)) {
        return previous.map((project) => (
          project.name === name ? { ...project, isOpen: true } : project
        ));
      }
      return [...previous, { name, isOpen: true }];
    });

    try {
      await workspaceOpen([folderPath]);
    } catch {
      // best-effort backend sync
    }
  };

  return (
    <div style={{ width }} className="relative flex-shrink-0 flex flex-col h-full border-r border-[#27272a] bg-[#0a0a0a]">
      <div className="p-3 space-y-1">
        <SidebarItem icon={<Plus size={14} />} label="New Thread" onClick={onNewThread} />
        <SidebarItem icon={<Database size={14} />} label="Skills" />
      </div>

      <div className="flex items-center justify-between px-3 py-2 select-none">
        <span className="text-sm font-medium text-zinc-500 tracking-wide">THREADS</span>
        <div className="flex items-center gap-1">
          <button
            className="h-6 w-6 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-[#1c1c1f] transition-colors flex items-center justify-center"
            title="Add new project  Ctrl+O"
            onClick={() => {
              void handleAddProject();
            }}
            type="button"
          >
            <FolderPlus size={14} />
          </button>
          <div className="relative">
            <button
              className={`h-6 w-6 rounded-md transition-colors flex items-center justify-center ${isFilterOpen ? 'bg-[#27272a] text-zinc-200' : 'text-zinc-500 hover:text-zinc-200 hover:bg-[#1c1c1f]'}`}
              title="Filter threads"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              type="button"
            >
              <SlidersHorizontal size={13} />
            </button>

            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-1 z-20 w-[180px] bg-[#18181b] border border-[#27272a] rounded-md shadow-xl py-1">
                <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Organize</div>

                <button
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:bg-[#27272a] transition-colors ${organizeBy === 'project' ? 'bg-[#232327]' : ''}`}
                  onClick={() => setOrganizeBy('project')}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-xs">
                    <FolderGit2 size={13} className="text-zinc-500" />
                    <span>By project</span>
                  </span>
                  {organizeBy === 'project' && <Check size={12} className="text-zinc-300" />}
                </button>

                <button
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:bg-[#27272a] transition-colors ${organizeBy === 'chronological' ? 'bg-[#232327]' : ''}`}
                  onClick={() => setOrganizeBy('chronological')}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-xs">
                    <Clock3 size={13} className="text-zinc-500" />
                    <span>Chronological list</span>
                  </span>
                  {organizeBy === 'chronological' && <Check size={12} className="text-zinc-300" />}
                </button>

                <div className="h-px bg-[#27272a] my-1" />
                <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Sort by</div>

                <button
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:bg-[#27272a] transition-colors ${sortBy === 'created' ? 'bg-[#232327]' : ''}`}
                  onClick={() => setSortBy('created')}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-xs">
                    <GitBranch size={13} className="text-zinc-500" />
                    <span>Created</span>
                  </span>
                  {sortBy === 'created' && <Check size={12} className="text-zinc-300" />}
                </button>

                <button
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:bg-[#27272a] transition-colors ${sortBy === 'updated' ? 'bg-[#232327]' : ''}`}
                  onClick={() => setSortBy('updated')}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-xs">
                    <Clock3 size={13} className="text-zinc-500" />
                    <span>Updated</span>
                  </span>
                  {sortBy === 'updated' && <Check size={12} className="text-zinc-300" />}
                </button>

                <div className="h-px bg-[#27272a] my-1" />
                <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Show</div>

                <button
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:bg-[#27272a] transition-colors ${showBy === 'all' ? 'bg-[#232327]' : ''}`}
                  onClick={() => setShowBy('all')}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-xs">
                    <Link2 size={13} className="text-zinc-500" />
                    <span>All threads</span>
                  </span>
                  {showBy === 'all' && <Check size={12} className="text-zinc-300" />}
                </button>

                <button
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-zinc-300 hover:bg-[#27272a] transition-colors ${showBy === 'relevant' ? 'bg-[#232327]' : ''}`}
                  onClick={() => setShowBy('relevant')}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-xs">
                    <Star size={13} className="text-zinc-500" />
                    <span>Relevant</span>
                  </span>
                  {showBy === 'relevant' && <Check size={12} className="text-zinc-300" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {projects.length === 0 ? (
          <div className="mx-2 mt-2 rounded-md border border-dashed border-[#2e2e33] bg-[#0f0f10] p-3 text-xs text-zinc-500">
            No project folders are open.
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.name} className="mb-1">
              <button
                className="w-full group flex items-center justify-between px-3 py-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none rounded-md hover:bg-[#18181b]/50 transition-colors"
                onClick={() => toggleProject(project.name)}
                type="button"
              >
                <span className="flex items-center gap-2.5 overflow-hidden">
                  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <Folder size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </span>
                  <span className="text-sm font-medium truncate">{project.name}</span>
                </span>
                <ChevronRight
                  size={13}
                  className={`text-zinc-600 transition-transform ${project.isOpen ? 'rotate-90' : ''}`}
                />
              </button>

              {project.isOpen && (
                <div className="ml-8 mt-1 text-[12px] text-zinc-600">No threads</div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-[#27272a] mt-auto">
        <button
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[#18181b] cursor-pointer text-zinc-400 hover:text-zinc-200 transition-colors group"
          type="button"
        >
          <Settings size={18} />
          <span className="text-sm font-medium truncate group-hover:text-white">Settings</span>
        </button>
      </div>
    </div>
  );
};
