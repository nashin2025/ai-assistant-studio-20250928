import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onClose: () => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
}

export default function FileUploadZone({
  onFilesSelected,
  onClose,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['.js', '.jsx', '.ts', '.tsx', '.py', '.md', '.txt', '.json', '.css', '.html', '.java', '.cpp', '.c', '.h', '.rb', '.go', '.rs', '.swift', '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif']
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    handleDragEvents(e);
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    handleDragEvents(e);
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDragEvents(e);
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    setError(null);
    
    // Validate file count
    if (files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file sizes and types
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (file.size > maxFileSize) {
        errors.push(`${file.name} is too large (max ${Math.round(maxFileSize / 1024 / 1024)}MB)`);
        continue;
      }

      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(extension)) {
        errors.push(`${file.name} file type not supported`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="file-upload-modal">
      <Card className="w-full max-w-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upload Files</h3>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-upload">
              <i className="fas fa-times"></i>
            </Button>
          </div>

          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer file-drop-zone",
              isDragOver ? "border-primary bg-primary/5 drag-over" : "border-border hover:border-primary/50"
            )}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragEvents}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileSelect}
            data-testid="drop-zone"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <i className="fas fa-cloud-upload-alt text-primary text-xl"></i>
              </div>
              <div>
                <p className="font-medium">Drop your files here</p>
                <p className="text-sm text-muted-foreground">or click to browse files</p>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Supported formats: {acceptedTypes.slice(0, 5).join(', ')} and more</p>
                <p>Maximum {maxFiles} files, {Math.round(maxFileSize / 1024 / 1024)}MB each</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-upload">
              Cancel
            </Button>
          </div>
        </div>
      </Card>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept={acceptedTypes.join(',')}
        className="hidden"
      />
    </div>
  );
}
