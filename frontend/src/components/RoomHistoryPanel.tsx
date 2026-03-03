'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { Clock, ArrowRight, Trash2, Loader2 } from 'lucide-react';

export interface RoomHistoryItem {
  id: string;
  roomId: string;
  room: {
    id: string;
    name: string;
    projectId: string;
    access: 'OWNER' | 'ANYONE_WITH_LINK';
    project: {
      id: string;
      name: string;
      ownerId: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  lastAccessed: string;
  accessedAt: string;
}

interface RoomHistoryPanelProps {
  onReconnect: (roomId: string) => void;
  userId: string | null;
}

export function RoomHistoryPanel({ onReconnect, userId }: RoomHistoryPanelProps) {
  const [history, setHistory] = useState<RoomHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    loadHistory();
  }, [userId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('http://localhost:3001/api/rooms/history', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load history (${response.status})`);
      }

      const { history: historyData } = await response.json();
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load room history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromHistory = async (historyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(historyId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        return;
      }

      const response = await fetch(`http://localhost:3001/api/rooms/history/${historyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to remove (${response.status})`);
      }

      setHistory((prev) => prev.filter((item) => item.id !== historyId));
    } catch (err) {
      console.error('Failed to remove from history:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove from history');
    } finally {
      setDeletingId(null);
    }
  };

  const formatLastAccessed = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!userId) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Rooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Sign in to view your room history
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Rooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Rooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-destructive">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 text-xs"
            onClick={loadHistory}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Rooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>No recent rooms</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent Rooms
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between gap-2 rounded-lg border bg-card p-2 transition-colors hover:bg-accent/50"
          >
            <div
              className="flex-1 cursor-pointer min-w-0"
              onClick={() => onReconnect(item.roomId)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {item.room.project.name} / {item.room.name}
                </span>
                {item.room.access === 'ANYONE_WITH_LINK' && (
                  <Badge variant="secondary" className="h-4 text-[10px] px-1">
                    Public
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate max-w-[120px]">
                  Room
                </span>
                <span>•</span>
                <span>{formatLastAccessed(item.lastAccessed)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onReconnect(item.roomId)}
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={(e) => handleRemoveFromHistory(item.id, e)}
                disabled={deletingId === item.id}
              >
                {deletingId === item.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
