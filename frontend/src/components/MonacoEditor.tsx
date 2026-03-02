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
  value?: string;
  onValueChange?: (value: string) => void;
}

export default function MonacoEditor({
  yText,
  language = 'javascript',
  value = '',
  onValueChange,
}: MonacoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = monaco.editor.create(containerRef.current, {
      // Initial value comes from Yjs binding; keep local value only as a fallback.
      value,
      language,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      scrollBeyondLastLine: false,
    });

    editorRef.current = editor;

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
      new Set([editor as any])
    );

    bindingRef.current = binding;

    // Listen for changes
    const disposable = editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      onValueChange?.(newValue);
    });

    return () => {
      disposable.dispose();
    };
  }, [yText, onValueChange]);

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
