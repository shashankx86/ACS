import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FileDiff } from '../../types/ui';
import { highlightCode } from '../../lib/syntax';

interface CodeDiffProps {
  file: FileDiff;
  defaultExpanded?: boolean;
  wrap?: boolean;
}

export const CodeDiff: React.FC<CodeDiffProps> = ({ file, defaultExpanded = true, wrap = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const additions = file.lines.filter(l => l.type === 'add').length;
  const deletions = file.lines.filter(l => l.type === 'remove').length;

  return (
    <div className="mb-2 rounded-md border border-[#27272a] bg-[#0c0c0c] flex flex-col overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-[#18181b] border-b border-[#27272a] cursor-pointer hover:bg-[#202022] select-none group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <span className="font-mono text-xs font-medium">{file.path}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          {additions > 0 && <span className="text-emerald-500">+{additions}</span>}
          {deletions > 0 && <span className="text-rose-500">-{deletions}</span>}
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className={`${!wrap ? 'overflow-x-auto' : 'overflow-hidden'}`}>
          <div className={`font-mono text-[11px] leading-[18px] py-0.5 ${wrap ? 'w-full' : 'w-max min-w-full'}`}>
            {file.lines.map((line, idx) => (
              <div
                key={idx}
                className={`flex ${
                  line.type === 'add' ? 'bg-emerald-500/20' :
                    line.type === 'remove' ? 'bg-rose-500/20' : 'bg-transparent'
                }`}
              >
                {/* Line Number */}
                <div className={`w-10 flex-shrink-0 text-right pr-3 select-none border-r border-[#27272a] bg-[#0c0c0c] text-[10px] leading-[18px] ${
                  line.type === 'add' ? 'text-emerald-500' :
                    line.type === 'remove' ? 'text-rose-500' : 'text-zinc-700'
                } ${!wrap ? 'sticky left-0 z-10' : ''}`}>
                  {line.lineNum}
                </div>

                {/* Code Content */}
                <div className={`pl-3 ${wrap ? 'whitespace-pre-wrap break-all w-full' : 'whitespace-pre pr-4'}`}>
                  {highlightCode(line.content)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
