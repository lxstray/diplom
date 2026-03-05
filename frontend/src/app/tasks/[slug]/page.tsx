'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import MonacoEditor from '@/components/MonacoEditor';
import { ConsoleOutput } from '@/components/ConsoleOutput';
import { useCodeExecution } from '@/hooks/useCodeExecution';
import { supabase } from '@/lib/supabaseClient';
import type { Task } from '@/types/task';
import * as Y from 'yjs';
import type * as monaco from 'monaco-editor';
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  Code2,
  BookOpen,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [completed, setCompleted] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const {
    isRunning,
    error: executionError,
    output,
    execute,
    clearOutput,
  } = useCodeExecution();

  // Yjs setup for local-only editing (no collaboration in task mode)
  const ydocRef = useRef<Y.Doc | null>(null);
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }
  const ydoc = ydocRef.current;

  const yTextRef = useRef<Y.Text | null>(null);
  if (!yTextRef.current) {
    yTextRef.current = ydoc.getText('code');
  }
  const yText = yTextRef.current;

  const recordedAttemptForSlugRef = useRef<string | null>(null);

  // Sync editor content with local state
  useEffect(() => {
    const handler = () => {
      setCode(yText.toString());
    };
    yText.observe(handler);
    return () => yText.unobserve(handler);
  }, [yText]);

  // Load task
  useEffect(() => {
    const loadTask = async () => {
      setLoading(true);
      try {
        const loadedTask = await getTaskBySlug(slug);
        if (!loadedTask) {
          router.push('/tasks');
          return;
        }
        setTask(loadedTask);
        setCode(loadedTask.starterCode);
        
        // Initialize Y.Text with starter code
        ydoc.transact(() => {
          yText.delete(0, yText.length);
          yText.insert(0, loadedTask.starterCode);
        });

        // Record attempt
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id) {
          setUserId(data.session.user.id);
          // Avoid spamming the backend if effects rerun in dev/StrictMode.
          if (recordedAttemptForSlugRef.current !== slug) {
            recordedAttemptForSlugRef.current = slug;
            await recordAttempt(slug);
          }
        }
      } catch (error) {
        console.error('Failed to load task:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [slug, getTaskBySlug, router, ydoc, yText, recordAttempt]);

  const handleRunCode = useCallback(async () => {
    setConsoleOpen(true);
    await execute({
      code: yText.toString(),
      language: 'javascript',
    });
  }, [yText, execute]);

  const handleSubmit = useCallback(async () => {
    if (!userId) return;

    try {
      const result = await completeTask(slug, 'javascript');
      if (result.success) {
        setCompleted(true);
      }
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  }, [userId, slug, completeTask]);

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
            disabled={completed || !userId}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {completed ? 'Completed' : 'Submit'}
          </Button>
        </div>
      </header>

      {/* Main Content - Split Panel */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 overflow-hidden"
      >
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
                        code: ({ node, className, children, ...props }: any) => {
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
          <div className="flex flex-col h-full">
            {/* Editor */}
            <div className="flex-1 relative">
              <MonacoEditor
                yText={yText}
                language="javascript"
                editorRef={editorRef}
              />
            </div>

            {/* Console Output */}
            {consoleOpen && (
              <div className="border-t">
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
    </div>
  );
}
