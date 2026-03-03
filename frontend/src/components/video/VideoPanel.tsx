'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface VideoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  userId: string;
  userName: string;
  provider: HocuspocusProvider | null;
  enabled: boolean;
  onToggleEnabled: () => void;
}

export function VideoPanel({
  isOpen,
  onClose,
  roomId,
  userId,
  userName,
  provider,
  enabled,
  onToggleEnabled,
}: VideoPanelProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 80,
    left: 80,
  });
  const dragStateRef = useRef<{
    dragging: boolean;
    offsetX: number;
    offsetY: number;
  }>({
    dragging: false,
    offsetX: 0,
    offsetY: 0,
  });

  const {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    error,
  } = useWebRTC({
    roomId,
    userId,
    userName,
    provider,
    enabled,
  });

  // Attach local stream to video element
  useEffect(() => {
    if (!localVideoRef.current) return;

    if (localStream) {
      localVideoRef.current.srcObject = localStream;
    } else {
      localVideoRef.current.srcObject = null;
    }
  }, [localStream, isVideoEnabled]);

  // Attach remote streams to video elements
  useEffect(() => {
    remoteStreams.forEach(({ peerId, stream }) => {
      const videoElement = remoteVideoRefs.current.get(peerId);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleToggleCamera = async () => {
    onToggleEnabled();
  };

  const handleMouseDownHeader = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    e.preventDefault();
    const rect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    dragStateRef.current = {
      dragging: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.dragging) return;

      const newLeft = e.clientX - dragStateRef.current.offsetX;
      const newTop = e.clientY - dragStateRef.current.offsetY;

      setPosition({
        top: Math.max(0, newTop),
        left: Math.max(0, newLeft),
      });
    };

    const handleMouseUp = () => {
      if (dragStateRef.current.dragging) {
        dragStateRef.current.dragging = false;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed w-64 bg-card border rounded-lg shadow-lg z-50"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b cursor-move select-none"
        onMouseDown={handleMouseDownHeader}
      >
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          <h3 className="font-semibold text-sm">Video Chat</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Video Grid */}
      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        {/* Local Video */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {localStream && isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              You
            </Badge>
            {!isAudioEnabled && <MicOff className="h-3 w-3 text-destructive" />}
          </div>
        </div>

        {/* Remote Videos */}
        {remoteStreams.map(({ peerId, stream }) => (
          <div
            key={peerId}
            className="relative aspect-video bg-muted rounded-lg overflow-hidden"
          >
            <video
              ref={(el) => {
                if (el) {
                  remoteVideoRefs.current.set(peerId, el);
                } else {
                  remoteVideoRefs.current.delete(peerId);
                }
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2">
              <Badge variant="secondary" className="text-xs">
                User
              </Badge>
            </div>
          </div>
        ))}

        {remoteStreams.length === 0 && enabled && (
          <div className="text-center text-muted-foreground text-xs py-4">
            Waiting for others to join...
          </div>
        )}

        {error && (
          <div className="text-destructive text-xs p-2 bg-destructive/10 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Controls */}
      {enabled && (
        <div className="p-3 border-t flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? (
              <Mic className="h-4 w-4" />
            ) : (
              <MicOff className="h-4 w-4 text-destructive" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? (
              <Video className="h-4 w-4" />
            ) : (
              <VideoOff className="h-4 w-4 text-destructive" />
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 px-3"
            onClick={handleToggleCamera}
          >
            Turn Off
          </Button>
        </div>
      )}

      {!enabled && (
        <div className="p-3 border-t">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={handleToggleCamera}
          >
            <Video className="h-4 w-4 mr-2" />
            Start Camera
          </Button>
        </div>
      )}
    </div>
  );
}
