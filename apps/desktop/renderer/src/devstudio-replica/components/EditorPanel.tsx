import React, { useState } from 'react';
import {
  ChevronDown,
  WrapText,
  RotateCcw,
  Download
} from 'lucide-react';
import { CodeDiff } from './CodeDiff';
import { MOCK_ROUTE_FILE, MOCK_EFFECTS_FILE, MOCK_TOP_PANEL_FILE } from '../data/mockData';

interface EditorPanelProps {
  width: number;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ width }) => {
  const [wrap, setWrap] = useState(true);

  return (
    <div style={{ width }} className="flex-shrink-0 flex flex-col h-full border-l border-[#27272a] bg-[#0a0a0a]">
      {/* Controls Header */}
      <div className="h-12 border-b border-[#27272a] flex items-center justify-between px-3 bg-[#0a0a0a]">
        {/* Left Side: Context */}
        <div className="flex items-center gap-2 group cursor-pointer">
          <span className="text-sm font-medium text-white group-hover:text-zinc-200">Uncommitted changes</span>
          <ChevronDown size={14} className="text-zinc-500 group-hover:text-zinc-300" />
        </div>

        {/* Right Side: Status & Actions */}
        <div className="flex items-center">
          {/* Git Status */}
          <div className="flex items-center gap-2 mr-3 pr-3 border-r border-zinc-800">
            <div className="flex items-center gap-1 cursor-pointer hover:text-zinc-300 transition-colors">
              <span className="text-xs text-zinc-500">Staged</span>
              <div className="h-4 min-w-[16px] px-1 bg-zinc-800 rounded flex items-center justify-center text-[10px] text-zinc-400">(3)</div>
            </div>
          </div>

          {/* Toolbar Actions */}
          <div className="flex items-center gap-1">
            {/* D Button */}
            <div className="flex items-center gap-1 hover:bg-[#1f1f22] px-2 py-1 rounded cursor-pointer group">
              <span className="font-bold text-[10px] text-zinc-400 group-hover:text-zinc-200">D</span>
              <ChevronDown size={12} className="text-zinc-600 group-hover:text-zinc-400" />
            </div>

            {/* Open Dropdown */}
            <div className="flex items-center gap-1 hover:bg-[#1f1f22] px-2 py-1 rounded cursor-pointer group">
              <span className="text-xs text-zinc-400 group-hover:text-zinc-200">Open</span>
              <ChevronDown size={12} className="text-zinc-600 group-hover:text-zinc-400" />
            </div>

            {/* Commit Button */}
            <div className="flex items-center gap-1 hover:bg-[#1f1f22] px-2 py-1 rounded cursor-pointer group">
              <div className="w-2 h-2 rounded-full border border-zinc-500 group-hover:border-emerald-400 group-hover:bg-emerald-500/20"></div>
              <span className="text-xs text-zinc-400 group-hover:text-zinc-200">Commit</span>
              <ChevronDown size={12} className="text-zinc-600 group-hover:text-zinc-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Code Scroller */}
      <div className="flex-1 overflow-y-auto p-2 bg-[#0a0a0a]">
        <CodeDiff file={MOCK_ROUTE_FILE} wrap={wrap} />
        <CodeDiff file={MOCK_EFFECTS_FILE} wrap={wrap} />
        <CodeDiff file={MOCK_TOP_PANEL_FILE} wrap={wrap} />
      </div>

      {/* Footer Panel */}
      <div className="h-10 border-t border-[#27272a] bg-[#0a0a0a] flex items-center justify-between px-3">
        <div /> {/* Left Spacer */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWrap(!wrap)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${wrap ? 'text-zinc-200 bg-[#27272a]' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Toggle Word Wrap"
            type="button"
          >
            <WrapText size={14} />
            <span>Wrap</span>
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-zinc-500 hover:text-zinc-300 transition-colors" type="button">
            <RotateCcw size={14} />
            <span>Revert</span>
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-zinc-500 hover:text-zinc-300 transition-colors" type="button">
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};
