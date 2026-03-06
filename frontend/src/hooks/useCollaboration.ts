'use client';

import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { supabase } from '@/lib/supabaseClient';
import type { FileMetadata } from '@/types/files';

const COLLAB_URL =
  process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:3002';

export interface UseCollaborationOptions {
  roomId: string;
  userName?: string;
}

export interface UseCollaborationResult {
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  yFiles: Y.Map<FileMetadata> | null;
  yFileTexts: Y.Map<Y.Text> | null;
  connected: boolean;
  synced: boolean;
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
  const [yFiles, setYFiles] = useState<Y.Map<FileMetadata> | null>(null);
  const [yFileTexts, setYFileTexts] = useState<Y.Map<Y.Text> | null>(null);
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peers, setPeers] = useState<{ id: string; name: string }[]>([]);

  // Setup/cleanup provider when roomId changes
  useEffect(() => {
    if (!roomId) {
      // Leaving room: reset state
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
      setYdoc(null);
      setProvider(null);
      setYFiles(null);
      setYFileTexts(null);
      setConnected(false);
      setSynced(false);
      setError(null);
      setPeers([]);
      return;
    }

    // New room: create a fresh Y.Doc for isolation
    const ydocInstance = new Y.Doc();
    ydocRef.current = ydocInstance;
    setYdoc(ydocInstance);

    let cancelled = false;

    const setupProvider = async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        console.error('[useCollaboration] No access token available');
        setError('Authentication required');
        return;
      }

      console.log('[useCollaboration] Connecting to room:', roomId, 'with token:', accessToken ? 'present' : 'missing');

      const hocuspocusProvider = new HocuspocusProvider({
        url: COLLAB_URL,
        name: roomId,
        document: ydocInstance,
        token: accessToken,
        connect: true,
        onStatus: ({ status }) => {
          setConnected(status === 'connected');
          if (status === 'disconnected') {
            setError('Disconnected from collaboration server');
          } else {
            setError(null);
          }
        },
        onSynced: (isSynced: boolean) => {
          setSynced(isSynced);
          console.log('[useCollaboration] Synced:', isSynced, 'room:', roomId);
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
      if (hocuspocusProvider.awareness) {
        hocuspocusProvider.awareness.setLocalStateField('user', {
          id: data.session?.user.id ?? 'anonymous',
          name: userName,
        });
      }

      // Track peers
      const handleAwarenessUpdate = () => {
        if (!hocuspocusProvider.awareness) return;

        const states = Array.from(
          hocuspocusProvider.awareness.getStates().entries(),
        ).map(([clientId, state]) => ({
          id: (state as any)?.user?.id ?? String(clientId),
          name: (state as any)?.user?.name ?? 'Guest',
        }));
        setPeers(states);
      };

      if (hocuspocusProvider.awareness) {
        hocuspocusProvider.awareness.on('change', handleAwarenessUpdate);
      }
      handleAwarenessUpdate();

      // Get or create the files map for multi-file support
      const filesMap = ydocInstance.getMap<FileMetadata>('files');
      setYFiles(filesMap as unknown as Y.Map<FileMetadata>);

      // Map of fileId -> Y.Text for per-file contents
      const fileTextsMap = ydocInstance.getMap<Y.Text>('fileTexts');
      setYFileTexts(fileTextsMap as unknown as Y.Map<Y.Text>);
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
      setSynced(false);
      setPeers([]);
    };
  }, [roomId, userName]);

  return { ydoc, provider, yFiles, yFileTexts, connected, synced, error, peers };
}
