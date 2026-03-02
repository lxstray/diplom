'use client';

import { useEffect, useState, useRef } from 'react';
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
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [yText, setYText] = useState<Y.Text | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Y.Doc once
  useEffect(() => {
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
      setYdoc(ydocRef.current);
    }
  }, []);

  // Setup/cleanup provider when roomId changes
  useEffect(() => {
    if (!roomId || !ydocRef.current) {
      return;
    }

    const ydocInstance = ydocRef.current;
    const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/collaboration`;

    const hocuspocusProvider = new HocuspocusProvider({
      url: wsUrl,
      name: roomId,
      document: ydocInstance,
      token: userName,
      connect: true,
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
        setError(null);
      },
      onDisconnect: () => {
        console.log('Disconnected from collaboration room:', roomId);
      },
      onClose: (event: any) => {
        console.log('Connection closed:', event.code, event.reason);
      },
    });

    providerRef.current = hocuspocusProvider;
    setProvider(hocuspocusProvider);

    // Get or create the shared text type
    const sharedText = ydocInstance.getText('fileContent');
    setYText(sharedText);

    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      setProvider(null);
      setConnected(false);
    };
  }, [roomId, userName]);

  return { ydoc, provider, yText, connected, error };
}
