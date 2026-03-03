'use client';

import { useEffect, useState, useCallback } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { CursorPosition, CursorSelectionRange } from '@/types/cursor';

// Generate consistent colors for users
function getUserColor(userId: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export interface UseCursorPresenceOptions {
  provider: HocuspocusProvider | null;
  userId: string;
  userName: string;
  roomId: string;
}

export interface UseCursorPresenceResult {
  remoteCursors: CursorPosition[];
  updateCursorPosition: (
    line: number,
    column: number,
    selection?: CursorSelectionRange | null
  ) => void;
}

export function useCursorPresence({
  provider,
  userId,
  userName,
  roomId,
}: UseCursorPresenceOptions): UseCursorPresenceResult {
  const [remoteCursors, setRemoteCursors] = useState<CursorPosition[]>([]);

  // Update cursor position in awareness
  const updateCursorPosition = useCallback(
    (
      line: number,
      column: number,
      selection?: CursorSelectionRange | null
    ) => {
      if (!provider?.awareness) return;

      provider.awareness.setLocalStateField('cursor', {
        userId,
        userName,
        line,
        column,
        color: getUserColor(userId),
        timestamp: Date.now(),
        selection: selection ?? undefined,
      });
    },
    [provider, userId, userName]
  );

  // Listen for cursor updates from other users
  useEffect(() => {
    if (!provider?.awareness) {
      setRemoteCursors([]);
      return;
    }

    const handleAwarenessUpdate = () => {
      const states = provider.awareness?.getStates();
      if (!states) return;

      const cursors: CursorPosition[] = [];

      states.forEach((state, clientId) => {
        const cursorState = (state as any)?.cursor;
        const userState = (state as any)?.user;

        if (cursorState && userState?.id !== userId) {
          cursors.push({
            userId: cursorState.userId || userState.id,
            userName: cursorState.userName || userState.name,
            line: cursorState.line,
            column: cursorState.column,
            color: cursorState.color || getUserColor(cursorState.userId || userState.id),
            timestamp: cursorState.timestamp || Date.now(),
            selection: cursorState.selection,
          });
        }
      });

      // Filter out cursors older than 5 seconds (user likely disconnected)
      const now = Date.now();
      const activeCursors = cursors.filter(
        (cursor) => now - cursor.timestamp < 5000
      );

      setRemoteCursors(activeCursors);
    };

    provider.awareness.on('update', handleAwarenessUpdate);
    handleAwarenessUpdate();

    return () => {
      provider.awareness?.off('update', handleAwarenessUpdate);
    };
  }, [provider, userId, roomId]);

  // Clear cursor when leaving
  useEffect(() => {
    return () => {
      if (provider?.awareness) {
        provider.awareness.setLocalStateField('cursor', null);
      }
    };
  }, [provider, roomId]);

  return {
    remoteCursors,
    updateCursorPosition,
  };
}
