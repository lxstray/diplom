'use client';

import * as Y from 'yjs';
import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { File, FolderPlus, Trash2, Edit2, Code2, Folder, FilePlus } from 'lucide-react';
import type { FileMetadata } from '@/types/files';

interface FileTreeProps {
  yFiles: Y.Map<FileMetadata>;
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
}

type TreeNode =
  | {
      type: 'folder';
      name: string;
      path: string;
      children: TreeNode[];
    }
  | {
      type: 'file';
      id: string;
      name: string;
      path: string;
      language: string;
    };

export function FileTree({ yFiles, activeFileId, onFileSelect }: FileTreeProps) {
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState('javascript');
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Force re-render when the shared Y.Map changes so remote users
  // immediately see new / renamed / deleted files.
  const [version, setVersion] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(
    () => ({ '/': true }),
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: TreeNode | null;
  } | null>(null);

  useEffect(() => {
    const observer = () => {
      setVersion((v) => v + 1);
    };

    yFiles.observe(observer);
    return () => {
      yFiles.unobserve(observer);
    };
  }, [yFiles]);

  const files = useMemo(
    () =>
      Array.from(yFiles.entries()).map(([id, metadata]) => {
        const parts = metadata.name.split('/');
        const folderPath =
          parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') : '';
        const fileName = parts[parts.length - 1] || metadata.name;

        return {
          id,
          name: fileName,
          folderPath,
          language: metadata.language,
          createdAt: metadata.createdAt,
          updatedAt: metadata.updatedAt,
        };
      }),
    [yFiles, version],
  );

  const tree = useMemo(() => {
    const root: TreeNode = { type: 'folder', name: '', path: '/', children: [] };

    const folderMap = new Map<string, TreeNode>();
    folderMap.set('/', root);

    for (const file of files) {
      const fullPath = file.folderPath ? `${file.folderPath}/${file.name}` : file.name;
      const segments = fullPath.split('/');

      let currentPath = '/';
      let parent: any = root;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const isLast = i === segments.length - 1;

        if (isLast) {
          // Skip placeholder files used only to create empty folders
          if (segment === '.gitkeep') {
            break;
          }
          parent.children.push({
            type: 'file',
            id: file.id,
            name: segment,
            path: fullPath,
            language: file.language,
          });
        } else {
          currentPath =
            currentPath === '/' ? `/${segment}` : `${currentPath}/${segment}`;

          let folder: any = folderMap.get(currentPath);
          if (!folder) {
            folder = {
              type: 'folder',
              name: segment,
              path: currentPath,
              children: [],
            };
            parent.children.push(folder);
            folderMap.set(currentPath, folder);
          }
          parent = folder;
        }
      }
    }

    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      for (const node of nodes) {
        if (node.type === 'folder') {
          sortNodes(node.children);
        }
      }
    };

    sortNodes(root.children);
    return root;
  }, [files]);

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

  const handleCreateFolder = useCallback(() => {
    if (!newFolderName.trim()) return;

    const folderPath = newFolderName.replace(/\/+$/, '');
    if (!folderPath) return;

    yFiles.doc?.transact(() => {
      const fileId = crypto.randomUUID();
      const now = Date.now();
      yFiles.set(fileId, {
        id: fileId,
        name: `${folderPath}/.gitkeep`,
        language: 'folder',
        createdAt: now,
        updatedAt: now,
      });
    });

    setNewFolderName('');
    setNewFolderDialogOpen(false);
  }, [yFiles, newFolderName]);

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

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  }, []);

  const renderTree = (node: TreeNode, depth = 0) => {
    if (node.type === 'file') {
      const isActive = activeFileId === node.id;
      return (
        <div
          key={node.id}
          className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
            isActive ? 'bg-primary/20 text-primary' : 'hover:bg-muted'
          }`}
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => onFileSelect(node.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              node,
            });
          }}
        >
          <File className={`h-4 w-4 ${getLanguageIcon(node.language)}`} />
          {editingFileId === node.id ? (
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
              <span className="text-sm flex-1 truncate">{node.name}</span>
              <Badge variant="secondary" className="text-xs h-5">
                {node.language}
              </Badge>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    const file = yFiles.get(node.id);
                    if (file) {
                      handleStartRename(file);
                    }
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
                    handleDeleteFile(node.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </div>
      );
    }

    const isRoot = node.path === '/';
    const isExpanded = expandedFolders[node.path] ?? true;

    return (
      <div key={node.path}>
        {!isRoot && (
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted text-sm"
            style={{ paddingLeft: 8 + depth * 12 }}
            onClick={() => toggleFolder(node.path)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                node,
              });
            }}
          >
            <Folder
              className={`h-4 w-4 ${
                isExpanded ? 'text-blue-400' : 'text-muted-foreground'
              }`}
            />
            <span className="truncate">{node.name}</span>
          </div>
        )}
        {isExpanded &&
          node.children.map((child) => renderTree(child, isRoot ? depth : depth + 1))}
      </div>
    );
  };

  return (
    <div
      className="h-full flex flex-col"
      onClick={() => {
        if (contextMenu) setContextMenu(null);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <span className="text-sm font-semibold">Files</span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setNewFolderDialogOpen(true)}
            title="New Folder"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setNewFileDialogOpen(true)}
            title="New File"
          >
            <FilePlus className="h-4 w-4" />
          </Button>
        </div>
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
          <div className="space-y-1">{renderTree(tree)}</div>
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
                placeholder="folder/example.ts"
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
      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Folder Path</label>
              <Input
                placeholder="src/components"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewFolderDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {contextMenu && contextMenu.node && (
        <div
          className="fixed z-50 min-w-[160px] rounded-md border bg-popover text-popover-foreground shadow-md"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => {
            e.stopPropagation();
            setContextMenu(null);
          }}
        >
          {(() => {
            const node = contextMenu.node!;

            const getBaseFolder = () => {
              if (node.type === 'folder') {
                return node.path === '/' ? '' : node.path.replace(/^\/+/, '');
              }
              const parts = node.path.split('/');
              if (parts.length <= 1) return '';
              return parts.slice(0, parts.length - 1).join('/').replace(/^\/+/, '');
            };

            const baseFolder = getBaseFolder();

            const commonItems = (
              <>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setContextMenu(null);
                    setNewFileName(baseFolder ? `${baseFolder}/` : '');
                    setNewFileDialogOpen(true);
                  }}
                >
                  New File
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setContextMenu(null);
                    setNewFolderName(baseFolder ? `${baseFolder}/` : '');
                    setNewFolderDialogOpen(true);
                  }}
                >
                  New Folder
                </button>
                <div className="h-px bg-border my-1" />
              </>
            );

            if (node.type === 'file') {
              return (
                <div className="py-1">
                  {commonItems}
                  <button
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setContextMenu(null);
                      const file = yFiles.get(node.id);
                      if (file) {
                        handleStartRename(file);
                      }
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-muted"
                    onClick={() => {
                      setContextMenu(null);
                      handleDeleteFile(node.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              );
            }

            // Folder-specific actions
            return (
              <div className="py-1">
                {commonItems}
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setContextMenu(null);
                    const currentFolder =
                      node.path === '/' ? '' : node.path.replace(/^\/+/, '');
                    const newName = window.prompt('Rename folder', currentFolder);
                    if (!newName || newName === currentFolder) return;

                    const normalizedOld = currentFolder;
                    const normalizedNew = newName.replace(/\/+$/, '');

                    yFiles.doc?.transact(() => {
                      for (const [id, metadata] of Array.from(yFiles.entries())) {
                        const name = metadata.name;
                        if (
                          !normalizedOld ||
                          !(
                            name === normalizedOld ||
                            name.startsWith(`${normalizedOld}/`)
                          )
                        ) {
                          continue;
                        }

                        const suffix =
                          name.length === normalizedOld.length
                            ? ''
                            : name.slice(normalizedOld.length + 1);
                        const updatedName = suffix
                          ? `${normalizedNew}/${suffix}`
                          : normalizedNew;

                        yFiles.set(id, {
                          ...metadata,
                          name: updatedName,
                          updatedAt: Date.now(),
                        });
                      }
                    });
                  }}
                >
                  Rename
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-muted"
                  onClick={() => {
                    setContextMenu(null);
                    const currentFolder =
                      node.path === '/' ? '' : node.path.replace(/^\/+/, '');
                    if (!currentFolder) return;

                    if (
                      !window.confirm(
                        `Delete folder "${currentFolder}" and all its contents?`,
                      )
                    ) {
                      return;
                    }

                    yFiles.doc?.transact(() => {
                      for (const [id, metadata] of Array.from(yFiles.entries())) {
                        const name = metadata.name;
                        if (
                          name === currentFolder ||
                          name.startsWith(`${currentFolder}/`)
                        ) {
                          yFiles.delete(id);
                        }
                      }
                    });
                  }}
                >
                  Delete
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
