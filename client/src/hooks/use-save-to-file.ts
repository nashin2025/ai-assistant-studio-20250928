import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { detectLanguage } from "@/components/ui/code-block";

interface SaveToFileResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export function useSaveToFile() {
  const [isOpen, setIsOpen] = useState(false);
  const [codeToSave, setCodeToSave] = useState("");
  const [suggestedFilename, setSuggestedFilename] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveFileMutation = useMutation({
    mutationFn: async ({ filename, content }: { filename: string; content: string }) => {
      const response = await apiRequest("POST", "/api/files/create", {
        filename: filename,
        content: content
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "File saved successfully",
        description: `Code has been saved as ${data.originalName}`,
      });
      setIsOpen(false);
    },
    onError: (error) => {
      console.error("Failed to save file:", error);
      toast({
        title: "Failed to save file",
        description: "There was an error saving the code to file. Please try again.",
        variant: "destructive"
      });
    }
  });

  const openSaveDialog = (code: string, filename?: string) => {
    setCodeToSave(code);
    
    if (filename) {
      setSuggestedFilename(filename);
    } else {
      // Auto-generate filename based on detected language
      const language = detectLanguage(code);
      const extension = getFileExtension(language);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      setSuggestedFilename(`code_${timestamp}.${extension}`);
    }
    
    setIsOpen(true);
  };

  const saveToFile = (filename: string) => {
    if (!filename.trim()) {
      toast({
        title: "Invalid filename",
        description: "Please enter a valid filename.",
        variant: "destructive"
      });
      return;
    }

    saveFileMutation.mutate({
      filename: filename.trim(),
      content: codeToSave
    });
  };

  const getFileExtension = (language: string): string => {
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
    return extMap[language] || 'txt';
  };

  return {
    isOpen,
    setIsOpen,
    suggestedFilename,
    setSuggestedFilename,
    codeToSave,
    saveToFile,
    openSaveDialog,
    isLoading: saveFileMutation.isPending
  };
}