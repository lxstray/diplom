'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useFileContent } from '@/hooks/useFileContent';
import { FileTree } from '@/components/file-tree/FileTree';
import { RoomHistoryPanel } from '@/components/RoomHistoryPanel';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { Users, FolderOpen, ShieldCheck, Copy } from 'lucide-react';
import * as Y from 'yjs';

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
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [userName, setUserName] = useState('User');
  const [language, setLanguage] = useState('javascript');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [roomAccessDialogOpen, setRoomAccessDialogOpen] = useState(false);
  const [roomAccessLoading, setRoomAccessLoading] = useState(false);
  const [roomAccessError, setRoomAccessError] = useState<string | null>(null);
  const [roomProjectName, setRoomProjectName] = useState<string | null>(null);
  const [roomAccessLevel, setRoomAccessLevel] = useState<'OWNER' | 'ANYONE_WITH_LINK'>(
    'OWNER',
  );
  const [roomAccessSaving, setRoomAccessSaving] = useState(false);
  const [roomIsOwner, setRoomIsOwner] = useState(false);

  const { ydoc, yFiles, yFileTexts, connected, error, peers } = useCollaboration({
    roomId: currentRoom || '',
    userName,
  });

  const { currentFile } = useFileContent({
    yFiles,
    activeFileId,
  });

  // Get or create a Y.Text for the active file so each file
  // has its own collaborative content.
  const activeYText = useMemo(() => {
    if (!ydoc || !yFileTexts || !activeFileId) {
      return null;
    }

    let text = yFileTexts.get(activeFileId) as Y.Text | undefined;

    if (!text) {
      const newText = new Y.Text();
      ydoc.transact(() => {
        yFileTexts.set(activeFileId, newText);
      });
      text = newText;
    }

    return text;
  }, [ydoc, yFileTexts, activeFileId]);

  // Update language when active file changes
  useEffect(() => {
    if (currentFile?.language) {
      setLanguage(currentFile.language);
    }
  }, [currentFile?.language]);

  // Auto-select first file when joining room
  useEffect(() => {
    if (yFiles && !activeFileId) {
      const firstFile = Array.from(yFiles.entries())[0];
      if (firstFile) {
        setActiveFileId(firstFile[0]);
      }
    }
  }, [yFiles, activeFileId]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setUserName(session?.user?.email ?? 'User');
      setAuthLoading(false);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setUserId(data.session?.user?.id ?? null);
        setUserName(data.session?.user?.email ?? 'User');
      })
      .finally(() => setAuthLoading(false));

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    if (!email.trim() || !password) {
      setAuthError('Email and password are required.');
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setAuthError(signInError.message);
    }
  };

  const handleSignUp = async () => {
    setAuthError(null);
    if (!email.trim() || !password) {
      setAuthError('Email and password are required.');
      return;
    }
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (signUpError) {
      setAuthError(signUpError.message);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) {
        setAuthError(error.message);
      }
    } catch (error: any) {
      setAuthError(error.message ?? 'Failed to start OAuth flow.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setCurrentRoom(null);
  };

  const handleJoinRoom = async () => {
    const targetRoomId = roomId.trim();
    if (!targetRoomId) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setAuthError('You must be signed in to join a room.');
        return;
      }

      const response = await fetch(
        `http://localhost:3001/api/rooms/${targetRoomId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to join room (${response.status})`,
        );
      }

      const { room } = await response.json();
      setCurrentRoom(room.id);
      setCurrentProject(room.projectId);
      setActiveFileId(null);
      setRoomId(room.id);
    } catch (err) {
      console.error('Failed to join room:', err);
      setAuthError(
        err instanceof Error ? err.message : 'Failed to join room.',
      );
    }
  };

  const handleCreateRoom = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setAuthError('You must be signed in to create a room.');
        return;
      }

      const response = await fetch('http://localhost:3001/api/rooms', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to create room (${response.status})`);
      }

      const body = await response.json();
      setCurrentRoom(body.roomId);
    } catch (err) {
      console.error('Failed to create room:', err);
      setAuthError(
        err instanceof Error ? err.message : 'Failed to create room.',
      );
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setCurrentProject(null);
    setRoomId('');
    setActiveFileId(null);
    setSidebarOpen(true); // Reset sidebar to open when returning to main page
  };

  const handleReconnect = async (roomId: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setAuthError('You must be signed in to join a room.');
        return;
      }

      const response = await fetch(
        `http://localhost:3001/api/rooms/${roomId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error || `Failed to join room (${response.status})`,
        );
      }

      const { room } = await response.json();
      setCurrentRoom(room.id);
      setCurrentProject(room.projectId);
      setActiveFileId(null);
      setRoomId(room.id);
    } catch (err) {
      console.error('Failed to reconnect to room:', err);
      setAuthError(
        err instanceof Error ? err.message : 'Failed to reconnect to room.',
      );
    }
  };

  const handleOpenRoomAccess = async () => {
    if (!currentRoom) return;
    setRoomAccessDialogOpen(true);
    setRoomAccessLoading(true);
    setRoomAccessError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setRoomAccessError('You must be signed in to view room access.');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/rooms/${currentRoom}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load room access (${response.status})`);
      }

      const { room } = await response.json();
      setRoomProjectName(room?.project?.name ?? null);
      setRoomAccessLevel(room?.access ?? 'OWNER');
      setRoomIsOwner(room?.project?.ownerId === userId);
    } catch (err) {
      console.error('Failed to load room access:', err);
      setRoomAccessError(
        err instanceof Error ? err.message : 'Failed to load room access.',
      );
    } finally {
      setRoomAccessLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setAuthError('You must be signed in to create a project.');
        return;
      }

      if (!newProjectName.trim()) {
        setAuthError('Project name is required.');
        return;
      }

      const response = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to create project (${response.status})`);
      }

      const { project } = await response.json();
      setCurrentProject(project.id);
      setNewProjectName('');
      setNewProjectDialogOpen(false);
      
      // Create initial room for the project
      const roomResponse = await fetch(`http://localhost:3001/api/projects/${project.id}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ projectId: project.id, name: 'Main Room' }),
      });

      if (roomResponse.ok) {
        const { room } = await roomResponse.json();
        setCurrentRoom(room.id);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
      setAuthError(
        err instanceof Error ? err.message : 'Failed to create project.',
      );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-card border-b">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Diplom</h1>

          {!currentRoom ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setNewProjectDialogOpen(true)}
                size="sm"
                variant="default"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                New Project
              </Button>
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
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Room:</span>
              <span className="font-semibold">{currentRoom}</span>
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? 'Connected' : 'Connecting...'}
              </Badge>
              {peers.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{peers.length}</span>
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs"
                onClick={handleOpenRoomAccess}
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                Access
              </Button>
              <Button onClick={handleLeaveRoom} size="sm" variant="destructive">
                Leave
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {currentFile && (
              <span className="text-sm text-muted-foreground">
                Editing: {currentFile.name}
              </span>
            )}
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

          <div className="flex items-center gap-2">
            {authLoading ? (
              <span className="text-sm text-muted-foreground">Loading...</span>
            ) : userId ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {userName}
                </span>
                <Button size="sm" variant="outline" onClick={handleSignOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    Sign in / Register
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {authMode === 'signin' ? 'Welcome back' : 'Create account'}
                    </DialogTitle>
                    <DialogDescription>
                      {authMode === 'signin'
                        ? 'Sign in with your email and password or continue with a provider.'
                        : 'Sign up with your email and password or continue with a provider.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-4 space-y-3">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <button
                        type="button"
                        className="underline underline-offset-2 hover:text-foreground"
                        onClick={() =>
                          setAuthMode((mode) =>
                            mode === 'signin' ? 'signup' : 'signin',
                          )
                        }
                      >
                        {authMode === 'signin'
                          ? "Don't have an account? Sign up"
                          : 'Already have an account? Sign in'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground">
                        or continue with
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-[#4285F4] text-[#4285F4] bg-background hover:bg-[#4285F4]/10"
                        onClick={() => handleOAuthSignIn('google')}
                      >
                        <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 48 48"
                            className="h-4 w-4"
                          >
                            <path
                              fill="#EA4335"
                              d="M24 9.5c3.54 0 6 1.54 7.38 2.83l5.4-5.4C33.64 4.08 29.3 2 24 2 14.96 2 7.37 7.16 4.24 14.5l6.89 5.35C12.53 14.58 17.74 9.5 24 9.5z"
                            />
                            <path
                              fill="#34A853"
                              d="M46.5 24.5c0-1.56-.14-3.06-.4-4.5H24v9h12.7c-.55 2.9-2.2 5.36-4.7 7.02l7.36 5.72C43.86 37.46 46.5 31.5 46.5 24.5z"
                            />
                            <path
                              fill="#4A90E2"
                              d="M10.53 28.15A14.5 14.5 0 0 1 9.5 24c0-1.44.25-2.83.7-4.15l-6.89-5.35A21.94 21.94 0 0 0 2 24c0 3.6.86 7 2.39 10.02l6.14-5.87z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M24 46c5.94 0 10.93-1.96 14.57-5.31l-7.36-5.72C29.26 36.3 26.78 37 24 37c-6.26 0-11.47-5.08-12.63-11.85l-6.89 5.35C7.37 40.84 14.96 46 24 46z"
                            />
                            <path fill="none" d="M2 2h44v44H2z" />
                          </svg>
                        </span>
                        <span>Google</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full bg-[#111827] text-white border-[#111827] hover:bg-[#111827]/90"
                        onClick={() => handleOAuthSignIn('github')}
                      >
                        <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-4 w-4 fill-current"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12 0C5.37 0 0 5.37 0 12a12 12 0 0 0 8.21 11.44c.6.11.82-.26.82-.58 0-.28-.01-1.02-.02-2-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.35-1.76-1.35-1.76-1.1-.76.08-.75.08-.75 1.22.09 1.87 1.26 1.87 1.26 1.08 1.85 2.83 1.32 3.52 1.01.11-.78.42-1.32.76-1.62-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.62-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.6-.01 2.88-.01 3.27 0 .32.22.7.82.58A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12z"
                            />
                          </svg>
                        </span>
                        <span>GitHub</span>
                      </Button>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      onClick={async () => {
                        if (authMode === 'signin') {
                          await handleSignIn();
                        } else {
                          await handleSignUp();
                        }
                      }}
                    >
                      {authMode === 'signin' ? 'Sign in' : 'Sign up'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {(error || authError) && (
        <div className="px-6 py-2 bg-destructive/20 text-destructive-foreground text-sm">
          {error || authError}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - History & File Tree */}
        {sidebarOpen && (
          <aside className="w-72 border-r bg-card flex-shrink-0 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Room History - Only visible when NOT in a room */}
              {!currentRoom && (
                <RoomHistoryPanel
                  onReconnect={handleReconnect}
                  userId={userId}
                />
              )}

              {/* File Tree - Only visible when in a room */}
              {currentRoom && yFiles && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground px-1">
                    Files
                  </div>
                  <FileTree
                    yFiles={yFiles}
                    activeFileId={activeFileId}
                    onFileSelect={setActiveFileId}
                  />
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Editor */}
        <main className="flex-1 overflow-hidden p-4">
          {currentRoom ? (
            yFiles && activeFileId && activeYText ? (
              <div className="h-full rounded-md border overflow-hidden">
                <MonacoEditor
                  yText={activeYText}
                  language={language}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-lg">
                Create a file to start editing
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-lg">
              Create or join a room to start collaborative coding
            </div>
          )}
        </main>
      </div>

      {/* New Project Dialog */}
      <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Give your new project a descriptive name.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <Input
              placeholder="My awesome project"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleCreateProject();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewProjectDialogOpen(false);
                setNewProjectName('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleCreateProject();
              }}
            >
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Access Dialog */}
      <Dialog open={roomAccessDialogOpen} onOpenChange={setRoomAccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Room access</DialogTitle>
            <DialogDescription>
              Control who can open and collaborate in this room.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Room ID
              </span>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 rounded bg-muted text-xs flex-1 break-all">
                  {currentRoom ?? '—'}
                </code>
                {currentRoom && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard
                        .writeText(currentRoom)
                        .catch(() => undefined);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Project
              </span>
              <div className="text-sm">
                {roomAccessLoading
                  ? 'Loading...'
                  : roomProjectName ?? 'Unknown project'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Who can access this room?
                </span>
                {!roomIsOwner && (
                  <span className="text-[10px] text-muted-foreground">
                    Only the project owner can change this.
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!roomIsOwner || roomAccessSaving}
                  onClick={async () => {
                    if (!currentRoom || roomAccessLevel === 'OWNER') return;
                    setRoomAccessSaving(true);
                    setRoomAccessError(null);
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      const accessToken = sessionData.session?.access_token;
                      if (!accessToken) {
                        setRoomAccessError('You must be signed in to change access.');
                        return;
                      }

                      const res = await fetch(
                        `http://localhost:3001/api/rooms/${currentRoom}/access`,
                        {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessToken}`,
                          },
                          body: JSON.stringify({ access: 'OWNER' }),
                        },
                      );

                      if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        throw new Error(
                          body.error ||
                            `Failed to update room access (${res.status})`,
                        );
                      }

                      setRoomAccessLevel('OWNER');
                    } catch (err) {
                      setRoomAccessError(
                        err instanceof Error
                          ? err.message
                          : 'Failed to update room access.',
                      );
                    } finally {
                      setRoomAccessSaving(false);
                    }
                  }}
                  className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                    roomAccessLevel === 'OWNER'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:bg-muted/60'
                  } ${!roomIsOwner ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium mb-1">Owner only</div>
                  <p className="text-[11px] text-muted-foreground">
                    Only the project owner can join this room.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={!roomIsOwner || roomAccessSaving}
                  onClick={async () => {
                    if (!currentRoom || roomAccessLevel === 'ANYONE_WITH_LINK') return;
                    setRoomAccessSaving(true);
                    setRoomAccessError(null);
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      const accessToken = sessionData.session?.access_token;
                      if (!accessToken) {
                        setRoomAccessError('You must be signed in to change access.');
                        return;
                      }

                      const res = await fetch(
                        `http://localhost:3001/api/rooms/${currentRoom}/access`,
                        {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessToken}`,
                          },
                          body: JSON.stringify({ access: 'ANYONE_WITH_LINK' }),
                        },
                      );

                      if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        throw new Error(
                          body.error ||
                            `Failed to update room access (${res.status})`,
                        );
                      }

                      setRoomAccessLevel('ANYONE_WITH_LINK');
                    } catch (err) {
                      setRoomAccessError(
                        err instanceof Error
                          ? err.message
                          : 'Failed to update room access.',
                      );
                    } finally {
                      setRoomAccessSaving(false);
                    }
                  }}
                  className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                    roomAccessLevel === 'ANYONE_WITH_LINK'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:bg-muted/60'
                  } ${!roomIsOwner ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium mb-1">Anyone with link</div>
                  <p className="text-[11px] text-muted-foreground">
                    Any signed-in user who knows the room ID can join.
                  </p>
                </button>
              </div>
            </div>

            {roomAccessError && (
              <div className="text-xs text-destructive">
                {roomAccessError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoomAccessDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
