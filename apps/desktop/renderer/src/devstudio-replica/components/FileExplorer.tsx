import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FilePlus,
  FolderPlus,
  RotateCw,
  MoreHorizontal
} from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isOpen?: boolean;
}

const INITIAL_FILES: FileNode[] = [
  {
    id: 'app',
    name: 'app',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'components',
        name: 'components',
        type: 'folder',
        isOpen: true,
        children: [
          { id: 'Header.tsx', name: 'Header.tsx', type: 'file' },
          { id: 'Sidebar.tsx', name: 'Sidebar.tsx', type: 'file' },
          { id: 'Workspace.tsx', name: 'Workspace.tsx', type: 'file' },
        ]
      },
      { id: 'layout.tsx', name: 'layout.tsx', type: 'file' },
      { id: 'page.tsx', name: 'page.tsx', type: 'file' },
      { id: 'globals.css', name: 'globals.css', type: 'file' },
    ]
  },
  {
    id: 'public',
    name: 'public',
    type: 'folder',
    isOpen: false,
    children: [
      { id: 'logo.svg', name: 'logo.svg', type: 'file' },
    ]
  },
  { id: 'package.json', name: 'package.json', type: 'file' },
  { id: 'tsconfig.json', name: 'tsconfig.json', type: 'file' },
  { id: 'README.md', name: 'README.md', type: 'file' },
];

export const FileExplorer: React.FC = () => {
  const [files, setFiles] = useState<FileNode[]>(INITIAL_FILES);

  const toggleFolder = (id: string, nodes: FileNode[]): FileNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        return { ...node, isOpen: !node.isOpen };
      }
      if (node.children) {
        return { ...node, children: toggleFolder(id, node.children) };
      }
      return node;
    });
  };

  const handleToggle = (id: string) => {
    setFiles(prev => toggleFolder(id, prev));
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-[#2a2d2e] text-zinc-400 hover:text-zinc-100 select-none ${depth === 0 ? 'pl-2' : ''}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => node.type === 'folder' && handleToggle(node.id)}
        >
          {node.type === 'folder' && (
            <span className="text-zinc-500">
              {node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          <span className={`${node.type === 'file' ? 'ml-[18px]' : ''}`}>
            {node.type === 'folder' ? (
              <Folder size={14} className={node.isOpen ? 'text-zinc-200' : 'text-zinc-500'} />
            ) : (
              <File size={14} className="text-zinc-500" />
            )}
          </span>
          <span className="ml-1.5 text-[13px]">{node.name}</span>
        </div>
        {node.type === 'folder' && node.isOpen && node.children && (
          <div>{renderTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-r border-[#27272a]">
      {/* Header Actions */}
      <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-zinc-500 tracking-wider group hover:text-zinc-300">
        <span>EXPLORER</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 hover:bg-[#2a2d2e] rounded" title="New File" type="button">
            <FilePlus size={14} />
          </button>
          <button className="p-1 hover:bg-[#2a2d2e] rounded" title="New Folder" type="button">
            <FolderPlus size={14} />
          </button>
          <button className="p-1 hover:bg-[#2a2d2e] rounded" title="Refresh" type="button">
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* Project Root Header */}
      <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-zinc-300 bg-[#2a2d2e]/0 hover:bg-[#2a2d2e] cursor-pointer">
        <div className="flex items-center gap-1">
          <ChevronDown size={14} />
          <span>PROJECT-ROOT</span>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {renderTree(files)}
      </div>
    </div>
  );
};
