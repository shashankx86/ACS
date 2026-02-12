import React, { useState, useEffect } from 'react';
import { Sidebar } from '../panels/Sidebar';
import { ChatPanel } from '../panels/ChatPanel';
import { ChangesPanel } from '../panels/ChangesPanel';

interface WorkspaceProps {
  isActive: boolean;
  isEditorOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  onLayoutChange: (updates: { leftWidth?: number; rightWidth?: number }) => void;
}

export const AgentWorkspace: React.FC<WorkspaceProps> = ({
  isActive,
  isEditorOpen,
  leftWidth,
  rightWidth,
  onLayoutChange
}) => {
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [isNewThread, setIsNewThread] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        onLayoutChange({ leftWidth: Math.max(200, Math.min(400, e.clientX)) });
      }
      if (isDraggingRight) {
        const newWidth = window.innerWidth - e.clientX;
        onLayoutChange({ rightWidth: Math.max(300, Math.min(800, newWidth)) });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isActive, isDraggingLeft, isDraggingRight, onLayoutChange]);

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      <Sidebar width={leftWidth} onNewThread={() => setIsNewThread(true)} />

      {/* Left Resizer */}
      <div
        className="w-1 absolute top-0 bottom-0 z-10 cursor-col-resize hover:bg-emerald-500/20 transition-colors"
        style={{ left: leftWidth - 2 }}
        onMouseDown={() => setIsDraggingLeft(true)}
      />

      <ChatPanel isNewThread={isNewThread} />

      {/* Right Resizer */}
      {isEditorOpen && (
        <div
          className="w-1 absolute top-0 bottom-0 z-10 cursor-col-resize hover:bg-emerald-500/20 transition-colors"
          style={{ right: rightWidth - 2 }}
          onMouseDown={() => setIsDraggingRight(true)}
        />
      )}

      {isEditorOpen && <ChangesPanel width={rightWidth} />}
    </div>
  );
};
