import { useCallback, useMemo } from "react";
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
      
      // If the file name contains a path (from our enhanced upload), send it separately
      // This preserves the full path structure including folders
      formData.append('targetPath', file.name);

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

  const createFileMutation = useMutation({
    mutationFn: async ({ filename, content, language }: { filename: string; content: string; language?: string }): Promise<FileType> => {
      const response = await apiRequest("POST", "/api/files/create", {
        filename,
        content,
        language,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
  });

  const updateFileContentMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: string; content: string }): Promise<FileType> => {
      const response = await apiRequest("PUT", `/api/files/${fileId}/content`, {
        content,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
  });

  // Validate file before upload (stable function reference)
  const validateFile = useCallback((file: File, options?: {
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
  }, []);

  // Upload a single file with validation (stable function reference)
  const uploadFile = useCallback(async (file: File, options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }): Promise<FileType> => {
    const validation = validateFile(file, options);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    return uploadFileMutation.mutateAsync(file);
  }, [uploadFileMutation.mutateAsync, validateFile]);

  // Upload multiple files with validation (stable function reference)
  const uploadFiles = useCallback(async (files: File[], options?: {
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
  }, [uploadMultipleFilesMutation.mutateAsync, validateFile]);

  // Delete a file (stable function reference)
  const deleteFile = useCallback((fileId: string) => {
    return deleteFileMutation.mutateAsync(fileId);
  }, [deleteFileMutation.mutateAsync]);

  // Create a new text/code file (stable function reference)
  const createFile = useCallback((filename: string, content: string, language?: string) => {
    return createFileMutation.mutateAsync({ filename, content, language });
  }, [createFileMutation.mutateAsync]);

  // Update file content (stable function reference)
  const updateFileContent = useCallback((fileId: string, content: string) => {
    return updateFileContentMutation.mutateAsync({ fileId, content });
  }, [updateFileContentMutation.mutateAsync]);

  // Get file text content (stable function reference)
  const getFileText = useCallback(async (fileId: string) => {
    const response = await apiRequest("GET", `/api/files/${fileId}/text`);
    return response.json();
  }, []);

  // Get file download URL (stable function reference)
  const getFileUrl = useCallback((fileId: string): string => {
    return `/api/files/${fileId}/content`;
  }, []);

  // Check if file type is supported for analysis (stable function reference)
  const isAnalyzableFile = useCallback((filename: string): boolean => {
    const analyzableExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
      '.css', '.html', '.php', '.rb', '.go', '.rs', '.swift', '.md', '.txt'
    ];
    
    const extension = '.' + filename.split('.').pop()?.toLowerCase();
    return analyzableExtensions.includes(extension);
  }, []);

  // Get file type icon class (stable function reference)
  const getFileIcon = useCallback((filename: string, mimeType?: string): string => {
    // Check for special extensionless files first
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename === 'dockerfile' || lowerFilename === 'dockerfile.dev' || lowerFilename === 'dockerfile.prod') {
      return 'fab fa-docker text-blue-500';
    }
    if (lowerFilename === 'makefile' || lowerFilename === 'makefile.am') {
      return 'fas fa-cogs text-orange-500';
    }
    if (lowerFilename === 'procfile') {
      return 'fas fa-play-circle text-purple-500';
    }
    if (lowerFilename === 'jenkinsfile') {
      return 'fas fa-tools text-blue-600';
    }
    if (lowerFilename === 'vagrantfile') {
      return 'fas fa-cube text-indigo-500';
    }
    if (lowerFilename === 'gemfile' || lowerFilename === 'gemfile.lock') {
      return 'fas fa-gem text-red-500';
    }
    if (lowerFilename === 'rakefile') {
      return 'fas fa-gem text-red-600';
    }
    if (lowerFilename === '.gitignore' || lowerFilename === '.gitattributes' || lowerFilename === '.gitmodules') {
      return 'fab fa-git-alt text-orange-600';
    }
    if (lowerFilename === 'readme' || lowerFilename === 'readme.txt') {
      return 'fas fa-file-alt text-blue-500';
    }
    if (lowerFilename === 'license' || lowerFilename === 'license.txt' || lowerFilename === 'license.md') {
      return 'fas fa-balance-scale text-gray-600';
    }
    
    // MIME type based detection
    if (mimeType?.startsWith('image/')) {
      const imageExt = filename.split('.').pop()?.toLowerCase();
      switch (imageExt) {
        case 'svg': return 'fas fa-vector-square text-orange-500';
        case 'png': case 'jpg': case 'jpeg': return 'fas fa-image text-green-500';
        case 'gif': return 'fas fa-image text-purple-500';
        case 'ico': return 'fas fa-image text-blue-500';
        case 'webp': return 'fas fa-image text-indigo-500';
        default: return 'fas fa-image text-gray-500';
      }
    }
    if (mimeType?.includes('pdf')) return 'fas fa-file-pdf text-red-500';
    if (mimeType?.includes('word')) return 'fas fa-file-word text-blue-600';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'fas fa-file-excel text-green-600';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return 'fas fa-file-powerpoint text-orange-600';
    if (mimeType?.includes('video/')) return 'fas fa-video text-purple-600';
    if (mimeType?.includes('audio/')) return 'fas fa-music text-pink-500';
    if (mimeType?.includes('zip') || mimeType?.includes('archive')) return 'fas fa-file-archive text-yellow-600';
    
    // Extension based detection
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      // JavaScript & TypeScript
      case 'js': return 'fab fa-js-square text-yellow-500';
      case 'jsx': return 'fab fa-react text-blue-400';
      case 'ts': return 'fas fa-code text-blue-600';
      case 'tsx': return 'fab fa-react text-blue-500';
      case 'mjs': return 'fab fa-js-square text-yellow-600';
      case 'cjs': return 'fab fa-js-square text-yellow-700';
      
      // Web Technologies
      case 'html': case 'htm': return 'fab fa-html5 text-orange-600';
      case 'css': return 'fab fa-css3-alt text-blue-500';
      case 'scss': case 'sass': return 'fab fa-sass text-pink-500';
      case 'less': return 'fas fa-palette text-purple-500';
      case 'vue': return 'fab fa-vuejs text-green-500';
      case 'svelte': return 'fas fa-fire text-orange-500';
      
      // Programming Languages
      case 'py': return 'fab fa-python text-blue-500';
      case 'java': return 'fab fa-java text-red-600';
      case 'c': return 'fas fa-code text-blue-700';
      case 'cpp': case 'cc': case 'cxx': return 'fas fa-code text-blue-600';
      case 'h': case 'hpp': return 'fas fa-code text-blue-500';
      case 'cs': return 'fas fa-code text-purple-600';
      case 'php': return 'fab fa-php text-indigo-600';
      case 'rb': return 'fas fa-gem text-red-500';
      case 'go': return 'fas fa-code text-cyan-500';
      case 'rs': return 'fas fa-code text-orange-700';
      case 'swift': return 'fab fa-swift text-orange-500';
      case 'kt': case 'kts': return 'fas fa-code text-purple-500';
      case 'scala': return 'fas fa-code text-red-700';
      case 'r': return 'fas fa-chart-line text-blue-600';
      case 'lua': return 'fas fa-moon text-blue-400';
      case 'pl': case 'perl': return 'fas fa-code text-blue-500';
      case 'sh': case 'bash': case 'zsh': case 'fish': return 'fas fa-terminal text-green-600';
      case 'ps1': return 'fas fa-terminal text-blue-500';
      case 'bat': case 'cmd': return 'fas fa-terminal text-gray-600';
      
      // Data & Config
      case 'json': return 'fas fa-code text-yellow-500';
      case 'xml': return 'fas fa-code text-orange-500';
      case 'yaml': case 'yml': return 'fas fa-cog text-purple-500';
      case 'toml': return 'fas fa-cog text-orange-500';
      case 'ini': case 'cfg': case 'conf': return 'fas fa-cog text-gray-600';
      case 'env': return 'fas fa-key text-green-500';
      case 'csv': return 'fas fa-table text-green-600';
      case 'tsv': return 'fas fa-table text-blue-500';
      case 'sql': return 'fas fa-database text-blue-600';
      case 'db': case 'sqlite': case 'sqlite3': return 'fas fa-database text-gray-600';
      
      // Documentation
      case 'md': case 'markdown': return 'fab fa-markdown text-blue-500';
      case 'rst': return 'fas fa-file-alt text-blue-500';
      case 'tex': case 'latex': return 'fas fa-file-alt text-green-500';
      case 'txt': return 'fas fa-file-alt text-gray-600';
      case 'rtf': return 'fas fa-file-alt text-blue-500';
      case 'pdf': return 'fas fa-file-pdf text-red-500';
      
      // Package & Build Files
      case 'lock': return 'fas fa-lock text-yellow-600';
      case 'package': return 'fas fa-box text-amber-600';
      case 'requirements': return 'fas fa-list text-blue-500';
      case 'pipfile': return 'fab fa-python text-blue-500';
      case 'poetry': return 'fas fa-feather text-purple-500';
      case 'cargo': return 'fas fa-code text-orange-700';
      case 'gradle': return 'fas fa-code text-green-600';
      case 'maven': return 'fas fa-code text-orange-600';
      case 'webpack': return 'fas fa-cube text-blue-500';
      case 'rollup': return 'fas fa-cube text-red-500';
      case 'vite': return 'fas fa-bolt text-purple-500';
      case 'babel': return 'fas fa-code text-yellow-500';
      case 'eslint': return 'fas fa-check-circle text-purple-500';
      case 'prettier': return 'fas fa-paint-brush text-pink-500';
      case 'editor': return 'fas fa-edit text-blue-500';
      case 'git': return 'fab fa-git-alt text-orange-600';
      
      // Archives
      case 'zip': case 'rar': case '7z': case 'tar': case 'gz': case 'bz2': case 'xz':
        return 'fas fa-file-archive text-yellow-600';
      
      // Images (if not caught by MIME type)
      case 'png': case 'jpg': case 'jpeg': return 'fas fa-image text-green-500';
      case 'gif': return 'fas fa-image text-purple-500';
      case 'svg': return 'fas fa-vector-square text-orange-500';
      case 'ico': case 'icon': return 'fas fa-image text-blue-500';
      case 'webp': return 'fas fa-image text-indigo-500';
      case 'bmp': case 'tiff': case 'tif': return 'fas fa-image text-gray-500';
      
      // Audio & Video
      case 'mp3': case 'wav': case 'flac': case 'aac': case 'ogg': case 'm4a':
        return 'fas fa-music text-pink-500';
      case 'mp4': case 'avi': case 'mkv': case 'mov': case 'wmv': case 'flv': case 'webm':
        return 'fas fa-video text-purple-600';
      
      // Fonts
      case 'ttf': case 'otf': case 'woff': case 'woff2': case 'eot':
        return 'fas fa-font text-gray-700';
      
      // 3D & Design
      case 'blend': case 'obj': case 'fbx': case 'dae': case 'gltf': case 'glb':
        return 'fas fa-cube text-orange-500';
      case 'psd': case 'ai': case 'sketch': case 'fig': case 'xd':
        return 'fas fa-paint-brush text-purple-500';
      
      // Certificates & Keys
      case 'key': case 'pem': case 'crt': case 'cer': case 'p12': case 'pfx':
        return 'fas fa-key text-yellow-600';
      
      // Logs
      case 'log': return 'fas fa-file-alt text-gray-500';
      
      // Unknown files
      default:
        return 'fas fa-file text-gray-500';
    }
  }, []);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    // Actions (all stable function references)
    uploadFile,
    uploadFiles,
    deleteFile,
    createFile,
    updateFileContent,
    getFileText,
    validateFile,
    getFileUrl,
    isAnalyzableFile,
    getFileIcon,

    // States
    isUploading: uploadFileMutation.isPending || uploadMultipleFilesMutation.isPending,
    isDeleting: deleteFileMutation.isPending,
    isCreating: createFileMutation.isPending,
    isUpdating: updateFileContentMutation.isPending,

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
  }), [
    // Function references (all stable via useCallback)
    uploadFile, uploadFiles, deleteFile, createFile, updateFileContent, getFileText,
    validateFile, getFileUrl, isAnalyzableFile, getFileIcon,
    // Mutation states (only these change and trigger re-memoization)
    uploadFileMutation.isPending, uploadMultipleFilesMutation.isPending,
    deleteFileMutation.isPending, createFileMutation.isPending, updateFileContentMutation.isPending,
    uploadFileMutation.variables, uploadFileMutation.error, uploadMultipleFilesMutation.error,
    deleteFileMutation.error, uploadFileMutation.data, uploadMultipleFilesMutation.data
  ]);
}
