'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTasks } from '@/hooks/useTasks';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useCursorPresence } from '@/hooks/useCursorPresence';
import { useCodeExecution } from '@/hooks/useCodeExecution';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import MonacoEditor from '@/components/MonacoEditor';
import { ConsoleOutput } from '@/components/ConsoleOutput';
import { CursorOverlay } from '@/components/cursor/CursorOverlay';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { VideoPanel } from '@/components/video/VideoPanel';
import { CollaboratorsPanel } from '@/components/collaborators/CollaboratorsPanel';
import { supabase } from '@/lib/supabaseClient';
import { buildExercismRunSource } from '@/lib/exercismJudge0Runner';
import type { Task } from '@/types/task';
import * as Y from 'yjs';
import type * as monaco from 'monaco-editor';
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  Code2,
  Loader2,
  MessageSquare,
  Video,
  VideoOff,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast, ToastContainer } from '@/components/Toast';

// Code block renderer for markdown
const CodeBlock = ({ language, children }: { language?: string; children: string }) => {
  return (
    <pre className="bg-muted rounded-md p-4 my-4 overflow-x-auto">
      <code className="text-sm font-mono">{children}</code>
    </pre>
  );
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  
  // Get room from query params (for joining existing task rooms)
  const roomParam = searchParams.get('room');

  const { getTaskBySlug, completeTask, recordAttempt } = useTasks();
  const { toasts, success, error: showError, removeToast } = useToast();

  // Auth state (same capabilities as /editor)
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('User');

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);

  // Room access control state
  const [roomAccessDialogOpen, setRoomAccessDialogOpen] = useState(false);
  const [roomAccessLevel, setRoomAccessLevel] = useState<'OWNER' | 'ANYONE_WITH_LINK'>('ANYONE_WITH_LINK');
  const [roomIsOwner, setRoomIsOwner] = useState(true); // Task rooms: creator is owner
  const [roomAccessSaving, setRoomAccessSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [videoPanelOpen, setVideoPanelOpen] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Generate unique room ID for this task session (like /editor does)
  const [uniqueRoomId, setUniqueRoomId] = useState<string>('');
  
  useEffect(() => {
    if (userId && slug) {
      // If room param is provided, join that existing room
      if (roomParam) {
        setUniqueRoomId(roomParam);
      } else {
        // Otherwise create a new unique room ID for this task session
        const sessionId = crypto.randomUUID().slice(0, 8);
        setUniqueRoomId(`task-${slug}-${sessionId}`);
      }
    }
  }, [userId, slug, roomParam]);

  // Use unique room ID if available, otherwise fall back to slug-based ID
  const effectiveRoomId = uniqueRoomId || (userId ? `task-${slug}` : '');

  const {
    isRunning,
    error: executionError,
    output,
    execute,
    clearOutput,
  } = useCodeExecution();

  const recordedAttemptForSlugRef = useRef<string | null>(null);

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

    return () => subscription.unsubscribe();
  }, []);

  const roomId = useMemo(() => effectiveRoomId, [effectiveRoomId]);
  const { ydoc, provider, yFiles, yFileTexts, connected, error: collabError, peers } =
    useCollaboration({
      roomId,
      userName,
    });

  const activeFileId = 'solution';
  const [activeYText, setActiveYText] = useState<Y.Text | null>(null);

  // Track task completion shared state via Yjs
  const taskCompletionMapRef = useRef<Y.Map<any> | null>(null);
  
  // Track if we've already synced completion to database to avoid duplicate calls
  const completionSyncedRef = useRef(false);

  // Load room access from API on mount
  useEffect(() => {
    if (!ydoc || !roomId || !userId) return;

    const loadRoomAccess = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) return;

        const response = await fetch(`http://localhost:3001/api/task-rooms/${roomId}/access`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const { session } = await response.json();
          if (session) {
            setRoomAccessLevel(session.accessLevel);
            setRoomIsOwner(session.ownerId === userId);
          }
        } else if (response.status === 404) {
          // Session doesn't exist yet, will be created on first WebSocket connection
          setRoomIsOwner(true);
          setRoomAccessLevel('ANYONE_WITH_LINK');
        }
      } catch (err) {
        console.error('[TaskPage] Failed to load room access:', err);
      }
    };

    loadRoomAccess();
  }, [roomId, userId, ydoc]);

  useEffect(() => {
    if (ydoc) {
      // Get or create shared task completion state
      taskCompletionMapRef.current = ydoc.getMap('taskCompletion');

      // Listen for completion changes from other users
      const observer = (event: any) => {
        if (event.changes.keys) {
          event.changes.keys.forEach((change: any) => {
            // Check for both 'add' (first completion) and 'update' (subsequent changes)
            if (change.action === 'add' || change.action === 'update') {
              const completed = taskCompletionMapRef.current?.get('completed');
              const completedBy = taskCompletionMapRef.current?.get('completedBy');
              if (completed && completedBy !== userId) {
                setCompleted(true);
                console.log('[TaskPage] Task completed by:', completedBy);
                
                // Sync to database for current user (only once per session)
                if (!completionSyncedRef.current && userId && slug) {
                  completionSyncedRef.current = true;
                  completeTask(slug, 'javascript')
                    .then((result) => {
                      console.log('[TaskPage] Synced task completion to database for user:', userId, result);
                    })
                    .catch((err) => {
                      console.error('[TaskPage] Failed to sync task completion to database:', err);
                    });
                }
                
                // Only show toast if we haven't already completed it ourselves
                if (!completed) {
                  success(`${completedBy} completed the task!`);
                }
              }
            }
          });
        }
      };

      // Check initial state on connect
      const initialCompleted = taskCompletionMapRef.current?.get('completed');
      const initialCompletedBy = taskCompletionMapRef.current?.get('completedBy');
      if (initialCompleted && initialCompletedBy !== userId) {
        setCompleted(true);
        
        // Sync initial completion state to database for current user
        if (!completionSyncedRef.current && userId && slug) {
          completionSyncedRef.current = true;
          completeTask(slug, 'javascript')
            .then((result) => {
              console.log('[TaskPage] Synced initial task completion to database for user:', userId, result);
            })
            .catch((err) => {
              console.error('[TaskPage] Failed to sync initial task completion to database:', err);
            });
        }
      }

      taskCompletionMapRef.current.observeDeep(observer);
      return () => taskCompletionMapRef.current?.unobserveDeep(observer);
    }
  }, [ydoc, userId, success, slug, completeTask]);

  const { remoteCursors, updateCursorPosition } = useCursorPresence({
    provider,
    userId: userId || 'anonymous',
    userName,
    roomId,
  });

  // Load task
  useEffect(() => {
    const loadTask = async () => {
      setLoading(true);
      try {
        if (!userId) {
          setTask(null);
          return;
        }

        const loadedTask = await getTaskBySlug(slug);
        if (!loadedTask) {
          router.push('/tasks');
          return;
        }
        setTask(loadedTask);

        // Record attempt
        // Avoid spamming the backend if effects rerun in dev/StrictMode.
        if (recordedAttemptForSlugRef.current !== slug) {
          recordedAttemptForSlugRef.current = slug;
          await recordAttempt(slug);
        }
      } catch (error) {
        console.error('Failed to load task:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [slug, userId, getTaskBySlug, router, recordAttempt]);

  // Ensure the solution file exists in the Yjs doc and set activeYText
  // This runs when connected to sync with other users first
  useEffect(() => {
    if (!ydoc || !yFileTexts || !task || !connected) return;

    // Check if Y.Text already exists for this file
    let text = yFileTexts.get(activeFileId) as Y.Text | undefined;

    if (!text) {
      // Create new Y.Text - will be initialized with starter code in next effect
      const newText = new Y.Text();
      ydoc.transact(() => {
        yFileTexts.set(activeFileId, newText);
      });
      text = newText;
    }

    setActiveYText(text);
    console.log('[TaskPage] activeYText set, content length:', text.length);
  }, [ydoc, yFileTexts, task, connected, activeFileId]);

  // Ensure the solution file metadata exists in the Yjs doc
  useEffect(() => {
    if (!ydoc || !yFiles || !task) return;

    if (yFiles.get(activeFileId)) return;

    const now = Date.now();
    ydoc.transact(() => {
      yFiles.set(activeFileId, {
        id: activeFileId,
        name: `${task.slug}.js`,
        language: 'javascript',
        createdAt: now,
        updatedAt: now,
      });
    });
  }, [ydoc, yFiles, task]);

  // Debug: log output changes
  useEffect(() => {
    if (output) {
      console.log('[TaskPage] Output state changed:', output);
    }
  }, [output]);

  // Initialize the shared editor text with starter code if it is empty.
  // This ensures all users see the same initial code and sync properly.
  // Only the first user (with empty document) will initialize the content.
  useEffect(() => {
    if (!ydoc || !yFileTexts || !task || !connected || !activeYText) return;

    // Wait a bit for Yjs to sync existing content from other users
    const timeoutId = setTimeout(() => {
      // Check if content already exists (from other users)
      if (activeYText.length > 0) {
        console.log('[TaskPage] Content already exists from other users, skipping initialization');
        return;
      }

      // Initialize with starter code only if still empty after sync period
      ydoc.transact(() => {
        activeYText.insert(0, task.starterCode || '');
      });
      console.log('[TaskPage] Initialized Y.Text with starter code');
    }, 500); // Wait 500ms for initial Yjs sync from other users

    return () => clearTimeout(timeoutId);
  }, [ydoc, yFileTexts, task, connected, activeYText]);

  const handleRunCode = useCallback(async () => {
    if (!task || !activeYText) return;

    const source = buildExercismRunSource({
      solutionCode: activeYText.toString(),
      testCode: task.testCode,
      slug: task.slug,
    });

    const result = await execute({
      code: source,
      language: 'javascript',
      roomId: roomId || undefined,
      fileId: activeFileId,
    });

    console.log('[TaskPage] Run result:', result);

    // Always open console to show results
    setConsoleOpen(true);

    // Show success message if tests pass
    if (result.success && result.execution?.status?.id === 3) {
      console.log('✅ Tests passed!', result.execution.stdout);
    }
  }, [task, activeYText, execute, roomId, activeFileId]);

  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room ID:', err);
    }
  }, [roomId]);

  const handleOpenRoomAccess = useCallback(() => {
    setRoomAccessDialogOpen(true);
  }, []);

  const handleSaveRoomAccess = useCallback(() => {
    setRoomAccessDialogOpen(false);
  }, []);

  const handleUpdateRoomAccess = useCallback(async (newAccessLevel: 'OWNER' | 'ANYONE_WITH_LINK') => {
    if (!roomId) return;
    
    setRoomAccessSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        console.error('[TaskPage] No access token for updating room access');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/task-rooms/${roomId}/access`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ accessLevel: newAccessLevel }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to update room access (${response.status})`);
      }

      const { session } = await response.json();
      setRoomAccessLevel(session.accessLevel);
      setRoomIsOwner(session.ownerId === userId);
      console.log('[TaskPage] Room access updated to:', newAccessLevel);
    } catch (err) {
      console.error('[TaskPage] Failed to update room access:', err);
    } finally {
      setRoomAccessSaving(false);
    }
  }, [roomId, userId]);

  const handleSubmit = useCallback(async () => {
    if (!userId || !task || !activeYText) return;

    try {
      setConsoleOpen(true);

      const source = buildExercismRunSource({
        solutionCode: activeYText.toString(),
        testCode: task.testCode,
        slug: task.slug,
      });

      console.log('[TaskPage] Running tests with source length:', source.length);

      const execResult = await execute({
        code: source,
        language: 'javascript',
        roomId: roomId || undefined,
        fileId: activeFileId,
      });

      console.log('[TaskPage] Submit result:', execResult);
      console.log('[TaskPage] Execution details:', {
        success: execResult.success,
        error: execResult.error,
        details: execResult.details,
        execution: execResult.execution,
      });

      // Extract execution details safely
      const execution = execResult.execution;
      const exitCode = execution?.exit_code;
      const statusId = execution?.status?.id;
      const stdout = execution?.stdout || '';
      const stderr = execution?.stderr || '';
      const compileOutput = execution?.compile_output || '';

      console.log('[TaskPage] Execution details:', { exitCode, statusId, stdout, stderr, compileOutput });

      // Check if tests passed (status 3 = Accepted, exit code 0)
      const testsPassed = execResult.success && exitCode === 0 && statusId === 3;

      if (testsPassed) {
        // Mark as completed locally FIRST (before broadcasting)
        setCompleted(true);

        // Broadcast completion to all room members via Yjs
        // This ensures all users see the task as completed
        if (taskCompletionMapRef.current && ydoc) {
          ydoc.transact(() => {
            taskCompletionMapRef.current?.set('completed', true);
            taskCompletionMapRef.current?.set('completedBy', userName);
            taskCompletionMapRef.current?.set('completedAt', new Date().toISOString());
          });
          console.log('[TaskPage] Broadcasted task completion to room');
        }

        // Save to database
        const result = await completeTask(slug, 'javascript');
        console.log('[TaskPage] Database completion result:', result);
        
        if (result.success) {
          success('🎉 Task completed successfully!');
          
          // Dispatch custom event to notify tasks page to refresh stats
          window.dispatchEvent(new CustomEvent('task-completed', { 
            detail: { slug, taskDifficulty: task.difficulty } 
          }));
        } else {
          console.warn('[TaskPage] Database completion returned non-success:', result);
        }
      } else {
        // Show error if tests failed
        if (execResult.error) {
          showError(execResult.error);
        } else if (compileOutput) {
          showError('Compilation failed. Check console for details.');
        } else if (stderr) {
          showError('Tests failed. Check console for details.');
        } else if (stdout && stdout.includes('failed')) {
          showError('Some tests failed. Check console for details.');
        } else {
          showError('Submission failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Failed to submit:', error);
      showError(error instanceof Error ? error.message : 'Failed to submit. Please try again.');
    }
  }, [userId, slug, task, activeYText, execute, roomId, activeFileId, completeTask, success, showError, userName, ydoc]);

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
    if (signInError) setAuthError(signInError.message);
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
    if (signUpError) setAuthError(signUpError.message);
  };

  const handleOAuthSignIn = async (providerName: 'google' | 'github') => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: providerName,
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) setAuthError(error.message);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (difficulty <= 6) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 3) return 'Easy';
    if (difficulty <= 6) return 'Medium';
    return 'Hard';
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <Code2 className="h-12 w-12 mx-auto text-primary" />
              <div>
                <p className="font-medium">Sign in required</p>
                <p className="text-sm text-muted-foreground">
                  Please sign in to open and solve this task.
                </p>
              </div>

              <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">Sign in / Register</Button>
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
                    {authError && (
                      <div className="text-xs text-destructive">{authError}</div>
                    )}
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

                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
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

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOAuthSignIn('google')}
                      >
                        Google
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOAuthSignIn('github')}
                      >
                        GitHub
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

              <Link href="/tasks">
                <Button variant="outline" className="w-full">
                  Back to tasks
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading task...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-card border-b">
        <div className="flex items-center gap-4">
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-semibold">{task.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getDifficultyColor(task.difficulty)}`}>
                {getDifficultyLabel(task.difficulty)}
              </span>
              <Badge variant={connected ? 'default' : 'secondary'} className="text-xs">
                {connected ? 'Connected' : collabError ? 'Disconnected' : 'Connecting'}
              </Badge>
              {completed && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {task.type}
              </Badge>
              {task.topics.slice(0, 3).map((topic) => (
                <Badge key={topic} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Room ID Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
            <span className="text-xs text-muted-foreground">Room:</span>
            <span className="text-xs font-mono font-medium">{roomId.slice(5, 13)}...</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-background"
              onClick={copyRoomId}
              title="Copy room ID"
            >
              <Copy className="h-3 w-3" />
            </Button>
            {copied && (
              <span className="text-xs text-green-500">Copied!</span>
            )}
          </div>

          {/* Access Control Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenRoomAccess}
            className="h-8 px-2 text-xs"
          >
            <ShieldCheck className="h-3 w-3 mr-1" />
            Access
          </Button>

          <CollaboratorsPanel
            peers={peers}
            currentUserName={userName}
            currentUserId={userId}
          />

          <Button
            size="sm"
            variant={chatOpen ? 'default' : 'outline'}
            onClick={() => setChatOpen(!chatOpen)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>

          <Button
            size="sm"
            variant={videoPanelOpen ? 'default' : 'outline'}
            onClick={() => {
              setVideoPanelOpen(!videoPanelOpen);
              if (!videoPanelOpen && !videoEnabled) setVideoEnabled(true);
            }}
          >
            {videoPanelOpen || videoEnabled ? (
              <Video className="h-4 w-4 mr-2" />
            ) : (
              <VideoOff className="h-4 w-4 mr-2" />
            )}
            Video
          </Button>

          <Button
            onClick={handleRunCode}
            size="sm"
            variant="outline"
            disabled={isRunning}
          >
            <Play className="h-4 w-4 mr-2" />
            Run
          </Button>
          <Button
            onClick={handleSubmit}
            size="sm"
            disabled={completed || !userId || isRunning}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {completed ? 'Completed' : 'Submit'}
          </Button>

          <Button size="sm" variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Main Content - Split Panel */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          {/* Left Panel - Instructions */}
          <ResizablePanel defaultSize={40} minSize={25}>
            <ScrollArea className="h-full">
              <div className="p-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: ({ className, children }: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            return match ? (
                              <pre className="bg-muted rounded-md p-4 my-4 overflow-x-auto">
                                <code className="text-sm font-mono">{children}</code>
                              </pre>
                            ) : (
                              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                                {children}
                              </code>
                            );
                          },
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-bold mb-4">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-semibold mb-3 mt-6">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-semibold mb-2 mt-4">{children}</h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-muted-foreground mb-4">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
                          ),
                          li: ({ children }) => (
                            <li className="text-muted-foreground">{children}</li>
                          ),
                        }}
                      >
                        {task.instructions || task.description}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Editor */}
          <ResizablePanel defaultSize={60} minSize={25}>
            <div className="flex flex-col h-full overflow-hidden">
              {/* Editor */}
              <div className="flex-1 min-h-0 relative">
                <MonacoEditor
                  yText={activeYText}
                  language="javascript"
                  editorRef={editorRef}
                  onCursorPositionChange={updateCursorPosition}
                />
                <CursorOverlay cursors={remoteCursors} editorRef={editorRef as any} />
              </div>

              {/* Console Output */}
              {consoleOpen && (
                <div className="flex-shrink-0 border-t bg-card" style={{ height: '250px' }}>
                  <ConsoleOutput
                    isOpen={true}
                    output={output}
                    error={executionError}
                    onClose={() => setConsoleOpen(false)}
                    isRunning={isRunning}
                  />
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {chatOpen && (
          <ChatPanel
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            roomId={roomId}
            userId={userId}
            userName={userName}
            provider={provider}
          />
        )}

        {videoPanelOpen && (
          <VideoPanel
            isOpen={videoPanelOpen}
            onClose={() => {
              setVideoPanelOpen(false);
              if (videoEnabled) setVideoEnabled(false);
            }}
            roomId={roomId}
            userId={userId}
            userName={userName}
            provider={provider}
            enabled={videoEnabled}
            onToggleEnabled={() => setVideoEnabled(!videoEnabled)}
          />
        )}
      </div>

      {/* Room Access Dialog */}
      <Dialog open={roomAccessDialogOpen} onOpenChange={setRoomAccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collaborative Session Access</DialogTitle>
            <DialogDescription>
              Share this room to collaborate on the task with others
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-4">
              {/* Room ID */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Room ID</label>
                <div className="flex items-center gap-2">
                  <Input value={roomId} readOnly className="font-mono text-xs" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyRoomId}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this room ID with others to collaborate in real-time
                </p>
              </div>

              {/* Access Level Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Who can access this room?</label>
                  {!roomIsOwner && (
                    <span className="text-[10px] text-muted-foreground">
                      Only the room creator can change this.
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!roomIsOwner || roomAccessSaving}
                    onClick={() => handleUpdateRoomAccess('OWNER')}
                    className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                      roomAccessLevel === 'OWNER'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:bg-muted/60'
                    } ${!roomIsOwner ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium mb-1">Owner only</div>
                    <p className="text-[11px] text-muted-foreground">
                      Only you can join this room.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={!roomIsOwner || roomAccessSaving}
                    onClick={() => handleUpdateRoomAccess('ANYONE_WITH_LINK')}
                    className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                      roomAccessLevel === 'ANYONE_WITH_LINK'
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:bg-muted/60'
                    } ${!roomIsOwner ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium mb-1">Anyone with link</div>
                    <p className="text-[11px] text-muted-foreground">
                      Anyone with the room ID can join.
                    </p>
                  </button>
                </div>

                <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-xs text-blue-500">
                    <strong>Note:</strong> Task collaboration sessions are temporary.
                    Access settings are shared via Yjs but not persisted to the database.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSaveRoomAccess}
              disabled={roomAccessSaving}
            >
              {roomAccessSaving ? 'Saving...' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
