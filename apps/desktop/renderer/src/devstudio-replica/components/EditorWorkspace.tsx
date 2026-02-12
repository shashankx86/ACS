import React, { useState } from 'react';
import { FileExplorer } from './FileExplorer';
import { X, Split, MoreHorizontal, ChevronRight } from 'lucide-react';
import { highlightCode } from '../utils/syntax';

const MOCK_CODE = `import React from 'react';

export default function Page() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="p-4 border-b border-zinc-800">
        <h1>DevStudio</h1>
      </header>
      <main className="p-8">
        <p>Welcome to the editor workspace.</p>
      </main>
    </div>
  );
}`;

export const EditorWorkspace: React.FC = () => {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-[#1e1e1e]">
      {/* Sidebar */}
      <div style={{ width: sidebarWidth }} className="flex-shrink-0 h-full">
        {/* @ts-ignore */}
        <FileExplorer />
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
              <span>page.tsx</span>
            </div>
            <X size={12} className="opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded" />
          </div>
          <div className="flex items-center h-full px-3 py-1 bg-transparent text-zinc-500 hover:text-zinc-300 text-xs min-w-[120px] justify-between group cursor-pointer border-r border-[#27272a]">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">TS</span>
              <span>layout.tsx</span>
            </div>
            <X size={12} className="opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded" />
          </div>
          {/* Tab Actions */}
          <div className="ml-auto flex items-center gap-2 px-2 text-zinc-500">
            <Split size={14} className="hover:text-zinc-300 cursor-pointer" />
            <MoreHorizontal size={14} className="hover:text-zinc-300 cursor-pointer" />
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="h-6 flex items-center px-4 text-xs text-zinc-500 gap-1.5 bg-[#0c0c0c] border-b border-transparent">
          <span>app</span>
          <ChevronRight size={10} />
          <span>page.tsx</span>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto font-mono text-[13px] leading-6">
          <div className="flex">
            {/* Line Numbers */}
            <div className="flex flex-col text-right pr-4 pl-2 select-none text-zinc-600 bg-[#0c0c0c] min-h-full">
              {MOCK_CODE.split('\n').map((_, i) => (
                <div key={i} className="h-6 w-8">{i + 1}</div>
              ))}
            </div>
            {/* Code */}
            <div className="flex-1 pl-2">
              {MOCK_CODE.split('\n').map((line, i) => (
                <div key={i} className="h-6 whitespace-pre">
                  {highlightCode(line)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
