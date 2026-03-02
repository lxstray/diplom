export interface FileMetadata {
  id: string;
  name: string;
  language: string;
  createdAt: number;
  updatedAt: number;
}

export interface FileContent {
  [fileId: string]: string;
}

export interface ProjectFiles {
  files: Map<string, FileMetadata>;
  activeFileId: string | null;
}
