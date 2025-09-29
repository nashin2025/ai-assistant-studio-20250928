import { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
  onSaveToFile?: (code: string, filename?: string) => void;
}

export function CodeBlock({
  code,
  language = "javascript",
  filename,
  showLineNumbers = true,
  className,
  onSaveToFile
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  const handleSaveToFile = () => {
    if (onSaveToFile) {
      const suggestedFilename = filename || `code.${getFileExtension(language)}`;
      onSaveToFile(code, suggestedFilename);
    }
  };

  const getFileExtension = (lang: string): string => {
    const extMap: Record<string, string> = {
      'javascript': 'js',
      'typescript': 'ts',
      'python': 'py',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rust': 'rs',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yml',
      'markdown': 'md',
      'sql': 'sql',
      'php': 'php',
      'ruby': 'rb',
      'swift': 'swift',
      'shell': 'sh'
    };
    return extMap[lang] || 'txt';
  };

  const shouldShowExpanded = code.split('\n').length > 20;
  const displayCode = shouldShowExpanded && !isExpanded 
    ? code.split('\n').slice(0, 20).join('\n') + '\n// ... (more lines)'
    : code;

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-sm font-medium text-muted-foreground">
              {filename}
            </span>
          )}
          <Badge variant="secondary" className="text-xs">
            {language}
          </Badge>
          {shouldShowExpanded && (
            <Badge variant="outline" className="text-xs">
              {code.split('\n').length} lines
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {shouldShowExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 px-2 text-xs"
              data-testid="button-expand-code"
            >
              <i className={`fas fa-${isExpanded ? 'compress' : 'expand'} mr-1`}></i>
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs"
            data-testid="button-copy-code"
          >
            <i className={`fas fa-${copied ? 'check' : 'copy'} mr-1`}></i>
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          {onSaveToFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveToFile}
              className="h-7 px-2 text-xs"
              data-testid="button-save-to-file"
            >
              <i className="fas fa-save mr-1"></i>
              Save to File
            </Button>
          )}
        </div>
      </div>

      {/* Code Content */}
      <div className="relative">
        <Highlight
          theme={themes.vsDark}
          code={displayCode}
          language={language}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={cn(
                className,
                "overflow-x-auto p-4 text-sm",
                !showLineNumbers && "pl-4"
              )}
              style={style}
              data-testid="code-content"
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line, key: i })} className="table-row">
                  {showLineNumbers && (
                    <span className="table-cell text-right pr-4 text-muted-foreground select-none">
                      {i + 1}
                    </span>
                  )}
                  <span className="table-cell">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token, key })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}

// Detect code language from content heuristics
export function detectLanguage(code: string, filename?: string): string {
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
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
    if (ext && extMap[ext]) {
      return extMap[ext];
    }
  }

  // Heuristic detection based on content
  const codePatterns = [
    { pattern: /import\s+.*\s+from\s+['"]/, language: 'javascript' },
    { pattern: /const\s+\w+\s*=\s*require\(/, language: 'javascript' },
    { pattern: /interface\s+\w+\s*\{/, language: 'typescript' },
    { pattern: /def\s+\w+\s*\(/, language: 'python' },
    { pattern: /class\s+\w+\s*\{/, language: 'java' },
    { pattern: /fn\s+\w+\s*\(/, language: 'rust' },
    { pattern: /func\s+\w+\s*\(/, language: 'go' },
    { pattern: /<\?php/, language: 'php' },
    { pattern: /<!DOCTYPE\s+html/i, language: 'html' },
    { pattern: /SELECT\s+.*\s+FROM/i, language: 'sql' },
    { pattern: /#include\s*</, language: 'cpp' },
    { pattern: /^\s*#.*$/m, language: 'shell' }
  ];

  for (const { pattern, language } of codePatterns) {
    if (pattern.test(code)) {
      return language;
    }
  }

  return 'javascript'; // Default fallback
}