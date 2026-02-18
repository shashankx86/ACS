import React from 'react';
import { ChevronDown, FileDiff } from 'lucide-react';

interface ChangesPanelProps {
  width: number;
}

export const ChangesPanel: React.FC<ChangesPanelProps> = ({ width }) => {
  return (
    <div style={{ width }} className="flex-shrink-0 flex flex-col h-full border-l border-[#27272a] bg-[#0a0a0a]">
      <div className="h-12 border-b border-[#27272a] flex items-center justify-between px-3 bg-[#0a0a0a]">
        <div className="flex items-center gap-2 group cursor-default">
          <span className="text-sm font-medium text-white">Changes</span>
          <ChevronDown size={14} className="text-zinc-500" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-[280px]">
          <div className="mx-auto mb-3 w-9 h-9 rounded-md border border-[#2b2b2f] bg-[#111112] flex items-center justify-center text-zinc-500">
            <FileDiff size={16} />
          </div>
          <p className="text-sm text-zinc-300">No changes to display</p>
          <p className="mt-1 text-xs text-zinc-500">Edits from the agent will appear here.</p>
        </div>
      </div>
    </div>
  );
};
