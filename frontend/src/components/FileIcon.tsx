import React from 'react';

// Import available file icons from @jetbrains/icons
import fileJs from '@jetbrains/icons/file-js';
import fileTs from '@jetbrains/icons/file-ts';
import fileTsx from '@jetbrains/icons/file-tsx';
import fileHtml from '@jetbrains/icons/file-html';
import fileCss from '@jetbrains/icons/file-css';
import fileJson from '@jetbrains/icons/file-json';
import fileYaml from '@jetbrains/icons/file-yaml';
import fileJava from '@jetbrains/icons/file-java';
import fileKotlin from '@jetbrains/icons/file-kotlin';
import filePython from '@jetbrains/icons/file-python';
import fileGo from '@jetbrains/icons/file-go';
import fileMarkdown from '@jetbrains/icons/file-text'; // or closest
import fileArchive from '@jetbrains/icons/file-archive';
import fileImage from '@jetbrains/icons/image';
import fileText from '@jetbrains/icons/file-text';
import fileAny from '@jetbrains/icons/file';

interface FileIconProps {
  fileName: string;
  className?: string;
}

const ICON_MAP: Record<string, any> = {
  js: fileJs,
  mjs: fileJs,
  cjs: fileJs,
  jsx: fileJs,

  ts: fileTs,
  tsx: fileTsx,

  html: fileHtml,
  htm: fileHtml,
  xhtml: fileHtml,

  css: fileCss,
  scss: fileCss,
  sass: fileCss,
  less: fileCss,

  json: fileJson,
  yaml: fileYaml,
  yml: fileYaml,

  java: fileJava,
  kt: fileKotlin,
  kts: fileKotlin,

  py: filePython,
  pyi: filePython,

  go: fileGo,

  md: fileText,        // limited markdown icon
  markdown: fileText,

  zip: fileArchive,
  tar: fileArchive,
  gz: fileArchive,
  jar: fileArchive,

  png: fileImage,
  jpg: fileImage,
  jpeg: fileImage,
  gif: fileImage,
  webp: fileImage,
  svg: fileImage,
};

const DEFAULT_ICON = fileAny || fileText;

const SPECIAL_NAMES: Record<string, any> = {
  'dockerfile': fileText,
  '.gitignore': fileText,
  '.dockerignore': fileText,
  'license': fileText,
  'readme.md': fileText,
};

function resolveIcon(fileName: string) {
  const lower = fileName.toLowerCase();
  if (SPECIAL_NAMES[lower]) return SPECIAL_NAMES[lower];

  const ext = lower.includes('.') ? lower.split('.').pop() || '' : '';
  return ICON_MAP[ext] || DEFAULT_ICON;
}

export function FileIcon({ fileName, className = 'h-4 w-4' }: FileIconProps) {
  const IconSource = resolveIcon(fileName);

  return (
    <span
      className={`${className} inline-block shrink-0`}
      dangerouslySetInnerHTML={{ __html: IconSource }}
      aria-hidden="true"
    />
  );
}