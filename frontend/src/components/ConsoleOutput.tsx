'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Terminal, X, Clock, MemoryStick, AlertCircle, CheckCircle } from 'lucide-react';

export interface ConsoleOutputProps {
  isOpen: boolean;
  onClose: () => void;
  output?: {
    message?: string;
    stdout?: string;
    stderr?: string;
    compile_output?: string;
    status?: {
      id: number;
      description: string;
    };
    time?: string;
    memory?: number;
    exit_code?: number;
  };
  isRunning?: boolean;
  error?: string;
}

export function ConsoleOutput({
  isOpen,
  onClose,
  output,
  isRunning = false,
  error,
}: ConsoleOutputProps) {
  console.log('[ConsoleOutput] Props:', { isOpen, output, isRunning, error });

  if (!isOpen) return null;

  const hasOutput = output || error || isRunning;

  const getStatusBadge = () => {
    if (isRunning) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3 animate-spin" />
          Running...
        </Badge>
      );
    }

    if (!output?.status) return null;

    const statusId = output.status.id;
    const statusDesc = output.status.description;

    // Status IDs from Judge0: 3=Accepted, others are errors
    if (statusId === 3) {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          {statusDesc}
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        {statusDesc}
      </Badge>
    );
  };

  const getMetrics = () => {
    if (!output || isRunning) return null;

    return (
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {output.time && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{output.time}s</span>
          </div>
        )}
        {output.memory && (
          <div className="flex items-center gap-1">
            <MemoryStick className="h-3 w-3" />
            <span>{output.memory} KB</span>
          </div>
        )}
        {output.exit_code !== undefined && (
          <div className="flex items-center gap-1">
            <span>Exit: {output.exit_code}</span>
          </div>
        )}
      </div>
    );
  };

  const renderOutput = () => {
    if (isRunning) {
      return (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Clock className="h-6 w-6 animate-spin" />
            <span>Executing code...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-destructive text-sm font-mono whitespace-pre-wrap">
          {error}
        </div>
      );
    }

    if (!output) {
      return (
        <div className="text-muted-foreground text-sm italic">
          Click the Run button to execute your code
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Debug info */}
        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
          Status: {output.status?.id} ({output.status?.description}) | 
          Exit Code: {output.exit_code} | 
          Time: {output.time}s | 
          Memory: {output.memory}KB
        </div>

        {/* Judge0 internal message */}
        {output.message && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Message</div>
            <pre className="bg-muted/50 rounded-md p-3 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-40">
              {output.message}
            </pre>
          </div>
        )}

        {/* Compile errors */}
        {output.compile_output && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Compile Output</div>
            <pre className="bg-muted/50 rounded-md p-3 text-sm text-destructive font-mono whitespace-pre-wrap overflow-auto max-h-40">
              {output.compile_output}
            </pre>
          </div>
        )}

        {/* Runtime errors */}
        {output.stderr && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Errors</div>
            <pre className="bg-muted/50 rounded-md p-3 text-sm text-destructive font-mono whitespace-pre-wrap overflow-auto max-h-40">
              {output.stderr}
            </pre>
          </div>
        )}

        {/* Standard output - ALWAYS show this section for test results */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">
            {output.stdout ? 'Test Output' : 'Output (empty)'}
          </div>
          <pre className="bg-muted/50 rounded-md p-3 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-60 min-h-[100px]">
            {output.stdout || '(no output)'}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-t-0 rounded-t-none bg-card h-full flex flex-col">
      <CardHeader className="py-2 px-4 border-b flex flex-row items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Console</CardTitle>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2">
          {getMetrics()}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-auto min-h-0">
        {renderOutput()}
      </CardContent>
    </Card>
  );
}
