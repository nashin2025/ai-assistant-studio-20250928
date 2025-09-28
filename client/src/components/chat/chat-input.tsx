import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import FileUploadZone from "./file-upload-zone";

interface ChatInputProps {
  onSendMessage: (content: string, files?: File[]) => void;
  isLoading?: boolean;
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() || attachedFiles.length > 0) {
      onSendMessage(message.trim(), attachedFiles);
      setMessage("");
      setAttachedFiles([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {
        handleSend();
      }
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px';
    }
  }, [message]);

  const quickActions = [
    { icon: "fas fa-search", label: "Web Search", action: () => setMessage("Search the web for ") },
    { icon: "fas fa-code", label: "Code Review", action: () => setMessage("Please review this code: ") },
    { icon: "fas fa-lightbulb", label: "Project Ideas", action: () => setMessage("Give me ideas for a ") },
  ];

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          {/* File Upload Zone */}
          {showUploadZone && (
            <div className="mb-4">
              <FileUploadZone
                onFilesSelected={(files) => {
                  setAttachedFiles(prev => [...prev, ...files]);
                  setShowUploadZone(false);
                }}
                onClose={() => setShowUploadZone(false)}
              />
            </div>
          )}

          {/* Attached Files */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs"
                >
                  <i className="fas fa-file text-muted-foreground"></i>
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid={`remove-file-${index}`}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask anything about your code, project planning, web research..."
                  className="auto-resize-textarea pr-20 resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  data-testid="input-message"
                />
                
                {/* Input Actions */}
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1.5"
                    onClick={handleFileSelect}
                    disabled={isLoading}
                    data-testid="button-attach"
                  >
                    <i className="fas fa-paperclip text-xs"></i>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1.5"
                    onClick={() => setShowUploadZone(true)}
                    disabled={isLoading}
                    data-testid="button-upload"
                  >
                    <i className="fas fa-cloud-upload-alt text-xs"></i>
                  </Button>
                  <div className="h-4 w-px bg-border mx-1"></div>
                  <Button
                    size="sm"
                    className="h-auto p-1.5"
                    onClick={handleSend}
                    disabled={isLoading || (!message.trim() && attachedFiles.length === 0)}
                    data-testid="button-send"
                  >
                    <i className="fas fa-paper-plane text-xs"></i>
                  </Button>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-2 mt-2 text-xs">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={action.action}
                    disabled={isLoading}
                    data-testid={`quick-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <i className={`${action.icon} w-3 mr-1`}></i>
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept=".js,.jsx,.ts,.tsx,.py,.md,.txt,.json,.css,.html,.java,.cpp,.c,.h,.rb,.go,.rs,.swift,.pdf,.doc,.docx,.png,.jpg,.jpeg,.gif"
          className="hidden"
        />
      </div>
    </div>
  );
}
