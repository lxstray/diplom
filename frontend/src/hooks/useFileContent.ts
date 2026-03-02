'use client';

import { useCallback, useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { FileMetadata } from '@/types/files';

interface UseFileContentOptions {
  yText: Y.Text | null;
  yFiles: Y.Map<FileMetadata> | null;
  activeFileId: string | null;
}

export function useFileContent({ yText, yFiles, activeFileId }: UseFileContentOptions) {
  const [content, setContent] = useState('');

  // Get current file metadata
  const currentFile = activeFileId && yFiles ? yFiles.get(activeFileId) : null;

  // Update content when active file changes
  useEffect(() => {
    if (!yText || !activeFileId) {
      setContent('');
      return;
    }

    // Store file content in Y.Text when switching files
    const previousContent = yText.toString();
    
    // Try to get content from file metadata or use current Y.Text
    const fileContent = currentFile?.id === activeFileId ? previousContent : '';
    setContent(fileContent);
  }, [activeFileId, yText]);

  // Update file content
  const updateContent = useCallback(
    (newContent: string) => {
      if (!yText || !activeFileId || !yFiles) return;

      yText.delete(0, yText.length);
      yText.insert(0, newContent);

      // Update file metadata timestamp
      const file = yFiles.get(activeFileId);
      if (file) {
        yFiles.set(activeFileId, {
          ...file,
          updatedAt: Date.now(),
        });
      }
    },
    [yText, yFiles, activeFileId],
  );

  return { content, updateContent, currentFile };
}
