import React, { useState } from 'react';
import {
  Folder,
  Search,
  Filter,
  Plus,
  Database,
  Settings
} from 'lucide-react';
import { Project } from '../types';
import { MOCK_PROJECTS } from '../data/mockData';

interface SidebarProps {
  width: number;
  onNewThread: () => void;
}

const SidebarItem: React.FC<{ icon?: React.ReactNode; label: string; active?: boolean; badge?: string; onClick?: () => void }> = ({ icon, label, active, badge, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center justify-between px-3 py-1.5 rounded-md text-sm cursor-pointer group transition-colors ${active ? 'bg-[#27272a] text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'}`}
  >
    <div className="flex items-center gap-2.5 overflow-hidden">
      {icon && (
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
          {icon}
        </div>
      )}
      <span className="truncate">{label}</span>
    </div>
    {badge && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">{badge}</span>}
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({ width, onNewThread }) => {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);

  const toggleProject = (name: string) => {
    setProjects(projects.map(p => p.name === name ? { ...p, isOpen: !p.isOpen } : p));
  };

  return (
    <div style={{ width }} className="flex-shrink-0 flex flex-col h-full border-r border-[#27272a] bg-[#0a0a0a]">
      {/* Action Buttons */}
      <div className="p-3 space-y-1">
        <SidebarItem icon={<Plus size={14} />} label="New Thread" onClick={onNewThread} />
        <SidebarItem icon={<Database size={14} />} label="Skills" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 select-none group">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider group-hover:text-zinc-400 transition-colors cursor-pointer">Workspace</span>
        <div className="flex items-center gap-2 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <Search size={12} className="hover:text-zinc-300 cursor-pointer" />
          <Filter size={12} className="hover:text-zinc-300 cursor-pointer" />
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {projects.map(project => (
          <div key={project.name} className="mb-1">
            {/* Project Folder Header */}
            <div
              className="group flex items-center justify-between px-3 py-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none rounded-md hover:bg-[#18181b]/50 transition-colors"
              onClick={() => toggleProject(project.name)}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <Folder size={14} className={`text-zinc-600 group-hover:text-zinc-400 transition-colors`} />
                </div>
                <span className="text-sm font-medium">{project.name}</span>
              </div>
            </div>

            {/* Threads */}
            {project.isOpen && (
              <div className="ml-1 mt-0.5 space-y-0.5">
                {project.threads.map(thread => (
                  <div
                    key={thread.id}
                    className={`relative flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer text-[13px] group transition-all duration-200 ${
                      thread.active
                        ? 'bg-[#18181b] text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#18181b]/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {thread.status === 'loading' ? (
                          <div className="w-3 h-3 rounded-full border border-zinc-600 border-t-zinc-400 animate-spin" />
                        ) : (
                          <div className={`w-1.5 h-1.5 rounded-full ${thread.active ? 'bg-white' : 'bg-zinc-600 group-hover:bg-zinc-500'}`} />
                        )}
                      </div>
                      <span className="truncate">{thread.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-600 flex-shrink-0">
                      {thread.meta && <span className="opacity-60 hidden group-hover:block transition-opacity text-emerald-500/80">{thread.meta}</span>}
                      <span className={thread.active ? 'text-zinc-500' : ''}>{thread.time}</span>
                    </div>
                  </div>
                ))}
                {project.name === 'shoo' && (
                  <div className="relative flex items-center px-3 py-1.5 rounded-md cursor-pointer text-[13px] text-zinc-600 hover:text-zinc-300 hover:bg-[#18181b]/40 transition-all duration-200 group">
                    <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                      <div className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Show more</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer User Profile */}
      <div className="p-3 border-t border-[#27272a] mt-auto">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[#18181b] cursor-pointer text-zinc-400 hover:text-zinc-200 transition-colors group">
          <Settings size={18} />
          <span className="text-sm font-medium truncate group-hover:text-white">Settings</span>
        </div>
      </div>
    </div>
  );
};
