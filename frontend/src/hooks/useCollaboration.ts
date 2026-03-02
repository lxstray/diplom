'use client';

import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { supabase } from '@/lib/supabaseClient';

const COLLAB_URL =
  process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:3002';

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
  peers: { id: string; name: string }[];
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
  const [peers, setPeers] = useState<{ id: string; name: string }[]>([]);

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

    let cancelled = false;

    const setupProvider = async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      const hocuspocusProvider = new HocuspocusProvider({
        url: COLLAB_URL,
        name: roomId,
        document: ydocInstance,
        token: accessToken ?? undefined,
        parameters: {
          token: accessToken ?? '',
        },
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

      if (cancelled) {
        hocuspocusProvider.destroy();
        return;
      }

      providerRef.current = hocuspocusProvider;
      setProvider(hocuspocusProvider);

      // Presence: advertise local user
      hocuspocusProvider.awareness.setLocalStateField('user', {
        id: data.session?.user.id ?? 'anonymous',
        name: userName,
      });

      // Track peers
      const handleAwarenessUpdate = () => {
        const states = Array.from(
          hocuspocusProvider.awareness.getStates().entries(),
        ).map(([clientId, state]) => ({
          id: (state as any)?.user?.id ?? String(clientId),
          name: (state as any)?.user?.name ?? 'Guest',
        }));
        setPeers(states);
      };

      hocuspocusProvider.awareness.on('change', handleAwarenessUpdate);
      handleAwarenessUpdate();

      // Get or create the shared text type
      const sharedText = ydocInstance.getText('fileContent');
      setYText(sharedText);
    };

    setupProvider();

    return () => {
      cancelled = true;
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      setProvider(null);
      setConnected(false);
      setPeers([]);
    };
  }, [roomId, userName]);

  return { ydoc, provider, yText, connected, error, peers };
}
