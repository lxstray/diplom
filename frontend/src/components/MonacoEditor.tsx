'use client';

import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

// Configure Monaco web workers so that language services (autocomplete, diagnostics)
// work correctly in the browser with Next.js.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).MonacoEnvironment = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getWorker(_: string, label: string) {
      if (label === 'typescript' || label === 'javascript') {
        return new Worker(
          new URL(
            'monaco-editor/esm/vs/language/typescript/ts.worker.js',
            import.meta.url,
          ),
        );
      }
      if (label === 'json') {
        return new Worker(
          new URL(
            'monaco-editor/esm/vs/language/json/json.worker.js',
            import.meta.url,
          ),
        );
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new Worker(
          new URL(
            'monaco-editor/esm/vs/language/css/css.worker.js',
            import.meta.url,
          ),
        );
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new Worker(
          new URL(
            'monaco-editor/esm/vs/language/html/html.worker.js',
            import.meta.url,
          ),
        );
      }

      return new Worker(
        new URL(
          'monaco-editor/esm/vs/editor/editor.worker.js',
          import.meta.url,
        ),
      );
    },
  };
}

interface MonacoEditorProps {
  yText: Y.Text | null;
  language?: string;
  onCursorPositionChange?: (
    line: number,
    column: number,
    selection?: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    } | null
  ) => void;
  editorRef?: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
}

export default function MonacoEditor({
  yText,
  language = 'javascript',
  onCursorPositionChange,
  editorRef: externalEditorRef,
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  
  const editorRef = externalEditorRef || internalEditorRef;

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = monaco.editor.create(containerRef.current, {
      language,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      scrollBeyondLastLine: false,
    });

    editorRef.current = editor;
    
    // Track cursor position and selection changes
    if (onCursorPositionChange) {
      const emitCursor = () => {
        const position = editor.getPosition();
        const selection = editor.getSelection();

        if (!position) return;

        if (selection) {
          onCursorPositionChange(position.lineNumber, position.column, {
            startLine: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLine: selection.endLineNumber,
            endColumn: selection.endColumn,
          });
        } else {
          onCursorPositionChange(position.lineNumber, position.column, null);
        }
      };

      editor.onDidChangeCursorPosition(() => {
        emitCursor();
      });

      editor.onDidChangeCursorSelection(() => {
        emitCursor();
      });
    }

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      editor.dispose();
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current || !yText) return;

    const editor = editorRef.current;

    // Dispose previous binding if exists
    if (bindingRef.current) {
      bindingRef.current.destroy();
    }

    const binding = new MonacoBinding(
      yText,
      editor.getModel()!,
      new Set([editor as any]),
    );

    bindingRef.current = binding;
  }, [yText]);

  useEffect(() => {
    if (!editorRef.current || !language) return;

    // Map UI language options to Monaco language identifiers
    const languageId = (() => {
      switch (language) {
        case 'javascript':
          return 'javascript';
        case 'typescript':
          return 'typescript';
        case 'python':
          return 'python';
        case 'java':
          return 'java';
        case 'cpp':
          return 'cpp';
        case 'go':
          return 'go';
        case 'rust':
          return 'rust';
        default:
          return 'plaintext';
      }
    })();

    monaco.editor.setModelLanguage(
      editorRef.current.getModel()!,
      languageId
    );
  }, [language]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
