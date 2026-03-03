'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Video, Mic } from 'lucide-react';

interface Collaborator {
  id: string;
  name: string;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
}

interface CollaboratorsPanelProps {
  peers: { id: string; name: string }[];
  currentUserName: string;
  currentUserId: string;
  videoStates?: Map<string, { video: boolean; audio: boolean }>;
}

export function CollaboratorsPanel({
  peers,
  currentUserName,
  currentUserId,
  videoStates = new Map(),
}: CollaboratorsPanelProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const collaborators: Collaborator[] = [
    {
      id: currentUserId,
      name: currentUserName,
      isVideoEnabled: false,
      isAudioEnabled: true,
    },
    ...peers
      .filter((peer) => peer.id !== currentUserId)
      .map((peer) => {
        const videoState = videoStates.get(peer.id);
        return {
          id: peer.id,
          name: peer.name,
          isVideoEnabled: videoState?.video ?? false,
          isAudioEnabled: videoState?.audio ?? true,
        };
      }),
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {collaborators.map((collaborator) => (
          <Avatar
            key={collaborator.id}
            className="h-8 w-8 border-2 border-background ring-2 ring-primary/20"
            title={collaborator.name}
          >
            <AvatarImage src="" />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {getInitials(collaborator.name)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      {collaborators.length > 1 && (
        <Badge variant="secondary" className="text-xs">
          <Users className="h-3 w-3 mr-1" />
          {collaborators.length}
        </Badge>
      )}
    </div>
  );
}

interface CollaboratorsListProps {
  peers: { id: string; name: string }[];
  currentUserName: string;
  currentUserId: string;
  videoStates?: Map<string, { video: boolean; audio: boolean }>;
}

export function CollaboratorsList({
  peers,
  currentUserName,
  currentUserId,
  videoStates = new Map(),
}: CollaboratorsListProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const collaborators: Collaborator[] = [
    {
      id: currentUserId,
      name: currentUserName,
      isVideoEnabled: false,
      isAudioEnabled: true,
    },
    ...peers
      .filter((peer) => peer.id !== currentUserId)
      .map((peer) => {
        const videoState = videoStates.get(peer.id);
        return {
          id: peer.id,
          name: peer.name,
          isVideoEnabled: videoState?.video ?? false,
          isAudioEnabled: videoState?.audio ?? true,
        };
      }),
  ];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        <div className="text-xs font-medium text-muted-foreground px-1 mb-3">
          Collaborators
        </div>
        {collaborators.map((collaborator) => {
          const isOwn = collaborator.id === currentUserId;
          return (
            <div
              key={collaborator.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials(collaborator.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {collaborator.name}
                    {isOwn && (
                      <span className="text-muted-foreground text-xs ml-1">
                        (You)
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {collaborator.isVideoEnabled && (
                      <Video className="h-3 w-3" />
                    )}
                    {collaborator.isAudioEnabled === false && (
                      <span className="text-destructive">Muted</span>
                    )}
                  </div>
                </div>
              </div>
              {isOwn && (
                <Badge variant="default" className="text-xs">
                  You
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
