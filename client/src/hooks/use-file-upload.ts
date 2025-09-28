import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { File as FileType } from "@shared/schema";

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function useFileUpload() {
  const queryClient = useQueryClient();
  const userId = "default-user";

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File): Promise<FileType> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      // Create a custom fetch with progress tracking
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate files query to refetch the list
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
  });

  const uploadMultipleFilesMutation = useMutation({
    mutationFn: async (files: File[]): Promise<FileType[]> => {
      const uploadPromises = files.map(file => uploadFileMutation.mutateAsync(file));
      return Promise.all(uploadPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await apiRequest("DELETE", `/api/files/${fileId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
  });

  // Validate file before upload
  const validateFile = (file: File, options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }): { valid: boolean; error?: string } => {
    const { maxSize = 50 * 1024 * 1024, allowedTypes } = options || {}; // 50MB default

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`,
      };
    }

    if (allowedTypes && allowedTypes.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        return {
          valid: false,
          error: `File type not supported. Allowed types: ${allowedTypes.join(', ')}`,
        };
      }
    }

    return { valid: true };
  };

  // Upload a single file with validation
  const uploadFile = async (file: File, options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }): Promise<FileType> => {
    const validation = validateFile(file, options);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return uploadFileMutation.mutateAsync(file);
  };

  // Upload multiple files with validation
  const uploadFiles = async (files: File[], options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }): Promise<FileType[]> => {
    // Validate all files first
    for (const file of files) {
      const validation = validateFile(file, options);
      if (!validation.valid) {
        throw new Error(`${file.name}: ${validation.error}`);
      }
    }

    return uploadMultipleFilesMutation.mutateAsync(files);
  };

  // Delete a file
  const deleteFile = (fileId: string) => {
    return deleteFileMutation.mutateAsync(fileId);
  };

  // Get file download URL
  const getFileUrl = (fileId: string): string => {
    return `/api/files/${fileId}/content`;
  };

  // Check if file type is supported for analysis
  const isAnalyzableFile = (filename: string): boolean => {
    const analyzableExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
      '.css', '.html', '.php', '.rb', '.go', '.rs', '.swift', '.md', '.txt'
    ];
    
    const extension = '.' + filename.split('.').pop()?.toLowerCase();
    return analyzableExtensions.includes(extension);
  };

  // Get file type icon class
  const getFileIcon = (filename: string, mimeType?: string): string => {
    if (mimeType?.startsWith('image/')) return 'fas fa-image';
    if (mimeType?.includes('pdf')) return 'fas fa-file-pdf';
    if (mimeType?.includes('word')) return 'fas fa-file-word';
    
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return 'fab fa-js-square';
      case 'py':
        return 'fab fa-python';
      case 'java':
        return 'fab fa-java';
      case 'html':
        return 'fab fa-html5';
      case 'css':
        return 'fab fa-css3-alt';
      case 'md':
        return 'fab fa-markdown';
      case 'txt':
        return 'fas fa-file-alt';
      default:
        return 'fas fa-file';
    }
  };

  return {
    // Actions
    uploadFile,
    uploadFiles,
    deleteFile,
    validateFile,
    getFileUrl,
    isAnalyzableFile,
    getFileIcon,

    // States
    isUploading: uploadFileMutation.isPending || uploadMultipleFilesMutation.isPending,
    isDeleting: deleteFileMutation.isPending,

    // Progress (for single file)
    uploadProgress: uploadFileMutation.variables ? {
      loaded: 0,
      total: uploadFileMutation.variables.size,
      percentage: 0,
    } as FileUploadProgress : null,

    // Errors
    uploadError: uploadFileMutation.error || uploadMultipleFilesMutation.error,
    deleteError: deleteFileMutation.error,

    // Last uploaded file(s)
    lastUploadedFile: uploadFileMutation.data,
    lastUploadedFiles: uploadMultipleFilesMutation.data,
  };
}
