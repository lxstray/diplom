'use client';

import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export interface UseCollaborationOptions {
  roomId: string;
  userName?: string;
}

export interface UseCollaborationResult {
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  yText: Y.Text | null;
  connected: boolean;
  error: string | null;
}

export function useCollaboration({
  roomId,
  userName = 'Anonymous',
}: UseCollaborationOptions): UseCollaborationResult {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [yText, setYText] = useState<Y.Text | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/collaboration`;
    
    const hocuspocusProvider = new HocuspocusProvider({
      url: wsUrl,
      name: roomId,
      document: ydoc,
      token: userName,
      onStatus: ({ status }) => {
        setConnected(status === 'connected');
        if (status === 'disconnected') {
          setError('Disconnected from collaboration server');
        } else {
          setError(null);
        }
      },
      onConnect: () => {
        console.log('Connected to collaboration room:', roomId);
      },
      onDisconnect: () => {
        console.log('Disconnected from collaboration room:', roomId);
      },
    });

    setProvider(hocuspocusProvider);

    // Get or create the shared text type
    const sharedText = ydoc.getText('fileContent');
    setYText(sharedText);

    return () => {
      hocuspocusProvider.destroy();
    };
  }, [roomId, userName, ydoc]);

  return { ydoc, provider, yText, connected, error };
}
