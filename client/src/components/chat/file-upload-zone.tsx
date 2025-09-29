import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onClose: () => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
}

interface FileWithPath {
  file: File;
  targetPath: string;
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
  const [targetPath, setTargetPath] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<FileWithPath[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(false);
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
    const validFiles: FileWithPath[] = [];
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

      // Create file with path
      const cleanPath = targetPath.trim().replace(/\/+$/, ''); // Remove trailing slashes
      const fullPath = cleanPath ? `${cleanPath}/${file.name}` : file.name;
      
      validFiles.push({
        file,
        targetPath: fullPath
      });
    }

    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setIsConfiguring(true);
    }
  };

  const handleConfirmUpload = () => {
    // Create new File objects with modified names
    const modifiedFiles = selectedFiles.map(({ file, targetPath }) => {
      // Create a new File object with the target path as the name
      return new File([file], targetPath, { type: file.type });
    });
    
    onFilesSelected(modifiedFiles);
  };

  const updateFileTargetPath = (index: number, newPath: string) => {
    const updated = [...selectedFiles];
    updated[index].targetPath = newPath;
    setSelectedFiles(updated);
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    if (updated.length === 0) {
      setIsConfiguring(false);
    }
  };

  if (isConfiguring && selectedFiles.length > 0) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="file-upload-modal">
        <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Configure File Paths</h3>
              <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-upload">
                <i className="fas fa-times"></i>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Specify the target path for each file to organize them in folders.
            </p>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {selectedFiles.map((fileWithPath, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <i className="fas fa-file text-primary"></i>
                  <div className="flex-1 space-y-2">
                    <div className="text-sm font-medium">{fileWithPath.file.name}</div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground min-w-0">Target:</Label>
                      <Input
                        value={fileWithPath.targetPath}
                        onChange={(e) => updateFileTargetPath(index, e.target.value)}
                        placeholder="folder/subfolder/filename.ext"
                        className="text-sm"
                        data-testid={`input-file-path-${index}`}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    data-testid={`button-remove-file-${index}`}
                  >
                    <i className="fas fa-trash text-xs text-destructive"></i>
                  </Button>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-between gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setIsConfiguring(false)}
                data-testid="button-back-upload"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} data-testid="button-cancel-upload">
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmUpload}
                  disabled={selectedFiles.length === 0}
                  data-testid="button-confirm-upload"
                >
                  <i className="fas fa-upload mr-2"></i>
                  Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

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

          {/* Target Path Input */}
          <div className="mb-4">
            <Label className="text-sm font-medium">Target Directory (optional)</Label>
            <Input
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              placeholder="folder/subfolder (leave empty for root)"
              className="mt-1"
              data-testid="input-target-path"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Specify a folder path to organize your files. Example: "src/components" or "docs/api"
            </p>
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
