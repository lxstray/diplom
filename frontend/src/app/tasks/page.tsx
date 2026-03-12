'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import { TaskCard } from '@/components/TaskCard';
import { TaskFilters } from '@/components/TaskFilters';
import { StatsPanel } from '@/components/StatsPanel';
import { ActivityCalendar } from '@/components/ActivityCalendar';
import { RoomHistoryPanel } from '@/components/RoomHistoryPanel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { BookOpen, BarChart3, Code2, LogOut, LogIn, FolderOpen, Copy } from 'lucide-react';
import type { UserTaskStats } from '@/types/task';
import Link from 'next/link';

export default function TasksPage() {
  const router = useRouter();
  const { loadTasks, getStats, tasks, loading, error } = useTasks();
  const [stats, setStats] = useState<UserTaskStats | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'stats'>('tasks');
  const [difficulty, setDifficulty] = useState('all');
  const [status, setStatus] = useState('all');
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Room/Project dialog state
  const [roomId, setRoomId] = useState('');
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [joinRoomDialogOpen, setJoinRoomDialogOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);

  // Load user info
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserName(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
      setAuthChecked(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      setUserName(data.session?.user?.email ?? null);
      setUserId(data.session?.user?.id ?? null);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load tasks and stats
  useEffect(() => {
    if (userId && authChecked) {
      loadTasks({ status: status as any, difficulty });
      getStats().then(setStats).catch(console.error);
    }
  }, [userId, authChecked, difficulty, status, loadTasks, getStats]);

  // Refresh stats when page becomes visible (e.g., after returning from task detail)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        getStats().then(setStats).catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, getStats]);

  // Refresh stats on focus
  useEffect(() => {
    const handleFocus = () => {
      if (userId) {
        getStats().then(setStats).catch(console.error);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [userId, getStats]);

  // Listen for task completion events from task detail page
  useEffect(() => {
    const handleTaskCompleted = () => {
      if (userId) {
        console.log('[TasksPage] Task completed event received, refreshing stats');
        getStats().then(setStats).catch(console.error);
        loadTasks({ status: status as any, difficulty });
      }
    };

    window.addEventListener('task-completed', handleTaskCompleted);
    return () => window.removeEventListener('task-completed', handleTaskCompleted);
  }, [userId, getStats, loadTasks, status, difficulty]);

  const handleClearFilters = useCallback(() => {
    setDifficulty('all');
    setStatus('all');
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const handleCreateProject = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        console.error('No access token');
        return;
      }

      if (!newProjectName.trim()) {
        console.error('Project name is required');
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
        // Redirect to editor page with the room
        window.location.href = `/editor?room=${room.id}`;
      }

      setNewProjectDialogOpen(false);
      setNewProjectName('');
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleJoinRoom = async () => {
    const targetRoomId = joinRoomId.trim();
    if (!targetRoomId) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        console.error('No access token');
        return;
      }

      // Check if it's a task room (format: task-{slug}-{id})
      const isTaskRoom = targetRoomId.startsWith('task-');
      
      if (isTaskRoom) {
        // For task rooms, extract the slug and redirect to task page with room param
        // Format: task-{slug}-{sessionId}
        const parts = targetRoomId.split('-');
        if (parts.length < 3) {
          throw new Error('Invalid task room ID format. Expected: task-{slug}-{id}');
        }
        
        // Extract slug (everything between 'task' and the last part which is session ID)
        const slug = parts.slice(1, -1).join('-');
        
        // Redirect to task page with room parameter to join existing session
        window.location.href = `/tasks/${slug}?room=${encodeURIComponent(targetRoomId)}`;
        setJoinRoomDialogOpen(false);
        setJoinRoomId('');
      } else {
        // Regular project room - fetch from API
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
        // Redirect to editor page with the room
        window.location.href = `/editor?room=${room.id}`;
        setJoinRoomDialogOpen(false);
        setJoinRoomId('');
      }
    } catch (err) {
      console.error('Failed to join room:', err);
      alert(`Failed to join room: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const copyRoomId = async () => {
    if (roomId) {
      await navigator.clipboard.writeText(roomId);
    }
  };

  const handleReconnect = useCallback((roomId: string) => {
    // Check if it's a task room (format: task-{slug}-{id})
    const isTaskRoom = roomId.startsWith('task-');

    if (isTaskRoom) {
      // For task rooms, extract the slug and redirect to task page with room param
      const parts = roomId.split('-');
      if (parts.length < 3) {
        console.error('Invalid task room ID format');
        return;
      }
      const slug = parts.slice(1, -1).join('-');
      window.location.href = `/tasks/${slug}?room=${encodeURIComponent(roomId)}`;
    } else {
      // Regular project room - redirect to editor
      window.location.href = `/editor?room=${roomId}`;
    }
  }, []);

  const filteredTasks = tasks.filter((task) => {
    // Difficulty filter
    if (difficulty !== 'all') {
      const taskDifficulty = task.difficulty <= 3 ? 'easy' : task.difficulty <= 6 ? 'medium' : 'hard';
      if (taskDifficulty !== difficulty) return false;
    }

    // Status filter
    if (status === 'completed' && !task.completed) return false;
    if (status === 'not_completed' && task.completed) return false;

    return true;
  });

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Code2 className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle className="text-2xl">Sign in required</CardTitle>
            <CardDescription>
              Please sign in to access coding challenges and track your progress
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Link href="/signin">
              <Button className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Go to Sign In Page
              </Button>
            </Link>
            <p className="text-sm text-center text-muted-foreground">
              You can create an account or sign in with Google/GitHub
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Diplom</h1>
                <p className="text-sm text-muted-foreground">
                  Collaborative Coding Challenges
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Create/Join Room Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setNewProjectDialogOpen(true)}
                  size="sm"
                  variant="default"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  New Project
                </Button>
                <Button
                  onClick={() => setJoinRoomDialogOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  Join Room
                </Button>
                <Button
                  onClick={() => setHistoryPanelOpen(!historyPanelOpen)}
                  size="sm"
                  variant={historyPanelOpen ? 'default' : 'outline'}
                  className="h-8 px-2 text-xs"
                >
                  <FolderOpen className="h-3 w-3 mr-1" />
                  History
                </Button>
              </div>

              {userName && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{userName}</span>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex gap-6">
        {/* Main area - tabs and content */}
        <div className="flex-1">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">
              Welcome back{userName ? `, ${userName.split('@')[0]}` : ''}!
            </h2>
            <p className="text-muted-foreground">
              Ready to solve some coding challenges today?
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="tasks" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-6">
            {stats && (
              <div className="mb-8">
                <StatsPanel stats={stats} />
              </div>
            )}

            <TaskFilters
              difficulty={difficulty}
              status={status}
              onDifficultyChange={setDifficulty}
              onStatusChange={setStatus}
              onClearFilters={handleClearFilters}
              totalTasks={filteredTasks.length}
            />

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading tasks...</div>
              </div>
            ) : error ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-destructive">
                    <p className="font-medium">Failed to load tasks</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </CardContent>
              </Card>
            ) : filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No tasks found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.slug} task={task} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="mt-6">
            {stats ? (
              <div className="space-y-6">
                <StatsPanel stats={stats} />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ActivityCalendar activity={stats.recentActivity} />
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Progress Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Completed</span>
                        <span className="font-semibold">{stats.totalCompleted}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Attempts</span>
                        <span className="font-semibold">{stats.totalAttempts}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Completion Rate</span>
                        <span className="font-semibold">
                          {stats.totalAttempts > 0 
                            ? Math.round((stats.totalCompleted / stats.totalAttempts) * 100) 
                            : 0}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Difficulty Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span className="text-muted-foreground flex-1">Easy</span>
                        <span className="font-semibold">{stats.difficultyStats.easy}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-yellow-500" />
                        <span className="text-muted-foreground flex-1">Medium</span>
                        <span className="font-semibold">{stats.difficultyStats.medium}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-muted-foreground flex-1">Hard</span>
                        <span className="font-semibold">{stats.difficultyStats.hard}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="flex items-center justify-center text-muted-foreground">
                    Loading statistics...
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        </div>

        {/* Room History Panel - Right Sidebar */}
        {historyPanelOpen && (
          <div className="w-80 flex-shrink-0">
            <RoomHistoryPanel
              onReconnect={handleReconnect}
              userId={userId}
            />
          </div>
        )}
      </main>

      {/* New Project Dialog */}
      <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to start collaborative coding
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewProjectDialogOpen(false);
                setNewProjectName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Room Dialog */}
      <Dialog open={joinRoomDialogOpen} onOpenChange={setJoinRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Room</DialogTitle>
            <DialogDescription>
              Enter a room ID to join an existing collaborative session
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="text"
              placeholder="Room ID"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setJoinRoomDialogOpen(false);
                setJoinRoomId('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleJoinRoom}>
              Join Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
