import { Message as MessageType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { CodeBlock, detectLanguage } from "@/components/ui/code-block";
import { SaveToFileDialog } from "@/components/ui/save-to-file-dialog";
import { useSaveToFile } from "@/hooks/use-save-to-file";

interface MessageProps {
  message: MessageType;
}

export default function Message({ message }: MessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const saveToFile = useSaveToFile();
  
  // Parse metadata if it's a string
  const metadata = typeof message.metadata === 'string' 
    ? (() => {
        try {
          return JSON.parse(message.metadata);
        } catch {
          return null;
        }
      })()
    : message.metadata;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto" data-testid={`message-${message.role}`}>
      <div className="flex gap-3 mb-4">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-secondary" : "bg-primary"
        )}>
          <i className={cn(
            "text-sm",
            isUser 
              ? "fas fa-user text-secondary-foreground" 
              : "fas fa-robot text-primary-foreground"
          )}></i>
        </div>
        <div className="flex-1">
          <div className={cn(
            "rounded-lg p-3",
            isUser ? "bg-secondary" : "bg-card border border-border"
          )}>
            <div className="message-content text-sm">
              <MessageContent content={message.content} onSaveToFile={saveToFile.openSaveDialog} />
            </div>
            
            {/* Metadata display for special content */}
            {metadata && (
              <div className="mt-3 space-y-2">
                {metadata.searchResults && (
                  <SearchResultsDisplay results={metadata.searchResults} />
                )}
                {metadata.fileAnalysis && (
                  <FileAnalysisDisplay analysis={metadata.fileAnalysis} />
                )}
                {metadata.codeAnalysis && (
                  <CodeAnalysisDisplay analysis={metadata.codeAnalysis} />
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs text-muted-foreground" data-testid="message-timestamp">
              {formatTimestamp(message.createdAt)}
            </p>
            {isAssistant && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground hover:text-foreground h-auto p-0"
                  onClick={handleCopy}
                  data-testid="button-copy"
                >
                  <i className="fas fa-copy mr-1"></i>
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground hover:text-foreground h-auto p-0"
                  data-testid="button-like"
                >
                  <i className="fas fa-thumbs-up mr-1"></i>Like
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <SaveToFileDialog
        isOpen={saveToFile.isOpen}
        onClose={() => saveToFile.setIsOpen(false)}
        onSave={saveToFile.saveToFile}
        suggestedFilename={saveToFile.suggestedFilename}
        isLoading={saveToFile.isLoading}
      />
    </div>
  );
}

// Component to render message content with enhanced code blocks
function MessageContent({ content, onSaveToFile }: { content: string; onSaveToFile: (code: string, filename?: string) => void }) {
  const parts = parseMessageContent(content);
  
  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          const language = part.language || detectLanguage(part.content);
          return (
            <CodeBlock
              key={index}
              code={part.content}
              language={language}
              onSaveToFile={onSaveToFile}
              className="my-3"
            />
          );
        } else {
          return (
            <div
              key={index}
              dangerouslySetInnerHTML={{ __html: formatTextContent(part.content) }}
            />
          );
        }
      })}
    </div>
  );
}

// Parse message content into code blocks and text sections
function parseMessageContent(content: string) {
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  const codeBlockRegex = /```(\w*)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index).trim();
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    // Add code block
    const language = match[1] || '';
    const code = match[2].trim();
    if (code) {
      parts.push({ type: 'code', content: code, language });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex).trim();
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }
  }

  // If no code blocks found, return the entire content as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }

  return parts;
}

// Format text content (non-code parts)
function formatTextContent(content: string): string {
  return content
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function formatTimestamp(timestamp: number | Date | string | null | undefined): string {
  if (!timestamp) return "";
  
  // Convert timestamp to Date object
  const date = typeof timestamp === 'number' ? new Date(timestamp) :
               typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  
  return date.toLocaleDateString();
}

function SearchResultsDisplay({ results }: { results: any[] }) {
  return (
    <div className="space-y-2">
      <h5 className="text-xs font-medium text-muted-foreground">Search Results:</h5>
      {results.slice(0, 3).map((result, index) => (
        <div key={index} className="text-xs p-2 bg-muted rounded">
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
            {result.title}
          </a>
          <p className="text-muted-foreground mt-1">{result.snippet}</p>
        </div>
      ))}
    </div>
  );
}

function FileAnalysisDisplay({ analysis }: { analysis: any }) {
  return (
    <div className="text-xs p-2 bg-muted rounded">
      <h5 className="font-medium mb-1">File Analysis:</h5>
      <p><strong>Type:</strong> {analysis.type}</p>
      {analysis.language && <p><strong>Language:</strong> {analysis.language}</p>}
      {analysis.complexity && <p><strong>Complexity:</strong> {analysis.complexity}</p>}
      {analysis.summary && <p className="mt-1">{analysis.summary}</p>}
    </div>
  );
}

function CodeAnalysisDisplay({ analysis }: { analysis: any }) {
  return (
    <div className="text-xs p-2 bg-muted rounded">
      <h5 className="font-medium mb-1">Code Analysis:</h5>
      <div className="grid grid-cols-2 gap-2">
        {analysis.files && <p><strong>Files:</strong> {analysis.files.length}</p>}
        {analysis.complexity && <p><strong>Complexity:</strong> {analysis.complexity}</p>}
        {analysis.languages && <p><strong>Languages:</strong> {Object.keys(analysis.languages).join(", ")}</p>}
      </div>
      {analysis.suggestions && (
        <div className="mt-2">
          <strong>Suggestions:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            {analysis.suggestions.slice(0, 2).map((suggestion: string, index: number) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
