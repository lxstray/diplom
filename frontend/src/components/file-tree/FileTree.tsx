'use client';

import * as Y from 'yjs';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { File, FolderPlus, Trash2, Edit2, Code2 } from 'lucide-react';
import type { FileMetadata } from '@/types/files';

interface FileTreeProps {
  yFiles: Y.Map<FileMetadata>;
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
}

export function FileTree({ yFiles, activeFileId, onFileSelect }: FileTreeProps) {
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState('javascript');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const files = Array.from(yFiles.entries()).map(([id, metadata]) => ({
    id,
    name: metadata.name,
    language: metadata.language,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
  }));

  const handleCreateFile = useCallback(() => {
    if (!newFileName.trim()) return;

    yFiles.doc?.transact(() => {
      const fileId = crypto.randomUUID();
      const now = Date.now();
      yFiles.set(fileId, {
        id: fileId,
        name: newFileName.trim(),
        language: newFileLanguage,
        createdAt: now,
        updatedAt: now,
      });
    });

    setNewFileName('');
    setNewFileLanguage('javascript');
    setNewFileDialogOpen(false);
  }, [yFiles, newFileName, newFileLanguage]);

  const handleDeleteFile = useCallback(
    (fileId: string) => {
      yFiles.delete(fileId);
      if (activeFileId === fileId) {
        const remainingFiles = Array.from(yFiles.entries());
        if (remainingFiles.length > 0) {
          onFileSelect(remainingFiles[0][0]);
        }
      }
    },
    [yFiles, activeFileId, onFileSelect],
  );

  const handleStartRename = useCallback((file: FileMetadata) => {
    setEditingFileId(file.id);
    setEditingName(file.name);
  }, []);

  const handleFinishRename = useCallback(() => {
    if (!editingFileId || !editingName.trim()) {
      setEditingFileId(null);
      setEditingName('');
      return;
    }

    const file = yFiles.get(editingFileId);
    if (file) {
      yFiles.set(editingFileId, {
        ...file,
        name: editingName.trim(),
        updatedAt: Date.now(),
      });
    }

    setEditingFileId(null);
    setEditingName('');
  }, [yFiles, editingFileId, editingName]);

  const getLanguageIcon = (language: string) => {
    const colors: Record<string, string> = {
      javascript: 'text-yellow-400',
      typescript: 'text-blue-400',
      python: 'text-green-400',
      java: 'text-red-400',
      cpp: 'text-purple-400',
      go: 'text-cyan-400',
      rust: 'text-orange-400',
    };
    return colors[language] || 'text-gray-400';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <span className="text-sm font-semibold">Files</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => setNewFileDialogOpen(true)}
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
            <Code2 className="h-8 w-8 mb-2 opacity-50" />
            <span>No files yet</span>
            <span className="text-xs">Create a file to get started</span>
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.id}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                  activeFileId === file.id
                    ? 'bg-primary/20 text-primary'
                    : 'hover:bg-muted'
                }`}
                onClick={() => onFileSelect(file.id)}
              >
                <File className={`h-4 w-4 ${getLanguageIcon(file.language)}`} />

                {editingFileId === file.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename();
                      if (e.key === 'Escape') {
                        setEditingFileId(null);
                        setEditingName('');
                      }
                    }}
                    className="h-6 text-xs flex-1"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <Badge variant="secondary" className="text-xs h-5">
                      {file.language}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(file);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New File Dialog */}
      <Dialog open={newFileDialogOpen} onOpenChange={setNewFileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">File Name</label>
              <Input
                placeholder="example.ts"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFile();
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <select
                value={newFileLanguage}
                onChange={(e) => setNewFileLanguage(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewFileDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFile}>Create File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
