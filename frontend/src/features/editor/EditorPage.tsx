'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useCollaboration } from '@/hooks/useCollaboration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MonacoEditor = dynamic(() => import('@/components/MonacoEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Loading editor...
    </div>
  ),
});

export default function EditorPage() {
  const [roomId, setRoomId] = useState('');
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [userName, setUserName] = useState('User');
  const [language, setLanguage] = useState('javascript');

  const { yText, connected, error } = useCollaboration({
    roomId: currentRoom || '',
    userName,
  });

  const handleJoinRoom = async () => {
    if (roomId.trim()) {
      setCurrentRoom(roomId.trim());
    }
  };

  const handleCreateRoom = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/rooms', {
        method: 'POST',
      });
      const data = await response.json();
      setCurrentRoom(data.roomId);
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setRoomId('');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-card border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Diplom</h1>
          
          {!currentRoom ? (
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-40 h-9"
              />
              <Button onClick={handleJoinRoom} size="sm">
                Join
              </Button>
              <Button onClick={handleCreateRoom} size="sm" variant="default">
                Create Room
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Room:</span>
              <span className="font-semibold">{currentRoom}</span>
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? 'Connected' : 'Connecting...'}
              </Badge>
              <Button onClick={handleLeaveRoom} size="sm" variant="destructive">
                Leave
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-32 h-9"
          />
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
              <SelectItem value="go">Go</SelectItem>
              <SelectItem value="rust">Rust</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-2 bg-destructive/20 text-destructive-foreground text-sm">
          {error}
        </div>
      )}

      {/* Editor */}
      <main className="flex-1 overflow-hidden p-4">
        {currentRoom ? (
          <div className="h-full rounded-md border overflow-hidden">
            <MonacoEditor yText={yText} language={language} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-lg">
            Create or join a room to start collaborative coding
          </div>
        )}
      </main>
    </div>
  );
}
