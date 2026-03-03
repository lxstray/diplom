'use client';

import type * as monaco from 'monaco-editor';
import type { CursorPosition } from '@/types/cursor';

interface CursorOverlayProps {
  cursors: CursorPosition[];
  editorRef: React.RefObject<monaco.editor.IStandaloneCodeEditor | null>;
}

export function CursorOverlay({ cursors, editorRef }: CursorOverlayProps) {
  const getCursorCoordinates = (
    cursor: CursorPosition,
    editor: monaco.editor.IStandaloneCodeEditor | null
  ): { top: number; left: number } | null => {
    if (!editor) return null;

    const position = editor.getScrolledVisiblePosition({
      lineNumber: cursor.line,
      column: cursor.column,
    });

    if (!position) return null;

    return {
      top: position.top,
      left: position.left,
    };
  };

  const getSelectionSegments = (
    cursor: CursorPosition,
    editor: monaco.editor.IStandaloneCodeEditor | null
  ): { top: number; left: number; width: number }[] => {
    if (!editor || !cursor.selection) return [];

    const { selection } = cursor;
    const model = editor.getModel();
    if (!model) return [];

    const segments: { top: number; left: number; width: number }[] = [];

    for (let line = selection.startLine; line <= selection.endLine; line++) {
      const isFirstLine = line === selection.startLine;
      const isLastLine = line === selection.endLine;

      const lineStartColumn = isFirstLine ? selection.startColumn : 1;
      const lineEndColumn = isLastLine
        ? selection.endColumn
        : model.getLineMaxColumn(line);

      if (lineEndColumn <= lineStartColumn) continue;

      const startPos = editor.getScrolledVisiblePosition({
        lineNumber: line,
        column: lineStartColumn,
      });
      const endPos = editor.getScrolledVisiblePosition({
        lineNumber: line,
        column: lineEndColumn,
      });

      if (!startPos || !endPos) continue;

      segments.push({
        top: startPos.top,
        left: startPos.left,
        width: Math.max(0, endPos.left - startPos.left),
      });
    }

    return segments;
  };

  if (cursors.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {cursors.map((cursor) => {
        const coords = getCursorCoordinates(cursor, editorRef.current);
        const selectionSegments = getSelectionSegments(cursor, editorRef.current);

        if (!coords) return null;

        return (
          <>
            {selectionSegments.map((segment, idx) => (
              <div
                key={`${cursor.userId}-sel-${idx}`}
                className="absolute h-5 rounded-sm opacity-30"
                style={{
                  top: `${segment.top}px`,
                  left: `${segment.left}px`,
                  width: `${segment.width}px`,
                  backgroundColor: cursor.color,
                }}
              />
            ))}
            <div
              key={cursor.userId}
              className="absolute transition-all duration-100"
              style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
              }}
            >
              <div
                className="w-0.5 h-5 absolute"
                style={{ backgroundColor: cursor.color }}
              />
              <div
                className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-xs text-white whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.userName}
              </div>
            </div>
          </>
        );
      })}
    </div>
  );
}
