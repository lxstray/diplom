'use client';

import * as Y from 'yjs';
import type { FileMetadata } from '@/types/files';

interface UseFileContentOptions {
  yFiles: Y.Map<FileMetadata> | null;
  activeFileId: string | null;
}

export function useFileContent({ yFiles, activeFileId }: UseFileContentOptions) {
  // Get current file metadata for the active file
  const currentFile = activeFileId && yFiles ? yFiles.get(activeFileId) : null;

  // For now we let y-monaco manage the actual text content directly in Y.Text
  // and only expose metadata about the current file here.

  return { currentFile };
}
