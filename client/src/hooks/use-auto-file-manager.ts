import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFileUpload } from "./use-file-upload";
import { useToast } from "./use-toast";
import type { File as FileType } from "@shared/schema";

interface CodeBlock {
  filename: string;
  content: string;
  language: string;
}

interface AutoFileResult {
  created: string[];
  updated: string[];
  errors: string[];
}

export function useAutoFileManager() {
  const { createFile, updateFileContent } = useFileUpload();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get current files list for existence checking
  const { data: files = [] } = useQuery({
    queryKey: ["/api/files"],
  });

  /**
   * Validate filename for security and safety
   */
  const validateFilename = (filename: string): { valid: boolean; error?: string } => {
    // Remove any leading/trailing whitespace
    const cleanFilename = filename.trim();
    
    // Check for empty filename
    if (!cleanFilename) {
      return { valid: false, error: "Filename cannot be empty" };
    }
    
    // Check for path traversal attempts
    if (cleanFilename.includes('..') || cleanFilename.startsWith('/') || cleanFilename.includes('\\')) {
      return { valid: false, error: "Filename contains invalid path characters" };
    }
    
    // Check for reserved characters
    const invalidChars = /[<>:"|?*\0]/;
    if (invalidChars.test(cleanFilename)) {
      return { valid: false, error: "Filename contains invalid characters" };
    }
    
    // Check length (reasonable limits)
    if (cleanFilename.length > 255) {
      return { valid: false, error: "Filename too long (max 255 characters)" };
    }
    
    // Allow simple folder structures (single level)
    const pathParts = cleanFilename.split('/');
    if (pathParts.length > 3) { // Allow up to 2 levels: folder/subfolder/file.ext
      return { valid: false, error: "Filename path too deep (max 2 levels)" };
    }
    
    return { valid: true };
  };

  /**
   * Parse AI response content for code blocks with filenames
   * Supports various patterns:
   * - ```language filename.ext
   * - ```language
   *   // filename.ext or # filename.ext at the top
   * - Explicit filename mentions before code blocks
   * - Special files like Dockerfile, Makefile
   */
  const parseCodeBlocks = (content: string): CodeBlock[] => {
    const codeBlocks: CodeBlock[] = [];
    
    // Pattern 1: ```language filename (with or without extension)
    const fenceWithFilenameRegex = /```(\w+)?\s+([^\n\r\s][^\n\r]*?)\s*\n([\s\S]*?)```/g;
    let match;
    
    while ((match = fenceWithFilenameRegex.exec(content)) !== null) {
      const [, language = '', filename, code] = match;
      const cleanFilename = filename.trim();
      // Validate it looks like a filename (not a comment or description)
      if (cleanFilename && code.trim() && !cleanFilename.includes(' ') && cleanFilename.length < 100) {
        codeBlocks.push({
          filename: cleanFilename,
          content: code.trim(),
          language: language || detectLanguageFromFilename(cleanFilename)
        });
      }
    }
    
    // Pattern 2: ```language with filename comment at top (require explicit filename: tag)
    const fenceWithCommentRegex = /```(\w+)?\s*\n\s*(?:\/\/|#|<!--)\s*(?:filename:|file:)\s*([A-Za-z0-9._/-]+)\s*(?:-->)?\s*\n([\s\S]*?)```/g;
    
    while ((match = fenceWithCommentRegex.exec(content)) !== null) {
      const [, language = '', filename, code] = match;
      const cleanFilename = filename.trim();
      if (cleanFilename && code.trim() && !cleanFilename.includes(' ') && cleanFilename.length < 100) {
        // Avoid duplicates from Pattern 1
        const exists = codeBlocks.some(block => block.filename === cleanFilename);
        if (!exists) {
          codeBlocks.push({
            filename: cleanFilename,
            content: code.trim(),
            language: language || detectLanguageFromFilename(cleanFilename)
          });
        }
      }
    }
    
    // Pattern 3: Explicit filename mention before code block (extensionless support)
    const explicitFilenameRegex = /(?:create|save|file:|filename:|create\s+file)\s*([^\n\r\s][^\n\r]*?)\s*:?\s*\n\s*```(\w+)?\s*\n([\s\S]*?)```/gi;
    
    while ((match = explicitFilenameRegex.exec(content)) !== null) {
      const [, filename, language = '', code] = match;
      const cleanFilename = filename.trim();
      if (cleanFilename && code.trim() && !cleanFilename.includes(' ') && cleanFilename.length < 100) {
        // Avoid duplicates
        const exists = codeBlocks.some(block => block.filename === cleanFilename);
        if (!exists) {
          codeBlocks.push({
            filename: cleanFilename,
            content: code.trim(),
            language: language || detectLanguageFromFilename(cleanFilename)
          });
        }
      }
    }

    // Pattern 4: Special patterns for common extensionless files
    const specialFileRegex = /(?:^|\n)\s*(?:create|save|file:|filename:)?\s*(dockerfile|makefile|rakefile|gemfile|procfile|jenkinsfile|vagrantfile)\s*:?\s*\n\s*```(\w+)?\s*\n([\s\S]*?)```/gi;
    
    while ((match = specialFileRegex.exec(content)) !== null) {
      const [, filename, language = '', code] = match;
      const cleanFilename = filename.charAt(0).toUpperCase() + filename.slice(1).toLowerCase(); // Proper case
      if (cleanFilename && code.trim()) {
        // Avoid duplicates
        const exists = codeBlocks.some(block => block.filename.toLowerCase() === cleanFilename.toLowerCase());
        if (!exists) {
          codeBlocks.push({
            filename: cleanFilename,
            content: code.trim(),
            language: language || detectLanguageFromFilename(cleanFilename)
          });
        }
      }
    }
    
    // Pattern 5: Fence language fallback for special extensionless files
    // Handle cases like ```dockerfile, ```makefile with no explicit filename
    const langToFilename: Record<string, string> = {
      'dockerfile': 'Dockerfile',
      'docker': 'Dockerfile',
      'makefile': 'Makefile',
      'make': 'Makefile',
      'procfile': 'Procfile',
      'jenkinsfile': 'Jenkinsfile',
      'vagrantfile': 'Vagrantfile',
      'rakefile': 'Rakefile',
      'gemfile': 'Gemfile'
    };
    
    const fenceLanguageOnlyRegex = /```(\w+)\s*\n([\s\S]*?)```/g;
    
    while ((match = fenceLanguageOnlyRegex.exec(content)) !== null) {
      const [, language, code] = match;
      const lowerLang = language.toLowerCase();
      
      if (langToFilename[lowerLang] && code.trim()) {
        const inferredFilename = langToFilename[lowerLang];
        
        // Only add if we haven't already captured this file from explicit patterns
        const exists = codeBlocks.some(block => 
          block.filename.toLowerCase() === inferredFilename.toLowerCase()
        );
        
        if (!exists) {
          codeBlocks.push({
            filename: inferredFilename,
            content: code.trim(),
            language: lowerLang
          });
        }
      }
    }

    // Pattern 6: Natural language filename detection
    // Handle "Create a file named Dockerfile:", "Save as Makefile:", etc.
    const naturalFilenameRegex = /(?:create|save|make|write)\s+(?:a\s+)?(?:new\s+)?(?:file\s+)?(?:named|called|as)\s+([^\s:,\n]+)\s*:?\s*\n\s*```(\w+)?\s*\n([\s\S]*?)```/gi;
    
    while ((match = naturalFilenameRegex.exec(content)) !== null) {
      const [, filename, language = '', code] = match;
      const cleanFilename = filename.trim();
      
      if (cleanFilename && code.trim() && cleanFilename.length < 100) {
        // Avoid duplicates
        const exists = codeBlocks.some(block => 
          block.filename.toLowerCase() === cleanFilename.toLowerCase()
        );
        
        if (!exists) {
          codeBlocks.push({
            filename: cleanFilename,
            content: code.trim(),
            language: language || detectLanguageFromFilename(cleanFilename)
          });
        }
      }
    }
    
    return codeBlocks;
  };

  /**
   * Detect programming language from filename (including extension and special names)
   */
  const detectLanguageFromFilename = (filename: string): string => {
    const lowerFilename = filename.toLowerCase();
    const ext = filename.split('.').pop()?.toLowerCase();
    
    // Special files without extensions
    const specialFiles: Record<string, string> = {
      'dockerfile': 'dockerfile',
      'makefile': 'makefile',
      'rakefile': 'ruby',
      'gemfile': 'ruby',
      'procfile': 'text',
      'jenkinsfile': 'groovy',
      'vagrantfile': 'ruby',
      'readme': 'markdown',
      'license': 'text',
      'changelog': 'text',
      'authors': 'text',
      'contributors': 'text'
    };
    
    // Check for special filenames first
    const baseName = lowerFilename.split('/').pop() || '';
    if (specialFiles[baseName]) {
      return specialFiles[baseName];
    }
    
    // Extension-based detection
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'mjs': 'javascript',
      'cjs': 'javascript',
      'ts': 'typescript',
      'mts': 'typescript',
      'cts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'pyw': 'python',
      'pyi': 'python',
      'rb': 'ruby',
      'rbw': 'ruby',
      'php': 'php',
      'phtml': 'php',
      'java': 'java',
      'kt': 'kotlin',
      'kts': 'kotlin',
      'scala': 'scala',
      'sc': 'scala',
      'cpp': 'cpp',
      'cxx': 'cpp',
      'cc': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'cs': 'csharp',
      'fs': 'fsharp',
      'vb': 'vbnet',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'html': 'html',
      'htm': 'html',
      'xhtml': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'styl': 'stylus',
      'json': 'json',
      'jsonc': 'json',
      'json5': 'json',
      'xml': 'xml',
      'xsl': 'xml',
      'xsd': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'cfg': 'ini',
      'conf': 'ini',
      'md': 'markdown',
      'markdown': 'markdown',
      'rst': 'rst',
      'sql': 'sql',
      'sqlite': 'sql',
      'mysql': 'sql',
      'pgsql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'fish': 'fish',
      'ps1': 'powershell',
      'psm1': 'powershell',
      'bat': 'batch',
      'cmd': 'batch',
      'dockerfile': 'dockerfile',
      'vue': 'vue',
      'svelte': 'svelte',
      'astro': 'astro',
      'elm': 'elm',
      'clj': 'clojure',
      'cljs': 'clojure',
      'erl': 'erlang',
      'hrl': 'erlang',
      'ex': 'elixir',
      'exs': 'elixir',
      'r': 'r',
      'R': 'r',
      'jl': 'julia',
      'lua': 'lua',
      'pl': 'perl',
      'pm': 'perl',
      'dart': 'dart',
      'tf': 'terraform',
      'tfvars': 'terraform',
      'hcl': 'hcl'
    };
    
    return langMap[ext || ''] || 'text';
  };

  /**
   * Check if a file exists by filename
   */
  const findExistingFile = (filename: string): FileType | undefined => {
    return (files as FileType[]).find(file => 
      file.originalName === filename || 
      file.originalName.endsWith(`/${filename}`) ||
      file.filename === filename
    );
  };

  /**
   * Automatically create or update files based on AI response
   */
  const processAIResponse = async (aiResponseContent: string): Promise<AutoFileResult> => {
    const result: AutoFileResult = { created: [], updated: [], errors: [] };
    
    try {
      const codeBlocks = parseCodeBlocks(aiResponseContent);
      
      if (codeBlocks.length === 0) {
        return result; // No code blocks found
      }

      // Ensure we have fresh file data before processing
      await queryClient.ensureQueryData({
        queryKey: ["/api/files"],
        queryFn: async () => {
          const response = await fetch('/api/files', { credentials: 'include' });
          if (!response.ok) throw new Error('Failed to fetch files');
          return response.json();
        },
      });

      // Process each code block
      for (const block of codeBlocks) {
        try {
          // Validate filename for security
          const validation = validateFilename(block.filename);
          if (!validation.valid) {
            const errorMsg = `Invalid filename "${block.filename}": ${validation.error}`;
            result.errors.push(errorMsg);
            
            toast({
              title: "Invalid Filename",
              description: errorMsg,
              variant: "destructive",
            });
            continue;
          }

          // Get fresh files list
          const freshFiles = queryClient.getQueryData(["/api/files"]) as FileType[] || [];
          const existingFile = freshFiles.find(file => 
            file.originalName === block.filename || 
            file.originalName.endsWith(`/${block.filename}`) ||
            file.filename === block.filename
          );
          
          if (existingFile) {
            // Update existing file
            await updateFileContent(existingFile.id, block.content);
            result.updated.push(block.filename);
            
            toast({
              title: "File Updated",
              description: `Updated existing file: ${block.filename}`,
              variant: "default",
            });
          } else {
            // Create new file
            await createFile(block.filename, block.content, block.language);
            result.created.push(block.filename);
            
            toast({
              title: "File Created", 
              description: `Created new file: ${block.filename}`,
              variant: "default",
            });
          }
        } catch (error) {
          const errorMsg = `Failed to process ${block.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error('Auto file management error:', error);
          
          toast({
            title: "File Operation Failed",
            description: errorMsg,
            variant: "destructive",
          });
        }
      }
      
      // Summary notification if multiple files processed
      if (codeBlocks.length > 1) {
        const total = result.created.length + result.updated.length;
        if (total > 0) {
          toast({
            title: "Batch File Operation Complete",
            description: `Processed ${total} files: ${result.created.length} created, ${result.updated.length} updated`,
            variant: "default",
          });
        }
      }
      
    } catch (error) {
      const errorMsg = `Auto file processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error('Auto file manager error:', error);
      
      toast({
        title: "Auto File Management Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
    
    return result;
  };

  /**
   * Check if content contains code blocks that could be auto-saved
   */
  const hasAutoSaveableContent = (content: string): boolean => {
    const codeBlocks = parseCodeBlocks(content);
    return codeBlocks.length > 0;
  };

  return {
    processAIResponse,
    parseCodeBlocks,
    hasAutoSaveableContent,
    findExistingFile,
  };
}