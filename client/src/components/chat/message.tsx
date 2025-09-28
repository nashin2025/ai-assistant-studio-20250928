import { Message as MessageType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MessageProps {
  message: MessageType;
}

export default function Message({ message }: MessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

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
            <div className="message-content text-sm" dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
            
            {/* Metadata display for special content */}
            {message.metadata && (
              <div className="mt-3 space-y-2">
                {message.metadata.searchResults && (
                  <SearchResultsDisplay results={message.metadata.searchResults} />
                )}
                {message.metadata.fileAnalysis && (
                  <FileAnalysisDisplay analysis={message.metadata.fileAnalysis} />
                )}
                {message.metadata.codeAnalysis && (
                  <CodeAnalysisDisplay analysis={message.metadata.codeAnalysis} />
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
    </div>
  );
}

function formatMessageContent(content: string): string {
  // Basic markdown-like formatting
  return content
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function formatTimestamp(timestamp: Date | string | null | undefined): string {
  if (!timestamp) return "";
  
  // Convert string timestamps to Date objects
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
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
