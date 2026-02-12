import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowUp,
  ChevronRight,
  ChevronDown,
  Undo2,
  Plus,
  Laptop,
  GitBranch,
  Lock,
  Mic,
  Brain,
  FileText,
  MessageSquare,
  Network
} from 'lucide-react';
import { FileChange } from '../../types/ui';
import { MOCK_FILE_CHANGES, MOCK_PROJECTS } from '../../data/mockData';

interface ChatPanelProps {
  isNewThread?: boolean;
}

const ChangeFileItem: React.FC<{ change: FileChange }> = ({ change }) => (
  <div className="flex items-center justify-between py-1.5 px-2 hover:bg-[#18181b] rounded cursor-pointer group">
    <div className="flex items-center gap-2 overflow-hidden">
      <span className="text-xs text-zinc-500 font-mono group-hover:text-zinc-300 truncate max-w-[200px]">{change.path}</span>
    </div>
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className="text-emerald-500">+{change.additions}</span>
      <span className="text-rose-500">-{change.deletions}</span>
    </div>
  </div>
);

export const ChatPanel: React.FC<ChatPanelProps> = ({ isNewThread = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextTriggerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'Agent' | 'Plan' | 'Ask'>('Agent');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);

  const [environment, setEnvironment] = useState<'Local' | 'Worktree'>('Local');
  const [isEnvDropdownOpen, setIsEnvDropdownOpen] = useState(false);

  const [branch, setBranch] = useState('main');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const [selectedProject, setSelectedProject] = useState(MOCK_PROJECTS[0].name);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const [isContextLocked, setIsContextLocked] = useState(false);
  const [isContextHovered, setIsContextHovered] = useState(false);
  const showContextInfo = isContextLocked || isContextHovered;

  const changes = MOCK_FILE_CHANGES;

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
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(64, textarea.scrollHeight), 320); // Min 64px (h-16), Max 320px
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = newHeight >= 320 ? 'auto' : 'hidden';
    }
  };

  const modes = [
    { label: 'Agent', icon: Brain },
    { label: 'Plan', icon: FileText },
    { label: 'Ask', icon: MessageSquare },
  ] as const;

  const currentMode = modes.find(m => m.label === mode) || modes[0];
  const CurrentIcon = currentMode.icon;

  const branches = ['main', 'testing', 'patch11'];
  const environments = ['Local', 'Worktree'];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] min-w-0">
      {/* Header (Breadcrumb-ish) - Only show if not new thread */}
      {!isNewThread && (
        <div className="h-12 border-b border-[#27272a] flex items-center px-4 gap-2 text-sm text-zinc-400">
          <span className="text-white font-medium truncate">Polish app for launch prep</span>
          <span className="text-zinc-600">/</span>
          <span className="truncate">photobooth</span>
          <span className="ml-auto text-xs text-zinc-600">...</span>
        </div>
      )}

      {/* Chat Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {isNewThread ? (
          <div className="h-full flex flex-col items-center justify-center pb-20 relative overflow-hidden">
            {/* Ambient Glow Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />

            <div className="flex items-end mb-10 select-none relative z-10">
              <div className="w-[54px] h-[76px] relative text-white -mr-1.5 mb-1">
                <svg viewBox="0 0 160 224" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <style>{`...`}</style>
                  <path d="M159.989 138.091C159.989 155.58 156.831 170.693 150.516 183.432C144.2 196.17 135.537 205.994 124.526 212.903C113.514 219.812 100.938 223.267 86.7955 223.267C72.6534 223.267 60.0767 219.812 49.0653 212.903C38.054 205.994 29.3906 196.17 23.0753 183.432C16.7599 170.693 13.6023 155.58 13.6023 138.091C13.6023 120.602 16.7599 105.489 23.0753 92.75C29.3906 80.0114 38.054 70.1875 49.0653 63.2784C60.0767 56.3693 72.6534 52.9148 86.7955 52.9148C100.938 52.9148 113.514 56.3693 124.526 63.2784C135.537 70.1875 144.2 80.0114 150.516 92.75C156.831 105.489 159.989 120.602 159.989 138.091C159.989 152.449 156.831 164.567 150.516 174.445C144.2 184.322 135.537 191.798 124.526 196.872C113.514 201.946 100.938 204.483 86.7955 204.483C72.6534 204.483 60.0767 201.946 49.0653 196.872C38.054 191.798 29.3906 184.322 23.0753 174.445C16.7599 164.567 13.6023 152.449 13.6023 138.091ZM140.557 138.091C140.557 123.733 138.155 111.615 133.351 101.737C128.601 91.8594 122.151 84.3835 114 79.3097C105.903 74.2358 96.8352 71.6989 86.7955 71.6989C76.7557 71.6989 67.6605 74.2358 59.5099 79.3097C51.4134 84.3835 44.9631 91.8594 40.1591 101.737C35.4091 111.615 33.0341 123.733 33.0341 138.091C33.0341 152.449 35.4091 164.567 40.1591 174.445C44.9631 184.322 51.4134 191.798 59.5099 196.872C67.6605 201.946 76.7557 204.483 86.7955 204.483C96.8352 204.483 105.903 201.946 114 196.872C122.151 191.798 128.601 184.322 133.351 174.445C138.155 164.567 140.557 152.449 140.557 138.091Z" fill="currentColor" />
                </svg>
              </div>
              <span className="text-[72px] font-semibold text-white tracking-tighter leading-[0.8]">mit</span>
            </div>

            <div className="relative z-20">
              <div
                className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#121212] border border-[#27272a] hover:border-zinc-600 hover:bg-[#18181b] transition-all cursor-pointer text-zinc-300 hover:text-white group shadow-xl"
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              >
                <span className="text-xl font-medium tracking-tight">{selectedProject}</span>
                <ChevronDown size={16} className="text-zinc-500 group-hover:text-zinc-300 transition-colors ml-1" />
              </div>

              {isProjectDropdownOpen && (
                <>
                  <div className="fixed inset-0" onClick={() => setIsProjectDropdownOpen(false)} />
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-[#121212] border border-[#27272a] rounded-lg shadow-2xl py-1 flex flex-col overflow-hidden z-30">
                    {MOCK_PROJECTS.map(p => (
                      <div
                        key={p.name}
                        className="px-4 py-2 hover:bg-[#1f1f22] cursor-pointer text-zinc-400 hover:text-zinc-100 transition-colors flex items-center justify-between"
                        onClick={() => {
                          setSelectedProject(p.name);
                          setIsProjectDropdownOpen(false);
                        }}
                      >
                        <span>{p.name}</span>
                        {selectedProject === p.name && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* History Items */}
            <div className="space-y-1 pl-2">
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span className="text-zinc-600">Edited SnapButton.tsx</span>
                <span className="text-emerald-500 text-xs">+17 -19</span>
                <ChevronRight size={12} />
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span className="text-zinc-600">Edited PhotoStrip.tsx</span>
                <span className="text-emerald-500 text-xs">+22 -2</span>
                <ChevronRight size={12} />
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span className="text-zinc-600">Edited PreviewPolaroid.tsx</span>
                <span className="text-emerald-500 text-xs">+6 -2</span>
                <ChevronRight size={12} />
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span className="text-zinc-600">Edited PromptDialog.tsx</span>
                <span className="text-emerald-500 text-xs">+6 -1</span>
                <ChevronRight size={12} />
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span className="text-zinc-600">Ran git status</span>
                <span className="text-zinc-600 text-xs opacity-50">-sb</span>
                <ChevronRight size={12} />
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span className="text-zinc-600">Explored 1 list</span>
                <ChevronRight size={12} />
              </div>
            </div>

            {/* AI Message Block */}
            <div className="flex flex-col gap-2">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Polished the UI with new launch ready typography, metadata, and clearer guidance across the booth, prompt dialog, and archive so the experience feels intentional and production-ready.
              </p>

              <div className="text-sm text-zinc-300 mt-2">
                <p className="font-medium mb-2 text-zinc-400">Changes:</p>
                <ul className="list-disc list-inside space-y-1 text-zinc-400 marker:text-zinc-600">
                  <li><span className="font-mono text-zinc-300 text-xs">layout.tsx</span> set launch metadata and swapped to Bebas Neue + Sors for a stronger visual system.</li>
                  <li><span className="font-mono text-zinc-300 text-xs">globals.css</span> aligned base colors/selection, added <span className="font-mono text-xs bg-zinc-800 px-1 rounded">.font-display</span>, and reduced-motion safeguards.</li>
                  <li><span className="font-mono text-zinc-300 text-xs">page.tsx</span> upgraded the hero with a clear value prop + feature chips and added a Snap helper line.</li>
                  <li><span className="font-mono text-zinc-300 text-xs">PhotoStrip.tsx</span> added a "Session Archive" header, shot count badge, and a clearer empty state.</li>
                  <li><span className="font-mono text-zinc-300 text-xs">PromptDialog.tsx</span> added a prompt tip + character limit indicator and made errors <span className="font-mono text-xs bg-zinc-800 px-1 rounded">role="alert"</span>.</li>
                  <li><span className="font-mono text-zinc-300 text-xs">ShutterStatusOverlay.tsx</span> and PreviewPolaroid.tsx now guide first-time users.</li>
                  <li><span className="font-mono text-zinc-300 text-xs">CaptionCard.tsx</span> got a label for readability.</li>
                  <li><span className="font-mono text-zinc-300 text-xs">SnapButton.tsx</span> now returns only the button so the page controls surrounding copy.</li>
                </ul>
              </div>

              <div className="text-sm text-zinc-400 mt-2">
                <p className="mb-1">Tests not run (per instructions).</p>
              </div>

              <div className="text-sm text-zinc-400 mt-2">
                <p className="font-medium mb-1 text-zinc-500 text-xs uppercase">Next steps (optional):</p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-xs">
                  <li><span className="font-mono bg-zinc-800 px-1 rounded">npm run dev</span> to review the polish in browser.</li>
                  <li>I can add a share/download action or an OG image if you want extra launch touches.</li>
                </ol>
              </div>
            </div>

            {/* Change Summary Card */}
            <div className="border border-[#27272a] rounded-lg bg-[#121212] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a] bg-[#18181b]">
                <span className="text-xs font-medium text-zinc-400">8 files changed <span className="text-emerald-500">+158</span> <span className="text-rose-500">-54</span></span>
                <div className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">
                  <Undo2 size={12} />
                  <span>Undo</span>
                </div>
              </div>
              <div className="py-1">
                {changes.map((c, i) => <ChangeFileItem key={i} change={c} />)}
              </div>
            </div>

            <div className="h-12"></div> {/* Spacer */}
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#27272a] bg-[#0a0a0a]">
        {/* Input Container */}
        <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-2.5 shadow-sm focus-within:border-zinc-700 transition-colors">

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            onInput={handleInput}
            placeholder={isNewThread ? 'What do you want to build?' : 'Ask for follow-up changes'}
            className="w-full bg-transparent border-none text-sm text-zinc-200 focus:outline-none placeholder:text-zinc-600 resize-none min-h-[64px] px-2 py-1 overflow-hidden"
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between mt-2 pl-1 pr-1">

            {/* Left: Plus & Model Selector */}
            <div className="flex items-center gap-3">
              <div className="text-zinc-500 cursor-pointer hover:text-zinc-300">
                <Plus size={18} />
              </div>

              {/* Mode Dropdown */}
              <div className="relative">
                <div
                  className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-[#1f1f22] py-1 px-1.5 rounded-md transition-colors select-none"
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                >
                  <CurrentIcon size={14} className="text-zinc-400" />
                  <span className="font-medium text-zinc-200">{mode}</span>
                  <ChevronDown size={12} className="text-zinc-500" />
                </div>

                {isModeDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsModeDropdownOpen(false)} />
                    <div className="absolute bottom-full mb-1 left-0 w-32 bg-[#18181b] border border-[#27272a] rounded-md shadow-xl py-1 z-20 flex flex-col">
                      {modes.map((m) => (
                        <div
                          key={m.label}
                          className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-[#27272a] cursor-pointer text-zinc-300"
                          onClick={() => {
                            setMode(m.label as any);
                            setIsModeDropdownOpen(false);
                          }}
                        >
                          <m.icon size={14} className={mode === m.label ? 'text-zinc-200' : 'text-zinc-500'} />
                          <span>{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="h-4 w-[1px] bg-zinc-800 mx-1"></div>

              <div className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-[#1f1f22] py-1 px-1.5 rounded-md transition-colors">
                <span className="font-medium text-zinc-200">GPT-5.2-Codex</span>
                <span className="text-zinc-500">Extra High</span>
                <ChevronDown size={12} className="text-zinc-500" />
              </div>
            </div>

            {/* Right: Icons & Send */}
            <div className="flex items-center gap-3">
              <Lock size={14} className="text-zinc-500 hover:text-zinc-300 cursor-pointer" />
              <Mic size={14} className="text-zinc-500 hover:text-zinc-300 cursor-pointer" />

              {/* Send Button */}
              <div className="w-7 h-7 bg-zinc-400 hover:bg-zinc-200 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-sm ml-1">
                <ArrowUp size={16} className="text-black" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="flex justify-between items-center mt-3 px-1 text-xs relative z-10">
          {/* Left: Local/Worktree Dropdown */}
          <div className="relative">
            <div
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors select-none"
              onClick={() => setIsEnvDropdownOpen(!isEnvDropdownOpen)}
            >
              {environment === 'Local' ? <Laptop size={14} /> : <Network size={14} />}
              <span className="font-medium">{environment}</span>
              <ChevronDown size={12} className="opacity-70" />
            </div>

            {isEnvDropdownOpen && (
              <>
                <div className="fixed inset-0 z-0" onClick={() => setIsEnvDropdownOpen(false)} />
                <div className="absolute bottom-full mb-2 left-0 w-32 bg-[#18181b] border border-[#27272a] rounded-md shadow-xl py-1 z-20 flex flex-col">
                  {environments.map((env) => (
                    <div
                      key={env}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#27272a] cursor-pointer text-zinc-300"
                      onClick={() => {
                        setEnvironment(env as any);
                        setIsEnvDropdownOpen(false);
                      }}
                    >
                      {env === 'Local' ? <Laptop size={14} className={environment === env ? 'text-zinc-200' : 'text-zinc-500'} /> : <Network size={14} className={environment === env ? 'text-zinc-200' : 'text-zinc-500'} />}
                      <span className={environment === env ? 'text-white font-medium' : 'text-zinc-400'}>{env}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: Branch & Status */}
          <div className="flex items-center gap-4 text-zinc-400">
            <div className="relative">
              <div
                className="flex items-center gap-1.5 hover:text-zinc-200 cursor-pointer transition-colors select-none"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              >
                <GitBranch size={14} />
                <span className="font-medium">{branch}</span>
                <ChevronDown size={12} className="opacity-70" />
              </div>

              {isBranchDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-0" onClick={() => setIsBranchDropdownOpen(false)} />
                  <div className="absolute bottom-full mb-2 right-0 w-32 bg-[#18181b] border border-[#27272a] rounded-md shadow-xl py-1 z-20 flex flex-col">
                    {branches.map((b) => (
                      <div
                        key={b}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#27272a] cursor-pointer text-zinc-300"
                        onClick={() => {
                          setBranch(b);
                          setIsBranchDropdownOpen(false);
                        }}
                      >
                        <span className={branch === b ? 'text-white font-medium' : 'text-zinc-400'}>{b}</span>
                      </div>
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
              {/* Context Info Popover */}
              {showContextInfo && (
                <div
                  className="absolute bottom-full mb-3 right-0 w-64 bg-[#121212] border border-[#27272a] rounded-lg shadow-xl p-3 z-30 cursor-default animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3">
                    <h3 className="text-xs font-semibold text-zinc-300 mb-1">Context Window</h3>
                    <div className="text-[11px] text-zinc-500 flex justify-between mb-1.5">
                      <span>10.9K / 200K tokens</span>
                      <span>5%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1 w-full bg-[#27272a] rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-500 w-[5%]" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-[11px] font-semibold text-zinc-400 mb-1.5">System</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-zinc-500">
                          <span>System Instructions</span>
                          <span>1.0%</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-zinc-500">
                          <span>Tool Definitions</span>
                          <span>4.0%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-semibold text-zinc-400 mb-1.5">User Context</h4>
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>Messages</span>
                        <span>0.4%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Circular Progress */}
              <div className="w-3.5 h-3.5 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="#27272a" strokeWidth="4" />
                  <circle cx="12" cy="12" r="10" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="62.83" strokeDashoffset="59.69" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-medium group-hover:text-zinc-200 transition-colors">5%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};