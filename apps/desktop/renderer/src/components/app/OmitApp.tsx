import React, { useState } from 'react';
import { X, ChevronDown, Check, Plus, Terminal, Brain, FileCode2, Minus, Square } from 'lucide-react';
import { AgentWorkspace } from '../workspaces/AgentWorkspace';
import { TerminalWorkspace } from '../workspaces/TerminalWorkspace';
import { EditorWorkspace } from '../workspaces/EditorWorkspace';

interface Tab {
  id: string;
  title: string;
  type: 'agent' | 'editor' | 'terminal';
  isEditorOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  changeType: string;
  // optional path opened in this tab (file or folder)
  openPath?: string | null;
  // dirty flag for unsaved changes
  isDirty?: boolean;
  // transient UI animation flags
  isEntering?: boolean;
  isClosing?: boolean;
}

import { workspaceOpen } from '../../lib/serverApi';

const pathLabel = (value: string) => value.split(/[\\/]/).filter(Boolean).pop() || value;
const TAB_ANIMATION_MS = 160;

export default function OmitApp() {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Agent', type: 'agent', isEditorOpen: false, leftWidth: 260, rightWidth: 500, changeType: 'All Changes' }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewTabDropdown, setShowNewTabDropdown] = useState(false);

  const animateTabIn = (id: string) => {
    window.setTimeout(() => {
      setTabs((previousTabs) => previousTabs.map((tab) => (
        tab.id === id && tab.isEntering ? { ...tab, isEntering: false } : tab
      )));
    }, 16);
  };

  // On first render, check for any CLI-provided paths and open them
  React.useEffect(() => {
    const api = (window as any).omt?.app;
    if (!api || !api.getOpenPaths) return;

    (async () => {
      try {
        const paths: string[] = api.getOpenPaths() || [];
        if (!paths || paths.length === 0) return;

        // inform backend (best-effort) and then open tabs in the UI
        try {
          await workspaceOpen(paths);
        } catch (err) {
          // backend may not support workspace open yet — ignore and continue
          // we still open paths in the UI.
        }

        let lastId: string | null = null;
        const addedIds: string[] = [];
        setTabs((previous) => {
          const next = [...previous];
          for (const p of paths) {
            const newId = Math.random().toString(36).substr(2, 9);
            lastId = newId;
            addedIds.push(newId);
            next.push({ id: newId, title: pathLabel(p), type: 'editor', isEditorOpen: true, leftWidth: 260, rightWidth: 500, changeType: 'All Changes', openPath: p, isEntering: true });
          }
          return next;
        });

        // activate the last opened path
        if (lastId) setActiveTabId(lastId);
        addedIds.forEach(animateTabIn);
      } catch (_) {
        // ignore
      }
    })();
  }, []);


  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateTab = (id: string, updates: Partial<Tab>) => {
    setTabs((previousTabs) => {
      let changed = false;
      const nextTabs = previousTabs.map((tab) => {
        if (tab.id !== id) {
          return tab;
        }

        const hasDifference = Object.entries(updates).some(([key, value]) => (tab as any)[key] !== value);
        if (!hasDifference) {
          return tab;
        }

        changed = true;
        return { ...tab, ...updates };
      });

      return changed ? nextTabs : previousTabs;
    });
  };

  const updateTabTitle = (id: string, title: string) => {
    setTabs((previousTabs) => previousTabs.map((tab) => {
      if (tab.id !== id) {
        return tab;
      }

      if (tab.title === title) {
        return tab;
      }

      return {
        ...tab,
        title
      };
    }));
  };

  const addTab = (type: 'agent' | 'editor' | 'terminal' = 'agent', openPath?: string | null) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const title = openPath ? pathLabel(openPath) : type === 'agent' ? 'Agent' : type === 'editor' ? 'Editor' : 'Terminal';
    setTabs(prev => [...prev, {
      id: newId,
      title,
      type,
      isEditorOpen: type !== 'agent',
      leftWidth: 260,
      rightWidth: 500,
      changeType: 'All Changes',
      openPath: openPath ?? null,
      isDirty: false,
      isEntering: true
    }]);
    setActiveTabId(newId);
    setShowNewTabDropdown(false);
    animateTabIn(newId);
  };

  const closeTabById = (id: string, closeWindowIfLast = false) => {
    const currentTabs = tabs;
    const closingIndex = currentTabs.findIndex((tab) => tab.id === id);
    if (closingIndex < 0) {
      return;
    }

    const tabToClose = currentTabs[closingIndex];
    if (tabToClose.isClosing) {
      return;
    }

    if (tabToClose.isDirty) {
      const discard = window.confirm('This tab has unsaved changes — close and discard changes?');
      if (!discard) {
        return;
      }
    }

    if (currentTabs.length > 1 && activeTabId === id) {
      const fallbackTabs = currentTabs.filter((tab) => tab.id !== id);
      const fallbackIndex = Math.min(closingIndex, fallbackTabs.length - 1);
      setActiveTabId(fallbackTabs[fallbackIndex].id);
    }

    setTabs((previousTabs) => previousTabs.map((tab) => (
      tab.id === id ? { ...tab, isClosing: true } : tab
    )));

    window.setTimeout(() => {
      setTabs((previousTabs) => {
        const targetIndex = previousTabs.findIndex((tab) => tab.id === id);
        if (targetIndex < 0) {
          return previousTabs;
        }

        if (previousTabs.length === 1) {
          if (closeWindowIfLast) {
            queueMicrotask(() => {
              void handleWindowControl('close');
            });
            return previousTabs;
          }

          const fallbackTab: Tab = {
            id: Math.random().toString(36).substr(2, 9),
            title: 'Agent',
            type: 'agent',
            isEditorOpen: false,
            leftWidth: 260,
            rightWidth: 500,
            changeType: 'All Changes',
            isEntering: true,
          };

          setActiveTabId(fallbackTab.id);
          animateTabIn(fallbackTab.id);
          return [fallbackTab];
        }

        return previousTabs.filter((tab) => tab.id !== id);
      });
    }, TAB_ANIMATION_MS);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeTabById(id);
  };

  const handleWindowControl = async (action: 'minimize' | 'toggleMaximize' | 'close') => {
    const api = (window as any).omt?.window;
    if (!api) {
      return;
    }

    if (action === 'minimize') {
      await api.minimize?.();
      return;
    }

    if (action === 'toggleMaximize') {
      await api.toggleMaximize?.();
      return;
    }

    await api.close?.();
  };

  const changeOptions = [
    'All Changes',
    'Staged Changes',
    'Unstaged Changes',
    'Commits'
  ];

  const getTabIcon = (type: 'agent' | 'editor' | 'terminal', isActive: boolean) => {
    const className = `flex-shrink-0 ${isActive ? 'text-emerald-500' : 'opacity-70'}`;
    switch (type) {
      case 'editor':
        return <FileCode2 size={13} className={className} />;
      case 'terminal':
        return <Terminal size={13} className={className} />;
      case 'agent':
      default:
        return <Brain size={13} className={className} />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0a0a] text-zinc-300 overflow-hidden rounded-[10px] font-sans select-none">
      {/* Top Navigation Bar */}
      {/* Using bg-black for the track to contrast with the active tab which is bg-[#0a0a0a] */}
      <div className="h-10 min-h-[40px] bg-black border-b border-[#27272a] flex items-end relative z-50 pl-2 app-drag">

        {/* Tabs Container - Flex Shrinking */}
        {/* Removed overflow-hidden to allow dropdowns to pop out, relying on min-w-0 for shrinking */}
        <div className="flex-1 flex items-end h-full min-w-0 pr-2">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              title={tab.title}
              className={`
                        group relative flex items-center gap-2 px-3 py-1.5 h-[34px]
                        w-[160px] flex-shrink-0 overflow-hidden
                        text-xs cursor-pointer rounded-t-xl transition-[width,opacity,transform,margin,background-color,border-color,color] duration-200 ease-out mr-1 mb-[-1px] border-t border-x app-no-drag
                        ${tab.isEntering ? 'opacity-0 translate-y-1 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}
                        ${tab.isClosing ? 'opacity-0 -translate-y-1 scale-[0.96] pointer-events-none mr-0' : ''}
                        ${activeTabId === tab.id
                  ? 'bg-[#0a0a0a] border-[#27272a] border-b-[#0a0a0a] text-zinc-200 z-10'
                  : 'bg-transparent border-transparent text-zinc-500 hover:bg-[#18181b] hover:text-zinc-300'
                }
                    `}
              style={{ width: tab.isClosing ? 0 : 160 }}
            >
              {/* Icon */}
              {getTabIcon(tab.type, activeTabId === tab.id)}

              <span className="truncate flex-1 font-medium">{tab.title}{tab.isDirty ? ' *' : ''}</span>

              <div
                onClick={(e) => closeTab(e, tab.id)}
                className={`p-0.5 rounded-sm hover:bg-zinc-700/50 transition-all flex-shrink-0 ${tabs.length === 1 ? 'hidden' : activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <X size={12} />
              </div>
            </div>
          ))}

          {/* New Tab & Menu Buttons */}
          <div className="flex items-center gap-1 h-[34px] px-1 mb-[-1px] flex-shrink-0 relative app-no-drag">
            <button
              onClick={() => addTab('agent')}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b] transition-colors"
              title="New Tab"
              type="button"
            >
              <Plus size={14} />
            </button>
            <div className="w-[1px] h-4 bg-[#27272a] mx-1" />
            <button
              onClick={() => setShowNewTabDropdown(!showNewTabDropdown)}
              className={`p-1.5 rounded-md transition-colors ${showNewTabDropdown ? 'bg-[#18181b] text-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'}`}
              type="button"
            >
              <ChevronDown size={14} />
            </button>

            {/* New Tab Dropdown */}
            {showNewTabDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNewTabDropdown(false)} />
                <div className="absolute top-full left-0 mt-1 w-40 bg-[#18181b] border border-[#27272a] rounded-md shadow-xl py-1 z-50 flex flex-col">
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#27272a] cursor-pointer text-zinc-300 text-left"
                    onClick={() => addTab('agent')}
                    type="button"
                  >
                    <Brain size={14} className="text-zinc-500" />
                    <span>Agent</span>
                  </button>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#27272a] cursor-pointer text-zinc-300 text-left"
                    onClick={() => addTab('editor')}
                    type="button"
                  >
                    <FileCode2 size={14} className="text-zinc-500" />
                    <span>Editor</span>
                  </button>
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#27272a] cursor-pointer text-zinc-300 text-left"
                    onClick={() => addTab('terminal')}
                    type="button"
                  >
                    <Terminal size={14} className="text-zinc-500" />
                    <span>Terminal</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Controls (Fixed position in flex layout now) */}
        <div className="flex-shrink-0 flex items-center h-full pl-2 pr-4 gap-4 bg-black z-20 app-no-drag">
          {/* Changes Toggle - Only show if current tab is AGENT type */}
          {activeTab.type === 'agent' && (
            <div className="flex items-center h-5 relative border-r border-[#27272a] pr-4">
              <div className={`flex items-center rounded-sm transition-colors ${activeTab.isEditorOpen ? 'bg-[#27272a] text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#18181b]'}`}>
                <button
                  onClick={() => updateTab(activeTabId, { isEditorOpen: !activeTab.isEditorOpen })}
                  className="px-2 py-0.5 text-[11px] font-medium border-r border-transparent"
                  title={activeTab.isEditorOpen ? 'Close Changes' : 'Open Changes'}
                  type="button"
                >
                  Changes
                </button>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="pl-0.5 pr-1 py-0.5 cursor-pointer flex items-center hover:bg-white/5 rounded-r-sm"
                  type="button"
                >
                  <ChevronDown size={10} />
                </button>
              </div>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute top-7 right-4 w-48 bg-[#18181b] border border-[#27272a] rounded-md shadow-xl py-1 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    View Options
                  </div>
                  {changeOptions.map((opt) => (
                    <div
                      key={opt}
                      className="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-[#27272a] cursor-pointer text-zinc-300"
                      onClick={() => {
                        updateTab(activeTabId, { changeType: opt, isEditorOpen: true });
                        setShowDropdown(false);
                      }}
                    >
                      <span>{opt}</span>
                      {activeTab.changeType === opt && <Check size={12} className="text-emerald-400" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Window Controls */}
          <div className="flex items-center gap-0.5">
            <button
              className="h-7 w-7 hover:bg-[#18181b] rounded-sm cursor-pointer flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
              onClick={() => {
                void handleWindowControl('minimize');
              }}
              type="button"
              aria-label="Minimize window"
              title="Minimize"
            >
              <Minus size={12} strokeWidth={2.2} />
            </button>
            <button
              className="h-7 w-7 hover:bg-[#18181b] rounded-sm cursor-pointer flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
              onClick={() => {
                void handleWindowControl('toggleMaximize');
              }}
              type="button"
              aria-label="Toggle maximize window"
              title="Maximize"
            >
              <Square size={10} strokeWidth={2.2} />
            </button>
            <button
              className="h-7 w-7 hover:bg-red-500/10 rounded-sm cursor-pointer group flex items-center justify-center text-zinc-400 group-hover:text-red-400 transition-colors"
              onClick={() => {
                void handleWindowControl('close');
              }}
              type="button"
              aria-label="Close window"
              title="Close"
            >
              <X size={12} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-0 bg-[#0a0a0a]">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className="w-full h-full flex flex-col"
            style={{ display: activeTabId === tab.id ? 'flex' : 'none' }}
          >
            {/* Conditionally Render Workspace based on Type */}
            {tab.type === 'agent' && (
              <AgentWorkspace
                isActive={activeTabId === tab.id}
                isEditorOpen={tab.isEditorOpen}
                leftWidth={tab.leftWidth}
                rightWidth={tab.rightWidth}
                onLayoutChange={(updates) => updateTab(tab.id, updates)}
              />
            )}

            {tab.type === 'editor' && (
              <EditorWorkspace
                initialPath={tab.openPath ?? undefined}
                onOpenPath={(p) => updateTab(tab.id, { openPath: p, title: pathLabel(p) })}
                onDirtyChange={(dirty) => updateTab(tab.id, { isDirty: dirty })}
                onSave={(savedPath?: string) => updateTab(tab.id, { isDirty: false, openPath: savedPath ?? tab.openPath, title: (savedPath ? pathLabel(savedPath) : tab.title) })}
                onTitleChange={(title) => updateTabTitle(tab.id, title)}
              />
            )}

            {tab.type === 'terminal' && (
              <TerminalWorkspace
                onExit={() => closeTabById(tab.id, true)}
                onTitleChange={(title) => updateTabTitle(tab.id, title)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
