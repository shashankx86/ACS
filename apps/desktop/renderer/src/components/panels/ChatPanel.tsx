import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  Brain,
  Check,
  ChevronDown,
  FileText,
  FolderPlus,
  GitBranch,
  Laptop,
  Lock,
  MessageSquare,
  Mic,
  Network,
  Plus,
  Sparkles,
} from 'lucide-react';

interface ChatPanelProps {
  isNewThread?: boolean;
}

const pathLabel = (value: string) => value.split(/[\\/]/).filter(Boolean).pop() || value;

const resolveProjectNames = (): string[] => {
  const openPaths = (window as any).omt?.app?.getOpenPaths?.() as string[] | undefined;
  if (!openPaths || openPaths.length === 0) {
    return ['Project'];
  }

  return Array.from(
    new Set(
      openPaths
        .map(pathLabel)
        .map((name) => name.trim())
        .filter(Boolean)
    )
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ isNewThread = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextTriggerRef = useRef<HTMLDivElement>(null);

  const initialProjects = useMemo(() => resolveProjectNames(), []);
  const [projects, setProjects] = useState<string[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState(initialProjects[0] || 'Project');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const [mode, setMode] = useState<'Agent' | 'Plan' | 'Ask'>('Agent');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [environment, setEnvironment] = useState<'Local' | 'Worktree'>('Local');
  const [isEnvDropdownOpen, setIsEnvDropdownOpen] = useState(false);
  const [branch, setBranch] = useState('main');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isContextLocked, setIsContextLocked] = useState(false);
  const [isContextHovered, setIsContextHovered] = useState(false);

  const [input, setInput] = useState('');

  const modes = [
    { label: 'Agent', icon: Brain },
    { label: 'Plan', icon: FileText },
    { label: 'Ask', icon: MessageSquare },
  ] as const;

  const currentMode = modes.find((item) => item.label === mode) || modes[0];
  const CurrentModeIcon = currentMode.icon;
  const showContextInfo = isContextLocked || isContextHovered;

  const contextLimitTokens = 200_000;
  const estimatedTokens = Math.round(input.trim().length / 4);
  const usedTokens = Math.min(contextLimitTokens, Math.max(0, estimatedTokens));
  const contextPercent = Math.max(0, Math.min(100, Math.round((usedTokens / contextLimitTokens) * 100)));
  const circleCircumference = 62.83;
  const circleDashOffset = circleCircumference * (1 - contextPercent / 100);

  const environments = ['Local', 'Worktree'] as const;
  const branches = useMemo(() => Array.from(new Set(['main', branch])), [branch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextTriggerRef.current && !contextTriggerRef.current.contains(event.target as Node)) {
        setIsContextLocked(false);
      }
    };

    if (isContextLocked) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isContextLocked]);

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(64, textarea.scrollHeight), 320);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = newHeight >= 320 ? 'auto' : 'hidden';
  };

  const addProject = () => {
    const next = window.prompt('Project name');
    if (!next) {
      return;
    }

    const trimmed = next.trim();
    if (!trimmed) {
      return;
    }

    setProjects((previous) => {
      if (previous.includes(trimmed)) {
        return previous;
      }
      return [...previous, trimmed];
    });
    setSelectedProject(trimmed);
    setIsProjectDropdownOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] min-w-0">
      {!isNewThread && (
        <div className="h-12 border-b border-[#27272a] flex items-center px-4 text-sm text-zinc-500">
          Current Thread
        </div>
      )}

      <div className={`flex-1 overflow-y-auto ${isNewThread ? '' : 'p-4'}`}>
        {isNewThread ? (
          <div className="h-full flex items-center justify-center px-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full border border-[#2e2e34] bg-[#111113] flex items-center justify-center text-zinc-200 mb-5">
                <Sparkles size={18} />
              </div>
              <h1 className="text-[44px] leading-[0.95] tracking-tight font-medium text-zinc-100">Let&apos;s build</h1>

              <div className="relative mt-1">
                <button
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="flex items-center gap-1.5 text-[42px] leading-none tracking-tight font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
                  type="button"
                >
                  <span>{selectedProject}</span>
                  <ChevronDown size={22} className={`transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProjectDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsProjectDropdownOpen(false)} />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[320px] bg-[#1a1a1d] border border-[#2b2b31] rounded-xl p-2 shadow-2xl z-30 text-left">
                      <p className="px-2 py-1.5 text-sm text-zinc-500">Select your project</p>

                      <div className="space-y-0.5">
                        {projects.map((project) => (
                          <button
                            key={project}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#232327] text-zinc-200"
                            onClick={() => {
                              setSelectedProject(project);
                              setIsProjectDropdownOpen(false);
                            }}
                            type="button"
                          >
                            <span className="truncate">{project}</span>
                            {selectedProject === project && <Check size={16} className="text-zinc-300" />}
                          </button>
                        ))}
                      </div>

                      <div className="h-px bg-[#2b2b31] my-2" />

                      <button
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-zinc-300 hover:bg-[#232327]"
                        onClick={addProject}
                        type="button"
                      >
                        <FolderPlus size={16} />
                        <span>Add new project</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div className="max-w-[380px]">
              <p className="text-sm text-zinc-300">This thread is empty.</p>
              <p className="mt-1 text-xs text-zinc-500">Ask the agent to inspect, edit, or explain your code.</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#27272a] bg-[#0a0a0a]">
        <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-2.5 shadow-sm focus-within:border-zinc-700 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onInput={handleInput}
            placeholder={isNewThread ? 'What do you want to build?' : 'Ask for follow-up changes'}
            className="w-full bg-transparent border-none text-sm text-zinc-200 focus:outline-none placeholder:text-zinc-600 resize-none min-h-[64px] px-2 py-1 overflow-hidden"
          />

          <div className="flex items-center justify-between mt-2 pl-1 pr-1">
            <div className="flex items-center gap-3">
              <button className="text-zinc-500 cursor-pointer hover:text-zinc-300" type="button" title="Attach context">
                <Plus size={18} />
              </button>

              <div className="relative">
                <button
                  className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-[#1f1f22] py-1 px-1.5 rounded-md transition-colors select-none"
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                  type="button"
                >
                  <CurrentModeIcon size={14} className="text-zinc-400" />
                  <span className="font-medium text-zinc-200">{mode}</span>
                  <ChevronDown size={12} className="text-zinc-500" />
                </button>

                {isModeDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsModeDropdownOpen(false)} />
                    <div className="absolute bottom-full mb-1 left-0 w-32 bg-[#18181b] border border-[#27272a] rounded-md shadow-xl py-1 z-20 flex flex-col">
                      {modes.map((item) => (
                        <button
                          key={item.label}
                          className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-[#27272a] cursor-pointer text-zinc-300 text-left"
                          onClick={() => {
                            setMode(item.label as 'Agent' | 'Plan' | 'Ask');
                            setIsModeDropdownOpen(false);
                          }}
                          type="button"
                        >
                          <item.icon size={14} className={mode === item.label ? 'text-zinc-200' : 'text-zinc-500'} />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="h-4 w-[1px] bg-zinc-800 mx-1" />

              <span className="text-xs text-zinc-500">Agent model</span>
            </div>

            <div className="flex items-center gap-3">
              <Lock size={14} className="text-zinc-500 hover:text-zinc-300 cursor-pointer" />
              <Mic size={14} className="text-zinc-500 hover:text-zinc-300 cursor-pointer" />

              <button
                className="w-7 h-7 bg-zinc-400 hover:bg-zinc-200 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-sm ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                title="Send message"
                disabled={!input.trim()}
              >
                <ArrowUp size={16} className="text-black" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-3 px-1 text-xs relative z-10">
          <div className="relative">
            <button
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors select-none"
              onClick={() => setIsEnvDropdownOpen(!isEnvDropdownOpen)}
              type="button"
            >
              {environment === 'Local' ? <Laptop size={14} /> : <Network size={14} />}
              <span className="font-medium">{environment}</span>
              <ChevronDown size={12} className="opacity-70" />
            </button>

            {isEnvDropdownOpen && (
              <>
                <div className="fixed inset-0 z-0" onClick={() => setIsEnvDropdownOpen(false)} />
                <div className="absolute bottom-full mb-2 left-0 w-36 bg-[#18181b] border border-[#27272a] rounded-md shadow-xl py-1 z-20 flex flex-col">
                  {environments.map((env) => (
                    <button
                      key={env}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#27272a] cursor-pointer text-zinc-300 text-left"
                      onClick={() => {
                        setEnvironment(env);
                        setIsEnvDropdownOpen(false);
                      }}
                      type="button"
                    >
                      {env === 'Local'
                        ? <Laptop size={14} className={environment === env ? 'text-zinc-200' : 'text-zinc-500'} />
                        : <Network size={14} className={environment === env ? 'text-zinc-200' : 'text-zinc-500'} />}
                      <span className={environment === env ? 'text-white font-medium' : 'text-zinc-400'}>{env}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <div className="relative">
              <button
                className="flex items-center gap-1.5 hover:text-zinc-200 cursor-pointer transition-colors select-none"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                type="button"
              >
                <GitBranch size={14} />
                <span className="font-medium">{branch}</span>
                <ChevronDown size={12} className="opacity-70" />
              </button>

              {isBranchDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-0" onClick={() => setIsBranchDropdownOpen(false)} />
                  <div className="absolute bottom-full mb-2 right-0 w-32 bg-[#18181b] border border-[#27272a] rounded-md shadow-xl py-1 z-20 flex flex-col">
                    {branches.map((item) => (
                      <button
                        key={item}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#27272a] cursor-pointer text-zinc-300 text-left"
                        onClick={() => {
                          setBranch(item);
                          setIsBranchDropdownOpen(false);
                        }}
                        type="button"
                      >
                        <span className={branch === item ? 'text-white font-medium' : 'text-zinc-400'}>{item}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div
              ref={contextTriggerRef}
              className="flex items-center gap-1.5 relative cursor-pointer group"
              onMouseEnter={() => setIsContextHovered(true)}
              onMouseLeave={() => setIsContextHovered(false)}
              onClick={() => setIsContextLocked(!isContextLocked)}
            >
              {showContextInfo && (
                <div
                  className="absolute bottom-full mb-3 right-0 w-64 bg-[#121212] border border-[#27272a] rounded-lg shadow-xl p-3 z-30 cursor-default animate-in fade-in zoom-in-95 duration-100"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mb-3">
                    <h3 className="text-xs font-semibold text-zinc-300 mb-1">Context Window</h3>
                    <div className="text-[11px] text-zinc-500 flex justify-between mb-1.5">
                      <span>{usedTokens.toLocaleString()} / {contextLimitTokens.toLocaleString()} tokens</span>
                      <span>{contextPercent}%</span>
                    </div>
                    <div className="h-1 w-full bg-[#27272a] rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-500" style={{ width: `${contextPercent}%` }} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-[11px] font-semibold text-zinc-400 mb-1.5">System</h4>
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>Instructions + tools</span>
                        <span>0%</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-semibold text-zinc-400 mb-1.5">User Context</h4>
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>Current draft</span>
                        <span>{contextPercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-3.5 h-3.5 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="#27272a" strokeWidth="4" />
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={circleDashOffset}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="font-medium group-hover:text-zinc-200 transition-colors">{contextPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
