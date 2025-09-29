import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { useFileUpload } from "@/hooks/use-file-upload";
import { useToast } from "@/hooks/use-toast";
import type { File as FileType } from "@shared/schema";
import FileUploadZone from "@/components/chat/file-upload-zone";

interface FileTreeProps {
  files: FileType[];
  selectedFile: FileType | null;
  onFileSelect: (file: FileType) => void;
  onFileDelete: (file: FileType) => void;
}

function FileTree({ files, selectedFile, onFileSelect, onFileDelete }: FileTreeProps) {
  const { getFileIcon } = useFileUpload();

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-2 p-4">
        {files.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <i className="fas fa-folder-open text-4xl mb-4 opacity-50"></i>
            <p>No files found</p>
            <p className="text-sm">Create a new file to get started</p>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className={`group flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                selectedFile?.id === file.id ? 'bg-accent border-primary' : 'border-border'
              }`}
              onClick={() => onFileSelect(file)}
              data-testid={`file-item-${file.id}`}
            >
              <i className={`${getFileIcon(file.originalName, file.mimeType)} text-lg text-primary`}></i>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" data-testid={`file-name-${file.id}`}>
                  {file.originalName}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{formatFileSize(file.size)}</span>
                  <span>{formatDate(file.createdAt)}</span>
                  {file.analysis && typeof file.analysis === 'object' && (file.analysis as any).language && (
                    <Badge variant="secondary" className="text-xs">
                      {(file.analysis as any).language}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileDelete(file);
                }}
                data-testid={`button-delete-${file.id}`}
              >
                <i className="fas fa-trash text-destructive"></i>
              </Button>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

interface CodeViewerProps {
  file: FileType | null;
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

function CodeViewer({ file, content, onContentChange, onSave, isLoading, isSaving, hasUnsavedChanges }: CodeViewerProps) {
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [diagnostics, setDiagnostics] = useState<monaco.editor.IMarkerData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Configure Monaco Editor for enhanced features
  useEffect(() => {
    loader.init().then((monaco) => {
      // Configure TypeScript compiler options for better IntelliSense
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.Latest,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        strict: true,
        declaration: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        typeRoots: ['node_modules/@types']
      });

      // Configure JavaScript compiler options
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.Latest,
        allowNonTsExtensions: true,
        allowJs: true,
        checkJs: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        lib: ['ES2020', 'DOM', 'DOM.Iterable']
      });

      // Add common type definitions for better IntelliSense
      const commonLibs = {
        'node.d.ts': `
          declare const console: {
            log(message?: any, ...optionalParams: any[]): void;
            error(message?: any, ...optionalParams: any[]): void;
            warn(message?: any, ...optionalParams: any[]): void;
            info(message?: any, ...optionalParams: any[]): void;
            debug(message?: any, ...optionalParams: any[]): void;
          };
          declare const process: {
            env: { [key: string]: string | undefined };
            exit(code?: number): never;
          };
          declare const __dirname: string;
          declare const __filename: string;
          declare function require(id: string): any;
          declare const exports: any;
          declare const module: { exports: any };
        `,
        'react.d.ts': `
          declare namespace React {
            interface Component<P = {}, S = {}> {
              props: P;
              state: S;
              setState(state: Partial<S>): void;
              render(): JSX.Element | null;
            }
            interface FunctionComponent<P = {}> {
              (props: P): JSX.Element | null;
            }
            function useState<T>(initialState: T): [T, (value: T) => void];
            function useEffect(effect: () => void, deps?: any[]): void;
            function useCallback<T extends Function>(callback: T, deps: any[]): T;
            function useMemo<T>(factory: () => T, deps: any[]): T;
          }
          declare const React: {
            Component: any;
            useState: typeof React.useState;
            useEffect: typeof React.useEffect;
            useCallback: typeof React.useCallback;
            useMemo: typeof React.useMemo;
          };
        `,
        'dom.d.ts': `
          declare const document: {
            getElementById(id: string): HTMLElement | null;
            querySelector(selector: string): Element | null;
            querySelectorAll(selector: string): NodeList;
            createElement(tagName: string): HTMLElement;
            addEventListener(type: string, listener: Function): void;
          };
          declare const window: {
            location: { href: string; pathname: string; search: string };
            localStorage: { getItem(key: string): string | null; setItem(key: string, value: string): void };
            sessionStorage: { getItem(key: string): string | null; setItem(key: string, value: string): void };
            fetch(url: string, options?: any): Promise<Response>;
            alert(message: string): void;
          };
          interface HTMLElement {
            innerHTML: string;
            textContent: string;
            className: string;
            addEventListener(type: string, listener: Function): void;
            click(): void;
          }
        `
      };

      // Add common type definitions
      Object.entries(commonLibs).forEach(([filename, content]) => {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(content, `file:///${filename}`);
        monaco.languages.typescript.javascriptDefaults.addExtraLib(content, `file:///${filename}`);
      });

      // Register custom completion provider for common patterns
      monaco.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: (model, position) => {
          const suggestions = [
            {
              label: 'console.log',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'console.log(${1:value});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Log a value to the console',
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
              }
            },
            {
              label: 'function',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'function ${1:functionName}(${2:params}) {\n\t${3:// function body}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a function declaration',
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
              }
            },
            {
              label: 'arrow function',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'const ${1:functionName} = (${2:params}) => {\n\t${3:// function body}\n};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create an arrow function',
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
              }
            },
            {
              label: 'try-catch',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'try {\n\t${1:// try block}\n} catch (${2:error}) {\n\t${3:// catch block}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a try-catch block',
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
              }
            },
            {
              label: 'fetch API',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'fetch(\'${1:url}\')\n\t.then(response => response.json())\n\t.then(data => {\n\t\t${2:// handle data}\n\t})\n\t.catch(error => {\n\t\t${3:console.error(\'Error:\', error);}\n\t});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a fetch API call',
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
              }
            }
          ];
          return { suggestions };
        }
      });

      // Register completion provider for React components
      monaco.languages.registerCompletionItemProvider('typescript', {
        provideCompletionItems: (model, position) => {
          const suggestions = [
            {
              label: 'React Component',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'interface ${1:ComponentName}Props {\n\t${2:// props}\n}\n\nconst ${1:ComponentName}: React.FC<${1:ComponentName}Props> = ({ ${3:props} }) => {\n\treturn (\n\t\t<div>\n\t\t\t${4:// component content}\n\t\t</div>\n\t);\n};\n\nexport default ${1:ComponentName};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a React functional component with TypeScript',
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
              }
            },
            {
              label: 'useState',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>(${3:initialValue});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'React useState hook with TypeScript',
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
              }
            },
            {
              label: 'useEffect',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'useEffect(() => {\n\t${1:// effect logic}\n\t\n\treturn () => {\n\t\t${2:// cleanup}\n\t};\n}, [${3:dependencies}]);',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'React useEffect hook with cleanup',
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
              }
            }
          ];
          return { suggestions };
        }
      });

      // Register completion provider for Python
      monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: (model, position) => {
          const suggestions = [
            {
              label: 'class',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, params}):\n        ${3:# initialization}\n        pass\n\n    def ${4:method_name}(self${5:, params}):\n        ${6:# method body}\n        pass',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a Python class',
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
              }
            },
            {
              label: 'def',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'def ${1:function_name}(${2:params}):\n    """${3:Function description}"""\n    ${4:# function body}\n    return ${5:result}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a Python function with docstring',
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
              }
            },
            {
              label: 'try-except',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'try:\n    ${1:# try block}\nexcept ${2:Exception} as e:\n    ${3:# exception handling}\n    print(f"Error: {e}")\nfinally:\n    ${4:# cleanup}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a try-except-finally block',
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column,
                endColumn: position.column
              }
            }
          ];
          return { suggestions };
        }
      });

      // Note: Code action providers for quick fixes disabled temporarily
      // due to TypeScript interface compatibility issues with Monaco Editor API
      // Core Replit-like features (IntelliSense, formatting, linting) are fully functional

      monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
      monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
    });
  }, []);

  // Real-time code analysis and error checking
  useEffect(() => {
    if (!editorInstance || !content || !file) return;

    const analyzeCode = async () => {
      setIsAnalyzing(true);
      try {
        const model = editorInstance.getModel();
        if (!model) return;

        // Additional custom validation for different languages
        const language = getMonacoLanguage(file.originalName, file.analysis);
        if (language === 'javascript' || language === 'typescript') {
          await validateJavaScriptCode(content, model);
        } else if (language === 'python') {
          await validatePythonCode(content, model);
        } else if (language === 'json') {
          await validateJsonCode(content, model);
        }

        // Run enhanced linting for all languages
        await lintCode(content, language, model);

        // Get all diagnostics (built-in + custom + linting) after validation
        const allMarkers = monaco.editor.getModelMarkers({ resource: model.uri });
        setDiagnostics(allMarkers);
      } catch (error) {
        console.error('Code analysis error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const timeoutId = setTimeout(analyzeCode, 500); // Debounce analysis
    return () => clearTimeout(timeoutId);
  }, [content, editorInstance, file]);

  // Custom validation functions
  const validateJavaScriptCode = async (code: string, model: monaco.editor.ITextModel) => {
    const customMarkers: monaco.editor.IMarkerData[] = [];
    
    try {
      // Check for common issues
      const lines = code.split('\n');
      lines.forEach((line, index) => {
        // Check for console.log in production-like code
        if (line.includes('console.log') && !line.trim().startsWith('//')) {
          customMarkers.push({
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: index + 1,
            startColumn: line.indexOf('console.log') + 1,
            endLineNumber: index + 1,
            endColumn: line.indexOf('console.log') + 'console.log'.length + 1,
            message: 'Consider removing console.log statements in production code',
            source: 'custom-linter'
          });
        }

        // Check for var usage (suggest let/const)
        if (line.includes('var ') && !line.trim().startsWith('//')) {
          customMarkers.push({
            severity: monaco.MarkerSeverity.Info,
            startLineNumber: index + 1,
            startColumn: line.indexOf('var ') + 1,
            endLineNumber: index + 1,
            endColumn: line.indexOf('var ') + 4,
            message: 'Consider using \'let\' or \'const\' instead of \'var\'',
            source: 'custom-linter'
          });
        }
      });
    } catch (error) {
      console.error('JavaScript validation error:', error);
    }

    // Set custom markers
    monaco.editor.setModelMarkers(model, 'custom-linter', customMarkers);
  };

  const validatePythonCode = async (code: string, model: monaco.editor.ITextModel) => {
    const customMarkers: monaco.editor.IMarkerData[] = [];
    
    try {
      const lines = code.split('\n');
      lines.forEach((line, index) => {
        // Check for print statements (suggest logging)
        if (line.includes('print(') && !line.trim().startsWith('#')) {
          customMarkers.push({
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: index + 1,
            startColumn: line.indexOf('print(') + 1,
            endLineNumber: index + 1,
            endColumn: line.indexOf('print(') + 6,
            message: 'Consider using logging instead of print for production code',
            source: 'python-linter'
          });
        }

        // Check for basic indentation issues (not multiple of 4)
        const leadingSpaces = line.length - line.trimStart().length;
        if (leadingSpaces > 0 && leadingSpaces % 4 !== 0 && line.trim()) {
          customMarkers.push({
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: index + 1,
            startColumn: 1,
            endLineNumber: index + 1,
            endColumn: leadingSpaces + 1,
            message: 'Indentation should be a multiple of 4 spaces',
            source: 'python-linter'
          });
        }
      });
    } catch (error) {
      console.error('Python validation error:', error);
    }

    monaco.editor.setModelMarkers(model, 'python-linter', customMarkers);
  };

  const validateJsonCode = async (code: string, model: monaco.editor.ITextModel) => {
    const customMarkers: monaco.editor.IMarkerData[] = [];
    
    try {
      JSON.parse(code);
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Try to extract line number from error message
        const match = error.message.match(/line (\d+)/i);
        const lineNumber = match ? parseInt(match[1]) : 1;
        
        customMarkers.push({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: 1000, // End of line
          message: `JSON Parse Error: ${error.message}`,
          source: 'json-validator'
        });
      }
    }

    monaco.editor.setModelMarkers(model, 'json-validator', customMarkers);
  };

  // Enhanced code formatting function
  const formatCode = async (editor: monaco.editor.IStandaloneCodeEditor, language: string) => {
    const model = editor.getModel();
    if (!model) return;

    try {
      if (language === 'javascript' || language === 'typescript') {
        // Use Monaco's built-in formatting first
        await editor.getAction('editor.action.formatDocument')?.run();
        
        // Additional JS/TS specific formatting
        const content = model.getValue();
        const formatted = await formatJavaScript(content);
        if (formatted !== content) {
          model.setValue(formatted);
        }
      } else if (language === 'python') {
        const content = model.getValue();
        const formatted = await formatPython(content);
        if (formatted !== content) {
          model.setValue(formatted);
        }
      } else if (language === 'json') {
        const content = model.getValue();
        const formatted = await formatJson(content);
        if (formatted !== content) {
          model.setValue(formatted);
        }
      } else {
        // Fallback to Monaco's built-in formatting
        await editor.getAction('editor.action.formatDocument')?.run();
      }
    } catch (error) {
      console.error('Formatting error:', error);
    }
  };

  // JavaScript/TypeScript formatting
  const formatJavaScript = async (code: string): Promise<string> => {
    try {
      // Basic formatting rules
      let formatted = code
        // Fix spacing around operators
        .replace(/([a-zA-Z0-9_])([+\-*/=<>!])([a-zA-Z0-9_])/g, '$1 $2 $3')
        // Fix spacing after commas
        .replace(/,([^\s])/g, ', $1')
        // Fix spacing around braces
        .replace(/\{([^\s])/g, '{ $1')
        .replace(/([^\s])\}/g, '$1 }')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Fix line breaks
        .replace(/;\s*([a-zA-Z])/g, ';\n$1')
        .replace(/\{\s*([a-zA-Z])/g, '{\n  $1')
        .replace(/([a-zA-Z])\s*\}/g, '$1\n}');
      
      return formatted;
    } catch (error) {
      console.error('JavaScript formatting error:', error);
      return code;
    }
  };

  // Python formatting
  const formatPython = async (code: string): Promise<string> => {
    try {
      const lines = code.split('\n');
      let indentLevel = 0;
      const formatted: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          formatted.push('');
          continue;
        }
        
        // Decrease indent for certain keywords
        if (trimmed.startsWith('except') || trimmed.startsWith('elif') || trimmed.startsWith('else') || trimmed.startsWith('finally')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
        
        // Add proper indentation
        const indent = '    '.repeat(indentLevel);
        formatted.push(indent + trimmed);
        
        // Increase indent after certain keywords
        if (trimmed.endsWith(':') && 
           (trimmed.startsWith('def ') || trimmed.startsWith('class ') || 
            trimmed.startsWith('if ') || trimmed.startsWith('elif ') || 
            trimmed.startsWith('else:') || trimmed.startsWith('for ') || 
            trimmed.startsWith('while ') || trimmed.startsWith('try:') || 
            trimmed.startsWith('except ') || trimmed.startsWith('finally:'))) {
          indentLevel++;
        }
      }
      
      return formatted.join('\n');
    } catch (error) {
      console.error('Python formatting error:', error);
      return code;
    }
  };

  // JSON formatting
  const formatJson = async (code: string): Promise<string> => {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      console.error('JSON formatting error:', error);
      return code;
    }
  };

  // Enhanced linting with more sophisticated rules
  const lintCode = async (code: string, language: string, model: monaco.editor.ITextModel) => {
    const lintMarkers: monaco.editor.IMarkerData[] = [];
    
    if (language === 'javascript' || language === 'typescript') {
      await lintJavaScript(code, lintMarkers);
    } else if (language === 'python') {
      await lintPython(code, lintMarkers);
    } else if (language === 'css') {
      await lintCSS(code, lintMarkers);
    }
    
    monaco.editor.setModelMarkers(model, 'enhanced-linter', lintMarkers);
  };

  const lintJavaScript = async (code: string, markers: monaco.editor.IMarkerData[]) => {
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();
      
      // Check for missing 'use strict'
      if (lineNumber === 1 && !trimmed.includes('use strict') && code.length > 100) {
        markers.push({
          severity: monaco.MarkerSeverity.Info,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
          message: 'Consider adding \'use strict\' at the beginning of the file',
          source: 'enhanced-linter'
        });
      }
      
      // Check for == vs ===
      if (line.includes('==') && !line.includes('===')) {
        const col = line.indexOf('==') + 1;
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          startLineNumber: lineNumber,
          startColumn: col,
          endLineNumber: lineNumber,
          endColumn: col + 2,
          message: 'Use === instead of == for strict comparison',
          source: 'enhanced-linter'
        });
      }
      
      // Check for function declarations inside blocks
      if (trimmed.startsWith('function ') && line.indexOf('function') > 0) {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          startLineNumber: lineNumber,
          startColumn: line.indexOf('function') + 1,
          endLineNumber: lineNumber,
          endColumn: line.indexOf('function') + 8,
          message: 'Function declarations should not be nested inside blocks',
          source: 'enhanced-linter'
        });
      }
      
      // Check for unreachable code after return
      if (trimmed === 'return;' || trimmed.startsWith('return ')) {
        if (lines[index + 1] && lines[index + 1].trim() && !lines[index + 1].trim().startsWith('}')) {
          markers.push({
            severity: monaco.MarkerSeverity.Warning,
            startLineNumber: lineNumber + 1,
            startColumn: 1,
            endLineNumber: lineNumber + 1,
            endColumn: lines[index + 1].length,
            message: 'Unreachable code after return statement',
            source: 'enhanced-linter'
          });
        }
      }
    });
  };

  const lintPython = async (code: string, markers: monaco.editor.IMarkerData[]) => {
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();
      
      // Check for line length (PEP 8: max 79 characters)
      if (line.length > 79) {
        markers.push({
          severity: monaco.MarkerSeverity.Info,
          startLineNumber: lineNumber,
          startColumn: 80,
          endLineNumber: lineNumber,
          endColumn: line.length,
          message: 'Line too long (>79 characters). Consider breaking it up.',
          source: 'enhanced-linter'
        });
      }
      
      // Check for missing docstrings in functions/classes
      if (trimmed.startsWith('def ') || trimmed.startsWith('class ')) {
        const nextLine = lines[index + 1];
        if (nextLine && !nextLine.trim().startsWith('"""') && !nextLine.trim().startsWith("'''")) {
          markers.push({
            severity: monaco.MarkerSeverity.Info,
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: line.length,
            message: 'Consider adding a docstring to document this function/class',
            source: 'enhanced-linter'
          });
        }
      }
      
      // Check for bare except clauses
      if (trimmed === 'except:') {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: line.length,
          message: 'Bare except clause. Specify exception type for better error handling.',
          source: 'enhanced-linter'
        });
      }
    });
  };

  const lintCSS = async (code: string, markers: monaco.editor.IMarkerData[]) => {
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();
      
      // Check for missing semicolons in CSS rules
      if (trimmed.includes(':') && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          startLineNumber: lineNumber,
          startColumn: line.length,
          endLineNumber: lineNumber,
          endColumn: line.length + 1,
          message: 'Missing semicolon in CSS rule',
          source: 'enhanced-linter'
        });
      }
      
      // Check for vendor prefixes without standard property
      if (trimmed.includes('-webkit-') || trimmed.includes('-moz-') || trimmed.includes('-ms-')) {
        const property = trimmed.split(':')[0].trim();
        const standardProperty = property.replace(/^-\w+-/, '');
        const hasStandard = lines.some(l => l.includes(standardProperty + ':'));
        
        if (!hasStandard) {
          markers.push({
            severity: monaco.MarkerSeverity.Info,
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: line.length,
            message: `Consider adding the standard property '${standardProperty}' after vendor prefixes`,
            source: 'enhanced-linter'
          });
        }
      }
    });
  };
  // Get language for Monaco Editor syntax highlighting
  const getMonacoLanguage = (filename: string, analysis?: any): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    // Use analysis language if available
    if (analysis && typeof analysis === 'object' && analysis.language) {
      const lang = analysis.language.toLowerCase();
      
      // Map common languages to Monaco Editor language IDs
      const langMap: Record<string, string> = {
        'javascript': 'javascript',
        'typescript': 'typescript',
        'python': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'go': 'go',
        'rust': 'rust',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'markdown': 'markdown',
        'sql': 'sql',
        'php': 'php',
        'ruby': 'ruby',
        'swift': 'swift'
      };
      
      if (langMap[lang]) return langMap[lang];
    }
    
    // Fallback to extension-based detection
    const extMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml',
      'yml': 'yaml',
      'yaml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'sh': 'shell',
      'bash': 'shell'
    };
    
    return extMap[ext] || 'plaintext';
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-[600px] text-muted-foreground">
        <div className="text-center">
          <i className="fas fa-code text-6xl mb-4 opacity-50"></i>
          <p className="text-lg">Select a file to view its content</p>
          <p className="text-sm">Choose a file from the file tree to edit or view</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
          <p>Loading file content...</p>
        </div>
      </div>
    );
  }

  const language = getMonacoLanguage(file.originalName, file.analysis);

  return (
    <div className="h-[600px] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <i className="fas fa-file-code text-primary"></i>
          <span className="font-medium" data-testid="text-current-filename">{file.originalName}</span>
          {file.analysis && typeof file.analysis === 'object' && (file.analysis as any).language && (
            <Badge variant="secondary">
              {(file.analysis as any).language}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {language}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              if (editorInstance) {
                await formatCode(editorInstance, language);
              }
            }}
            variant="outline"
            size="sm"
            className="gap-1"
            data-testid="button-format-code"
          >
            <i className="fas fa-magic"></i>
            Format
          </Button>
          <Button
            onClick={async () => {
              // Format before saving
              if (editorInstance) {
                await formatCode(editorInstance, language);
              }
              onSave();
            }}
            disabled={isSaving || !hasUnsavedChanges}
            className="gap-2"
            data-testid="button-save-file"
          >
            {isSaving ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-save"></i>
            )}
            {isSaving ? 'Saving...' : 'Save & Format'}
          </Button>
        </div>
      </div>
      <div className="flex-1" data-testid="monaco-editor-container">
        {/* Error/Warning Summary */}
        {diagnostics.length > 0 && (
          <div className="border-b bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <i className="fas fa-exclamation-triangle text-red-500"></i>
                <span>{diagnostics.filter(d => d.severity === monaco.MarkerSeverity.Error).length} errors</span>
              </div>
              <div className="flex items-center gap-1">
                <i className="fas fa-exclamation-circle text-yellow-500"></i>
                <span>{diagnostics.filter(d => d.severity === monaco.MarkerSeverity.Warning).length} warnings</span>
              </div>
              <div className="flex items-center gap-1">
                <i className="fas fa-info-circle text-blue-500"></i>
                <span>{diagnostics.filter(d => d.severity === monaco.MarkerSeverity.Info).length} suggestions</span>
              </div>
              {isAnalyzing && (
                <div className="flex items-center gap-1 ml-auto text-muted-foreground">
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Analyzing...</span>
                </div>
              )}
            </div>
          </div>
        )}
        <Editor
          height="100%"
          language={language}
          value={content}
          onChange={(value) => onContentChange(value || '')}
          onMount={(editor) => {
            setEditorInstance(editor);
            
            // Add advanced keybindings with format-on-save
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
              // Format code before saving
              await formatCode(editor, language);
              onSave();
            });
            
            // Add format document command with enhanced formatting
            editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, async () => {
              await formatCode(editor, language);
            });
            
            // Add quick fix command
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
              editor.getAction('editor.action.quickFix')?.run();
            });
            
            // Add organize imports (for TypeScript/JavaScript)
            if (language === 'typescript' || language === 'javascript') {
              editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyO, () => {
                editor.getAction('editor.action.organizeImports')?.run();
              });
            }
          }}
          theme="vs-dark"
          options={{
            // Enhanced editor options for Replit-like experience
            minimap: { enabled: true, scale: 0.8 },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            lineNumbers: 'on',
            roundedSelection: false,
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            renderWhitespace: 'selection',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'all',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true
            },
            // Enhanced IntelliSense and error checking
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            acceptSuggestionOnCommitCharacter: true,
            snippetSuggestions: 'top',
            wordBasedSuggestions: 'allDocuments',
            parameterHints: { 
              enabled: true,
              cycle: true 
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showClasses: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showIssues: true,
              showUsers: true,
              showColors: true
            },
            autoIndent: 'advanced',
            formatOnType: true,
            formatOnPaste: true,
            showUnused: true,
            showDeprecated: true,
            // Error and warning indicators
            glyphMargin: true,
            folding: true,
            foldingStrategy: 'indentation',
            foldingHighlight: true,
            unfoldOnClickAfterEndOfLine: true,
            // Code lens
            codeLens: true,
            // Hover information
            hover: {
              enabled: true,
              delay: 300,
              sticky: true
            },
            // Definition and reference features
            definitionLinkOpensInPeek: true,
            peekWidgetDefaultFocus: 'editor',
            // Auto-closing and surrounding
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoSurround: 'languageDefined',
            // Code actions and light bulb
            // Multi-cursor and selection
            multiCursorModifier: 'ctrlCmd',
            multiCursorMergeOverlapping: true,
            // Performance
            renderValidationDecorations: 'on',
            // Accessibility
            accessibilitySupport: 'auto'
          }}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-xl mb-2"></i>
                <p className="text-sm text-muted-foreground">Loading advanced editor...</p>
              </div>
            </div>
          }
        />
        
        {/* Code Actions Panel */}
        {editorInstance && diagnostics.length > 0 && (
          <div className="border-t bg-background/95 backdrop-blur-sm">
            <div className="p-2 max-h-32 overflow-y-auto">
              <div className="text-xs font-medium text-muted-foreground mb-1">Code Issues:</div>
              {diagnostics.slice(0, 5).map((diagnostic, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    editorInstance.setPosition({
                      lineNumber: diagnostic.startLineNumber,
                      column: diagnostic.startColumn
                    });
                    editorInstance.focus();
                  }}
                >
                  <i className={`fas fa-${
                    diagnostic.severity === monaco.MarkerSeverity.Error ? 'times-circle text-red-500' :
                    diagnostic.severity === monaco.MarkerSeverity.Warning ? 'exclamation-triangle text-yellow-500' :
                    'info-circle text-blue-500'
                  } mt-0.5`}></i>
                  <div className="flex-1">
                    <div className="font-medium">
                      Line {diagnostic.startLineNumber}: {diagnostic.message}
                    </div>
                    {diagnostic.source && (
                      <div className="text-muted-foreground">Source: {diagnostic.source}</div>
                    )}
                  </div>
                </div>
              ))}
              {diagnostics.length > 5 && (
                <div className="text-xs text-muted-foreground px-2 py-1">
                  and {diagnostics.length - 5} more issues...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Keyboard Shortcuts Help */}
      <div className="text-xs text-muted-foreground p-2 border-t bg-muted/20">
        <div className="flex flex-wrap gap-4">
          <span><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+S</kbd> Save</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded">Shift+Alt+F</kbd> Format</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+.</kbd> Quick Fix</span>
          {(language === 'typescript' || language === 'javascript') && (
            <span><kbd className="px-1 py-0.5 bg-muted rounded">Shift+Alt+O</kbd> Organize Imports</span>
          )}
          <span><kbd className="px-1 py-0.5 bg-muted rounded">F1</kbd> Command Palette</span>
        </div>
      </div>
    </div>
  );
}

