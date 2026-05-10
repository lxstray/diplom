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
      // Python, Java, C++, Go, Rust use the generic editor worker
      // which provides basic IntelliSense (keywords, snippets, word-based suggestions)
      if (label === 'python' || label === 'java' || label === 'cpp' || 
          label === 'go' || label === 'rust' || label === 'c' || 
          label === 'csharp' || label === 'php') {
        return new Worker(
          new URL(
            'monaco-editor/esm/vs/editor/editor.worker.js',
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

// Configure language-specific IntelliSense features
function configureLanguageFeatures(
  editor: monaco.editor.IStandaloneCodeEditor,
  initialLanguage: string
) {
  // Python language configuration
  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: () => ({
      suggestions: [
        // Python keywords
        { label: 'def', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'def ${1:function_name}(${2:args}):', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define a function' },
        { label: 'class', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'class ${1:ClassName}:${2:}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define a class' },
        { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if ${1:condition}:', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Conditional statement' },
        { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for ${1:item} in ${2:iterable}:', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'For loop' },
        { label: 'while', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'while ${1:condition}:', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'While loop' },
        { label: 'try', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:handle_error}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Try-except block' },
        { label: 'with', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'with ${1:resource} as ${2:var}:', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Context manager' },
        { label: 'import', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'import ${1:module}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Import module' },
        { label: 'from', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'from ${1:module} import ${2:name}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Import from module' },
        { label: 'return', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'return ${1:value}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return statement' },
        { label: 'lambda', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'lambda ${1:args}: ${2:expr}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Lambda function' },
        { label: 'print', kind: monaco.languages.CompletionItemKind.Function, insertText: 'print(${1:message})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Print to console' },
        { label: 'len', kind: monaco.languages.CompletionItemKind.Function, insertText: 'len(${1:obj})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Get length' },
        { label: 'range', kind: monaco.languages.CompletionItemKind.Function, insertText: 'range(${1:start}, ${2:stop}, ${3:step})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Generate range' },
        { label: 'enumerate', kind: monaco.languages.CompletionItemKind.Function, insertText: 'enumerate(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Enumerate with index' },
        { label: 'zip', kind: monaco.languages.CompletionItemKind.Function, insertText: 'zip(${1:iter1}, ${2:iter2})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Zip iterables' },
        { label: 'map', kind: monaco.languages.CompletionItemKind.Function, insertText: 'map(${1:func}, ${2:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Map function' },
        { label: 'filter', kind: monaco.languages.CompletionItemKind.Function, insertText: 'filter(${1:func}, ${2:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Filter function' },
        { label: 'list', kind: monaco.languages.CompletionItemKind.Function, insertText: '[${1:item} for ${2:item} in ${3:iterable}]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'List comprehension' },
        { label: 'dict', kind: monaco.languages.CompletionItemKind.Function, insertText: '{${1:key}: ${2:value} for ${3:key}, ${4:value} in ${5:iterable}}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Dict comprehension' },
      ]
    })
  });

  // Java language configuration
  monaco.languages.registerCompletionItemProvider('java', {
    provideCompletionItems: () => ({
      suggestions: [
        { label: 'public', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'public ', documentation: 'Public access modifier' },
        { label: 'private', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'private ', documentation: 'Private access modifier' },
        { label: 'protected', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'protected ', documentation: 'Protected access modifier' },
        { label: 'class', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'public class ${1:ClassName} {\n    ${2:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define a class' },
        { label: 'interface', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'public interface ${1:InterfaceName} {\n    ${2:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define an interface' },
        { label: 'main', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'public static void main(String[] args) {\n    ${1:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Main method' },
        { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if (${1:condition}) {\n    ${2:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Conditional statement' },
        { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for (${1:int} ${2:i} = 0; ${2:i} < ${3:n}; ${2:i}++) {\n    ${4:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'For loop' },
        { label: 'while', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'while (${1:condition}) {\n    ${2:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'While loop' },
        { label: 'try', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'try {\n    ${1:}\n} catch (${2:Exception} ${3:e}) {\n    ${4:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Try-catch block' },
        { label: 'switch', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'switch (${1:var}) {\n    case ${2:value}:\n        ${3:break;}\n    default:\n        ${4:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Switch statement' },
        { label: 'System.out.println', kind: monaco.languages.CompletionItemKind.Function, insertText: 'System.out.println("${1:message}");', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Print to console' },
        { label: 'return', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'return ${1:value};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return statement' },
        { label: 'new', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'new ${1:ClassName}()', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create new instance' },
      ]
    })
  });

  // C++ language configuration
  monaco.languages.registerCompletionItemProvider('cpp', {
    provideCompletionItems: () => ({
      suggestions: [
        { label: 'include', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '#include <${1:iostream}>', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Include header' },
        { label: 'namespace', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'namespace ${1:name} {', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define namespace' },
        { label: 'class', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'class ${1:ClassName} {\npublic:\n    ${2:}\nprivate:\n    ${3:}\n};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define class' },
        { label: 'struct', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'struct ${1:StructName} {\n    ${2:}\n};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define struct' },
        { label: 'main', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'int main() {\n    ${1:}\n    return 0;\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Main function' },
        { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if (${1:condition}) {\n    ${2:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Conditional statement' },
        { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for (${1:int} ${2:i} = 0; ${2:i} < ${3:n}; ${2:i}++) {\n    ${4:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'For loop' },
        { label: 'while', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'while (${1:condition}) {\n    ${2:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'While loop' },
        { label: 'try', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'try {\n    ${1:}\n} catch (${2:exception}& ${3:e}) {\n    ${4:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Try-catch block' },
        { label: 'cout', kind: monaco.languages.CompletionItemKind.Function, insertText: 'std::cout << "${1:message}" << std::endl;', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Print to console' },
        { label: 'cin', kind: monaco.languages.CompletionItemKind.Function, insertText: 'std::cin >> ${1:var};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Read from input' },
        { label: 'vector', kind: monaco.languages.CompletionItemKind.Function, insertText: 'std::vector<${1:int}> ${2:vec};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Vector container' },
        { label: 'map', kind: monaco.languages.CompletionItemKind.Function, insertText: 'std::map<${1:key}, ${2:value}> ${3:m};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Map container' },
        { label: 'return', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'return ${1:value};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return statement' },
      ]
    })
  });

  // Go language configuration
  monaco.languages.registerCompletionItemProvider('go', {
    provideCompletionItems: () => ({
      suggestions: [
        { label: 'package', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'package ${1:main}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Package declaration' },
        { label: 'import', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'import "${1:fmt}"', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Import package' },
        { label: 'func', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'func ${1:functionName}(${2:args} ${3:type}) ${4:returnType} {\n    ${5:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define function' },
        { label: 'func main', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'func main() {\n    ${1:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Main function' },
        { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if ${1:condition} {\n    ${2:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Conditional statement' },
        { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n    ${3:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'For loop' },
        { label: 'range', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for ${1:key}, ${2:value} := range ${3:collection} {\n    ${4:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Range loop' },
        { label: 'switch', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'switch ${1:var} {\ncase ${2:value}:\n    ${3:}\ndefault:\n    ${4:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Switch statement' },
        { label: 'struct', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'type ${1:StructName} struct {\n    ${2:Field} ${3:type}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define struct' },
        { label: 'fmt.Println', kind: monaco.languages.CompletionItemKind.Function, insertText: 'fmt.Println("${1:message}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Print to console' },
        { label: 'fmt.Printf', kind: monaco.languages.CompletionItemKind.Function, insertText: 'fmt.Printf("${1:format}", ${2:args})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Formatted print' },
        { label: 'make', kind: monaco.languages.CompletionItemKind.Function, insertText: 'make(${1:[]type}, ${2:length}, ${3:capacity})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create slice/map' },
        { label: 'return', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'return ${1:values}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return statement' },
      ]
    })
  });

  // Rust language configuration
  monaco.languages.registerCompletionItemProvider('rust', {
    provideCompletionItems: () => ({
      suggestions: [
        { label: 'fn', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'fn ${1:function_name}(${2:args}: ${3:type}) -> ${4:ReturnType} {\n    ${5:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define function' },
        { label: 'fn main', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'fn main() {\n    ${1:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Main function' },
        { label: 'let', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'let ${1:name} = ${2:value};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Immutable binding' },
        { label: 'let mut', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'let mut ${1:name} = ${2:value};', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Mutable binding' },
        { label: 'struct', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'struct ${1:StructName} {\n    ${2:field}: ${3:type},\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define struct' },
        { label: 'enum', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'enum ${1:EnumName} {\n    ${2:Variant1},\n    ${3:Variant2},\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define enum' },
        { label: 'impl', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'impl ${1:StructName} {\n    fn ${2:new}() -> Self {\n        ${3:}\n    }\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Implementation block' },
        { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if ${1:condition} {\n    ${2:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Conditional statement' },
        { label: 'match', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'match ${1:expr} {\n    ${2:pattern} => ${3:result},\n    _ => ${4:default},\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Pattern matching' },
        { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for ${1:item} in ${2:iterable} {\n    ${3:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'For loop' },
        { label: 'while', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'while ${1:condition} {\n    ${2:}\n}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'While loop' },
        { label: 'println!', kind: monaco.languages.CompletionItemKind.Function, insertText: 'println!("${1:message}");', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Print to console' },
        { label: 'Vec', kind: monaco.languages.CompletionItemKind.Function, insertText: 'let ${1:vec}: Vec<${2:i32}> = vec![${3:1}, ${4:2}, ${5:3}];', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Vector' },
        { label: 'HashMap', kind: monaco.languages.CompletionItemKind.Function, insertText: 'use std::collections::HashMap;\nlet mut ${1:map} = HashMap::new();', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'HashMap' },
        { label: 'return', kind: monaco.languages.CompletionItemKind.Keyword, insertText: '${1:expr}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return (last expression)' },
      ]
    })
  });

  // Enable word-based suggestions for all languages
  monaco.languages.registerDocumentHighlightProvider(initialLanguage, {
    provideDocumentHighlights: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return [];
      
      const highlights: monaco.languages.DocumentHighlight[] = [];
      const matches = model.findMatches(word.word, false, false, true, null, true);
      
      for (const match of matches) {
        highlights.push({
          range: match.range,
          kind: monaco.languages.DocumentHighlightKind.Text,
        });
      }
      
      return highlights;
    },
  });
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
      // Enable IntelliSense features
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      wordBasedSuggestions: 'currentDocument',
      parameterHints: { enabled: true },
      signatureHelp: { enabled: true },
    });

    editorRef.current = editor;

    // Configure language-specific IntelliSense
    configureLanguageFeatures(editor, language);
    
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
    
    // Reconfigure language features when language changes
    configureLanguageFeatures(editorRef.current, languageId);
  }, [language]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
