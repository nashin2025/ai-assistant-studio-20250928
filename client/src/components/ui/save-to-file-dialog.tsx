import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

interface SaveToFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filename: string) => void;
  suggestedFilename: string;
  isLoading?: boolean;
}

export function SaveToFileDialog({
  isOpen,
  onClose,
  onSave,
  suggestedFilename,
  isLoading = false
}: SaveToFileDialogProps) {
  const [filename, setFilename] = useState(suggestedFilename);

  useEffect(() => {
    setFilename(suggestedFilename);
  }, [suggestedFilename]);

  const handleSave = () => {
    if (filename.trim()) {
      onSave(filename.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="save-to-file-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-save text-primary"></i>
            Save Code to File
          </DialogTitle>
          <DialogDescription>
            Enter a filename to save this code to your file manager. The file will be saved with proper syntax highlighting and can be edited later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2">
          <Label htmlFor="filename" className="text-sm font-medium">
            Filename
          </Label>
          <Input
            id="filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter filename..."
            className="w-full"
            data-testid="input-filename"
            disabled={isLoading}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Include the file extension (e.g., .js, .py, .html) for proper syntax highlighting.
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!filename.trim() || isLoading}
            className="gap-2"
            data-testid="button-save"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i>
                Save File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}