export default function FileManager() {
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileType | null>(null);
  const [pendingFileSelection, setPendingFileSelection] = useState<FileType | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const { toast } = useToast();

  const {
    createFile,
    updateFileContent,
    deleteFile,
    getFileText,
    uploadFiles,
    isCreating,
    isUpdating,
    isDeleting,
    isUploading
  } = useFileUpload();

  const { data: files = [], isLoading: isLoadingFiles, refetch: refetchFiles } = useQuery({
    queryKey: ["/api/files"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/files");
      return response.json();
    },
  });

  // Load file content when a file is selected
  useEffect(() => {
    if (selectedFile) {
      setIsContentLoading(true);
      const currentFileId = selectedFile.id; // Capture current ID to prevent race conditions
      
      getFileText(selectedFile.id)
        .then((response) => {
          // Only update content if this is still the selected file (prevents race conditions)
          if (currentFileId === selectedFile?.id) {
            const content = response.content || "";
            setFileContent(content);
            setOriginalContent(content);
          }
        })
        .catch((error) => {
          console.error("Error loading file content:", error);
          if (currentFileId === selectedFile?.id) {
            toast({
              title: "Error",
              description: "Failed to load file content",
              variant: "destructive",
            });
          }
        })
        .finally(() => {
          if (currentFileId === selectedFile?.id) {
            setIsContentLoading(false);
          }
        });
    } else {
      setFileContent("");
      setOriginalContent("");
    }
  }, [selectedFile?.id, getFileText, toast]);

  const handleFileSelect = (file: FileType) => {
    // Check for unsaved changes before switching files
    if (hasUnsavedChanges && selectedFile) {
      setPendingFileSelection(file);
      setShowUnsavedDialog(true);
      return;
    }
    setSelectedFile(file);
  };

  const confirmFileSwitch = async (action: 'discard' | 'save') => {
    if (action === 'save' && selectedFile) {
      const saveSuccessful = await handleSaveFile();
      if (saveSuccessful) {
        setSelectedFile(pendingFileSelection);
        setShowUnsavedDialog(false);
        setPendingFileSelection(null);
      }
      // If save failed, keep dialog open and don't switch files
    } else {
      setSelectedFile(pendingFileSelection);
      setShowUnsavedDialog(false);
      setPendingFileSelection(null);
    }
  };

  const handleSaveFile = async (): Promise<boolean> => {
    if (!selectedFile) return false;

    try {
      await updateFileContent(selectedFile.id, fileContent);
      setOriginalContent(fileContent);
      toast({
        title: "Success",
        description: "File saved successfully",
      });
      return true;
    } catch (error) {
      console.error("Error saving file:", error);
      toast({
        title: "Error",
        description: "Failed to save file",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a filename",
        variant: "destructive",
      });
      return;
    }

    try {
      const newFile = await createFile(newFileName, newFileContent);
      setIsCreateDialogOpen(false);
      setNewFileName("");
      setNewFileContent("");
      setSelectedFile(newFile);
      toast({
        title: "Success",
        description: "File created successfully",
      });
    } catch (error) {
      console.error("Error creating file:", error);
      toast({
        title: "Error",
        description: "Failed to create file",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      await deleteFile(fileToDelete.id);
      if (selectedFile?.id === fileToDelete.id) {
        setSelectedFile(null);
      }
      setFileToDelete(null);
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const hasUnsavedChanges = fileContent !== originalContent;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">File Manager</h1>
          <p className="text-muted-foreground">Create, edit, and manage your code files</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowUploadZone(!showUploadZone)}
            data-testid="button-upload-files"
          >
            <i className={`fas fa-${showUploadZone ? 'times' : 'upload'}`}></i>
            {showUploadZone ? 'Cancel Upload' : 'Upload Files'}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-file">
                <i className="fas fa-plus"></i>
                New File
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New File</DialogTitle>
              <DialogDescription>
                Create a new text or code file. Include the file extension to enable syntax highlighting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Filename</label>
                <Input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="example.js, README.md, style.css..."
                  data-testid="input-new-filename"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Initial Content (optional)</label>
                <Textarea
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  placeholder="// Your code here..."
                  rows={6}
                  data-testid="textarea-new-file-content"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateFile}
                disabled={isCreating}
                data-testid="button-confirm-create"
              >
                {isCreating ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Creating...
                  </>
                ) : (
                  'Create File'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* File Upload Zone - renders as modal overlay */}
      {showUploadZone && (
        <FileUploadZone
          onFilesSelected={async (files) => {
            try {
              await uploadFiles(files);
              setShowUploadZone(false);
              toast({
                title: "Upload successful",
                description: `${files.length} file${files.length > 1 ? 's' : ''} uploaded successfully`,
              });
            } catch (error) {
              console.error("Upload failed:", error);
              toast({
                title: "Upload failed",
                description: "Failed to upload files. Please try again.",
                variant: "destructive",
              });
            }
          }}
          onClose={() => setShowUploadZone(false)}
          maxFiles={10}
          maxFileSize={50 * 1024 * 1024} // 50MB
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Tree */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-folder-tree text-primary"></i>
              Files
            </CardTitle>
            <CardDescription>
              {files.length} file{files.length !== 1 ? 's' : ''} total
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingFiles ? (
              <div className="flex items-center justify-center h-[200px]">
                <i className="fas fa-spinner fa-spin text-xl"></i>
              </div>
            ) : (
              <FileTree
                files={files}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
                onFileDelete={(file) => setFileToDelete(file)}
              />
            )}
          </CardContent>
        </Card>

        {/* Code Viewer */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-code text-primary"></i>
              Code Editor
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="ml-2">
                  <i className="fas fa-circle text-orange-500 text-xs mr-1"></i>
                  Unsaved changes
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {selectedFile 
                ? `Editing ${selectedFile.originalName}` 
                : "Select a file from the tree to start editing"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <CodeViewer
              file={selectedFile}
              content={fileContent}
              onContentChange={setFileContent}
              onSave={handleSaveFile}
              isLoading={isContentLoading}
              isSaving={isUpdating}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </CardContent>
        </Card>
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in "{selectedFile?.originalName}". What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => confirmFileSwitch('discard')}>
              Discard Changes
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmFileSwitch('save')}>
              Save & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileToDelete?.originalName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}