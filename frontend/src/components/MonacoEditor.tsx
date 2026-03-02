'use client';

import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';

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

    // Create new Yjs binding
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
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [yText, onValueChange]);

  useEffect(() => {
    if (editorRef.current && language) {
      monaco.editor.setModelLanguage(editorRef.current.getModel()!, language);
    }
  }, [language]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
