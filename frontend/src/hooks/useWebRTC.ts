'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Peer, { Instance as SimplePeerInstance } from 'simple-peer';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { PeerStream, SignalingMessage } from '@/types/webrtc';

const ICE_SERVERS = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ],
};

export interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  userName: string;
  provider: HocuspocusProvider | null;
  enabled?: boolean;
}

export interface UseWebRTCResult {
  localStream: MediaStream | null;
  remoteStreams: PeerStream[];
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startCamera: () => Promise<void>;
  stopCamera: () => Promise<void>;
  error: string | null;
}

export function useWebRTC({
  roomId,
  userId,
  userName,
  provider,
  enabled = false,
}: UseWebRTCOptions): UseWebRTCResult {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<PeerStream[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peersRef = useRef<Map<string, SimplePeerInstance>>(new Map());
  const streamRef = useRef<MediaStream | null>(null);
  const initializedRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    peersRef.current.forEach((peer) => {
      peer.destroy();
    });
    peersRef.current.clear();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStreams([]);
  }, []);

  // Send signaling message through Yjs awareness
  const sendSignalingMessage = useCallback(
    (message: SignalingMessage) => {
      if (!provider?.awareness) return;

      provider.awareness.setLocalStateField('webrtc', {
        ...provider.awareness.getLocalState()?.webrtc,
        signaling: message,
      });
    },
    [provider]
  );

  // Create a new peer connection
  const createPeer = useCallback(
    (
      targetPeerId: string,
      initiator: boolean,
      stream?: MediaStream
    ): SimplePeerInstance => {
      const peer = new Peer({
        initiator,
        trickle: true,
        stream,
        config: ICE_SERVERS,
      });

      peer.on('signal', (data: any) => {
        sendSignalingMessage({
          type: 'signal',
          from: userId,
          to: targetPeerId,
          roomId,
          payload: data,
        });
      });

      peer.on('stream', (remoteStream: MediaStream) => {
        setRemoteStreams((prev) => {
          if (prev.find((s) => s.peerId === targetPeerId)) {
            return prev;
          }
          return [...prev, { peerId: targetPeerId, stream: remoteStream }];
        });
      });

      peer.on('close', () => {
        peersRef.current.delete(targetPeerId);
        setRemoteStreams((prev) =>
          prev.filter((s) => s.peerId !== targetPeerId)
        );
      });

      peer.on('error', (err: Error) => {
        console.error('[WebRTC] Peer error:', err);
        setError(err.message);
      });

      peersRef.current.set(targetPeerId, peer);
      return peer;
    },
    [userId, roomId, sendSignalingMessage]
  );

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback(
    (message: SignalingMessage) => {
      if (message.to !== userId || message.roomId !== roomId) return;

      const { from, payload } = message;

      let peer = peersRef.current.get(from);

      if (!peer) {
        // Deterministic initiator selection so only one side acts as initiator
        const shouldInitiate = userId < from;
        peer = createPeer(from, shouldInitiate, streamRef.current || undefined);
      }

      peer.signal(payload);
    },
    [userId, roomId, createPeer]
  );

  // Setup awareness listener for WebRTC signaling
  useEffect(() => {
    if (!provider?.awareness || !enabled) return;

    const handleAwarenessUpdate = () => {
      const states = provider.awareness?.getStates();
      if (!states) return;

      states.forEach((state, clientId) => {
        const webrtcState = (state as any)?.webrtc;
        if (webrtcState?.signaling) {
          handleSignalingMessage(webrtcState.signaling);
        }
      });
    };

    provider.awareness.on('update', handleAwarenessUpdate);

    return () => {
      provider.awareness?.off('update', handleAwarenessUpdate);
    };
  }, [provider, enabled, handleSignalingMessage]);

  // Start camera and microphone
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      setLocalStream(stream);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);

      // Create peers for all existing users (only when we are the deterministic initiator)
      if (provider?.awareness) {
        const states = provider.awareness.getStates();
        states.forEach((state, clientId) => {
          const remoteUserId = (state as any)?.user?.id;
          if (
            remoteUserId &&
            remoteUserId !== userId &&
            !peersRef.current.has(remoteUserId)
          ) {
            const shouldInitiate = userId < remoteUserId;
            if (shouldInitiate) {
              createPeer(remoteUserId, true, stream);
            }
          }
        });
      }
    } catch (err: any) {
      console.error('[WebRTC] Failed to access media devices:', err);
      setError(err.message || 'Failed to access camera/microphone');
    }
  }, [provider, userId, createPeer]);

  // Stop camera and microphone
  const stopCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setLocalStream(null);
    setIsVideoEnabled(false);
    setIsAudioEnabled(false);

    // Notify peers that we're leaving
    peersRef.current.forEach((peer) => {
      peer.destroy();
    });
    peersRef.current.clear();
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Cleanup on unmount or room change
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [roomId, cleanup]);

  // Initialize when enabled changes
  useEffect(() => {
    if (enabled && !initializedRef.current) {
      initializedRef.current = true;
      startCamera();
    } else if (!enabled) {
      initializedRef.current = false;
      stopCamera();
    }
  }, [enabled, startCamera, stopCamera]);

  return {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    startCamera,
    stopCamera,
    error,
  };
}
