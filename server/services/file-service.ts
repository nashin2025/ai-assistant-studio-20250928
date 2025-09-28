import type { InsertFile, File } from "@shared/schema";
import { storage } from "../storage";
import * as path from "path";
import * as fs from "fs/promises";

export interface FileAnalysis {
  type: 'text' | 'code' | 'image' | 'document' | 'unknown';
  language?: string;
  lineCount?: number;
  size: number;
  complexity?: 'low' | 'medium' | 'high';
  summary?: string;
  codeMetrics?: {
    functions: number;
    classes: number;
    imports: number;
    comments: number;
  };
}

export class FileService {
  private uploadDir = process.env.UPLOAD_DIR || './uploads';

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create upload directory:", error);
    }
  }

  async saveFile(
    userId: string,
    originalName: string,
    content: Buffer,
    mimeType: string
  ): Promise<File> {
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}-${originalName}`;
    const filePath = path.join(this.uploadDir, filename);

    try {
      await fs.writeFile(filePath, content);
      
      const insertFile: InsertFile = {
        userId,
        filename,
        originalName,
        mimeType,
        size: content.length,
        path: filePath,
        analysis: await this.analyzeFile(content, originalName, mimeType),
      };

      return await storage.createFile(insertFile);
    } catch (error) {
      console.error("Error saving file:", error);
      throw new Error("Failed to save file");
    }
  }

  async getFileContent(file: File): Promise<Buffer> {
    try {
      return await fs.readFile(file.path);
    } catch (error) {
      console.error("Error reading file:", error);
      throw new Error("Failed to read file");
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const file = await storage.getFile(fileId);
      if (!file) return false;

      await fs.unlink(file.path);
      return await storage.deleteFile(fileId);
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  private async analyzeFile(content: Buffer, filename: string, mimeType: string): Promise<FileAnalysis> {
    const analysis: FileAnalysis = {
      type: this.determineFileType(mimeType, filename),
      size: content.length,
    };

    if (analysis.type === 'text' || analysis.type === 'code') {
      const textContent = content.toString('utf-8');
      analysis.lineCount = textContent.split('\n').length;
      
      if (analysis.type === 'code') {
        analysis.language = this.detectLanguage(filename);
        analysis.codeMetrics = this.analyzeCode(textContent);
        analysis.complexity = this.assessComplexity(analysis.codeMetrics, analysis.lineCount);
      }

      // Generate summary for text files
      if (textContent.length > 0) {
        analysis.summary = this.generateSummary(textContent);
      }
    }

    return analysis;
  }

  private determineFileType(mimeType: string, filename: string): FileAnalysis['type'] {
    if (mimeType.startsWith('text/')) return 'text';
    if (mimeType.startsWith('image/')) return 'image';
    
    const ext = path.extname(filename).toLowerCase();
    const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.css', '.html', '.php', '.rb', '.go', '.rs', '.swift'];
    
    if (codeExtensions.includes(ext)) return 'code';
    
    const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'];
    if (documentExtensions.includes(ext)) return 'document';
    
    return 'unknown';
  }

  private detectLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.css': 'css',
      '.html': 'html',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
    };
    
    return languageMap[ext] || 'unknown';
  }

  private analyzeCode(content: string): FileAnalysis['codeMetrics'] {
    const metrics = {
      functions: 0,
      classes: 0,
      imports: 0,
      comments: 0,
    };

    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Count functions (basic detection)
      if (trimmed.match(/function\s+\w+|const\s+\w+\s*=\s*\(|def\s+\w+/)) {
        metrics.functions++;
      }
      
      // Count classes
      if (trimmed.match(/class\s+\w+|interface\s+\w+/)) {
        metrics.classes++;
      }
      
      // Count imports
      if (trimmed.match(/^import\s+|^from\s+.*import|^#include/)) {
        metrics.imports++;
      }
      
      // Count comments
      if (trimmed.match(/^\/\/|^\/\*|^\*|^#|^<!--/)) {
        metrics.comments++;
      }
    }

    return metrics;
  }

  private assessComplexity(metrics: FileAnalysis['codeMetrics'], lineCount: number = 0): FileAnalysis['complexity'] {
    if (!metrics) return 'low';
    
    const totalComplexity = metrics.functions + metrics.classes + Math.floor(lineCount / 50);
    
    if (totalComplexity > 20) return 'high';
    if (totalComplexity > 10) return 'medium';
    return 'low';
  }

  private generateSummary(content: string): string {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    // For code files, analyze structure
    if (this.isCodeContent(content)) {
      const functions = content.match(/function\s+\w+|def\s+\w+|class\s+\w+/g) || [];
      const imports = content.match(/import\s+.*|#include\s+.*|require\s*\(/g) || [];
      
      if (functions.length > 0) {
        return `Code file with ${functions.length} function(s)/class(es), ${imports.length} import(s). Contains: ${functions.slice(0, 3).join(', ')}.`;
      }
      return `Code file with ${lines.length} lines, ${imports.length} import(s).`;
    }
    
    // For text/markdown files
    if (content.includes('#') || content.includes('##')) {
      const headings = content.match(/^#+\s+.*/gm) || [];
      if (headings.length > 0) {
        return `Document with ${headings.length} section(s): ${headings.slice(0, 3).map(h => h.replace(/^#+\s+/, '')).join(', ')}.`;
      }
    }
    
    // Default text summary
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wordCount = content.split(/\s+/).length;
    const firstSentences = sentences.slice(0, 2).join('. ');
    
    return `Text document with ${wordCount} words, ${lines.length} lines. ${firstSentences.substring(0, 150)}${firstSentences.length > 150 ? '...' : ''}`;
  }
  
  private isCodeContent(content: string): boolean {
    const codeIndicators = [
      /function\s+\w+/,
      /class\s+\w+/,
      /def\s+\w+/,
      /import\s+/,
      /require\s*\(/,
      /#include\s+/,
      /\{[\s\S]*\}/,
      /for\s*\(|while\s*\(|if\s*\(/
    ];
    
    return codeIndicators.some(pattern => pattern.test(content));
  }
}
