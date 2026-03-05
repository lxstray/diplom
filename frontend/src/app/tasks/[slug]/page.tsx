'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const slug = params.slug as string;

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

  const [chatOpen, setChatOpen] = useState(false);
  const [videoPanelOpen, setVideoPanelOpen] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

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

  const roomId = useMemo(() => (userId ? `task:${slug}` : ''), [userId, slug]);
  const { ydoc, provider, yFiles, yFileTexts, connected, error: collabError, peers } =
    useCollaboration({
      roomId,
      userName,
    });

  const activeFileId = 'solution';

  const activeYText = useMemo(() => {
    if (!ydoc || !yFileTexts) return null;

    let text = yFileTexts.get(activeFileId) as Y.Text | undefined;
    if (!text) {
      const newText = new Y.Text();
      ydoc.transact(() => {
        yFileTexts.set(activeFileId, newText);
      });
      text = newText;
    }
    return text;
  }, [ydoc, yFileTexts]);

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

  // Ensure the solution file exists in the Yjs doc (no file tree UI, but the doc schema is reused).
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
  useEffect(() => {
    if (!ydoc || !activeYText || !task) return;
    if (activeYText.length > 0) return;

    ydoc.transact(() => {
      activeYText.insert(0, task.starterCode || '');
    });
  }, [ydoc, activeYText, task]);

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

  const handleSubmit = useCallback(async () => {
    if (!userId || !task || !activeYText) return;

    try {
      setConsoleOpen(true);

      const source = buildExercismRunSource({
        solutionCode: activeYText.toString(),
        testCode: task.testCode,
        slug: task.slug,
      });

      const execResult = await execute({
        code: source,
        language: 'javascript',
        roomId: roomId || undefined,
        fileId: activeFileId,
      });

      console.log('[TaskPage] Submit result:', execResult);

      const exitCode = execResult.execution?.exit_code;
      const statusId = execResult.execution?.status?.id;

      // Check if tests passed (status 3 = Accepted, exit code 0)
      if (execResult.success && exitCode === 0 && statusId === 3) {
        const result = await completeTask(slug, 'javascript');
        if (result.success) {
          setCompleted(true);
          success('🎉 Task completed successfully!');
        }
      } else {
        // Show error if tests failed
        const stdout = execResult.execution?.stdout || '';
        const stderr = execResult.execution?.stderr || '';
        const compileOutput = execResult.execution?.compile_output || '';
        
        if (compileOutput) {
          showError('Compilation failed. Check console for details.');
        } else if (stderr) {
          showError('Tests failed. Check console for details.');
        } else if (stdout.includes('failed')) {
          showError('Some tests failed. Check console for details.');
        } else {
          showError('Submission failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Failed to submit:', error);
      showError('Failed to submit. Please try again.');
    }
  }, [userId, slug, task, activeYText, execute, roomId, activeFileId, completeTask, success, showError]);

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

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
