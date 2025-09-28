import { getUncachableGitHubClient } from "../localGitHubClient";
import type { Project } from "@shared/schema";

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  private: boolean;
  updatedAt: string;
}

export interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  downloadUrl?: string;
  content?: string;
}

export interface CodeAnalysis {
  files: GitHubFile[];
  languages: Record<string, number>;
  structure: {
    directories: string[];
    mainFiles: string[];
    configFiles: string[];
    testFiles: string[];
  };
  complexity: 'low' | 'medium' | 'high';
  suggestions: string[];
}

export class GitHubService {
  async getUserRepositories(): Promise<GitHubRepository[]> {
    try {
      // Check if GitHub token is available
      if (!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
        console.log("GitHub integration not configured - GITHUB_PERSONAL_ACCESS_TOKEN missing");
        return []; // Return empty array for local development
      }

      const octokit = await getUncachableGitHubClient();
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
      });

      return response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        private: repo.private,
        updatedAt: repo.updated_at,
      }));
    } catch (error) {
      console.error("Error fetching GitHub repositories:", error);
      // Return empty array instead of throwing for better UX
      return [];
    }
  }

  async getRepositoryContents(owner: string, repo: string, path: string = ""): Promise<GitHubFile[]> {
    try {
      const octokit = await getUncachableGitHubClient();
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if (!Array.isArray(response.data)) {
        return [{
          name: response.data.name,
          path: response.data.path,
          type: response.data.type as 'file' | 'dir',
          size: response.data.size,
          downloadUrl: response.data.download_url || undefined,
        }];
      }

      return response.data.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type as 'file' | 'dir',
        size: item.size || undefined,
        downloadUrl: item.download_url || undefined,
      }));
    } catch (error) {
      console.error("Error fetching repository contents:", error);
      throw new Error("Failed to fetch repository contents");
    }
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    try {
      const octokit = await getUncachableGitHubClient();
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if (Array.isArray(response.data)) {
        throw new Error("Path points to a directory, not a file");
      }

      if (response.data.type !== 'file') {
        throw new Error("Path does not point to a file");
      }

      // Decode base64 content
      return Buffer.from(response.data.content, 'base64').toString('utf-8');
    } catch (error) {
      console.error("Error fetching file content:", error);
      throw new Error("Failed to fetch file content");
    }
  }

  async analyzeRepository(owner: string, repo: string): Promise<CodeAnalysis> {
    try {
      const files = await this.getRepositoryContentsRecursive(owner, repo);
      const languages = await this.getRepositoryLanguages(owner, repo);
      
      const structure = this.analyzeStructure(files);
      const complexity = this.assessRepositoryComplexity(files, languages);
      const suggestions = this.generateSuggestions(structure, complexity);

      return {
        files,
        languages,
        structure,
        complexity,
        suggestions,
      };
    } catch (error) {
      console.error("Error analyzing repository:", error);
      throw new Error("Failed to analyze repository");
    }
  }

  private async getRepositoryContentsRecursive(owner: string, repo: string, path: string = ""): Promise<GitHubFile[]> {
    const contents = await this.getRepositoryContents(owner, repo, path);
    const allFiles: GitHubFile[] = [];

    for (const item of contents) {
      if (item.type === 'file') {
        allFiles.push(item);
      } else if (item.type === 'dir' && !this.shouldSkipDirectory(item.name)) {
        const subContents = await this.getRepositoryContentsRecursive(owner, repo, item.path);
        allFiles.push(...subContents);
      }
    }

    return allFiles;
  }

  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = ['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.vscode', '.idea'];
    return skipDirs.includes(name) || name.startsWith('.');
  }

  private async getRepositoryLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const octokit = await getUncachableGitHubClient();
      const response = await octokit.rest.repos.listLanguages({
        owner,
        repo,
      });

      return response.data;
    } catch (error) {
      console.error("Error fetching repository languages:", error);
      return {};
    }
  }

  private analyzeStructure(files: GitHubFile[]): CodeAnalysis['structure'] {
    const directories = [...new Set(files.map(f => f.path.split('/')[0]))].filter(Boolean);
    
    const mainFiles = files
      .filter(f => ['index.js', 'index.ts', 'main.py', 'app.py', 'main.cpp', 'README.md'].includes(f.name))
      .map(f => f.path);

    const configFiles = files
      .filter(f => ['package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.ts', '.gitignore', 'Dockerfile'].includes(f.name))
      .map(f => f.path);

    const testFiles = files
      .filter(f => f.name.includes('test') || f.name.includes('spec') || f.path.includes('test'))
      .map(f => f.path);

    return {
      directories,
      mainFiles,
      configFiles,
      testFiles,
    };
  }

  private assessRepositoryComplexity(files: GitHubFile[], languages: Record<string, number>): CodeAnalysis['complexity'] {
    const totalLines = Object.values(languages).reduce((sum, lines) => sum + lines, 0);
    const fileCount = files.length;
    const languageCount = Object.keys(languages).length;

    const complexityScore = (totalLines / 1000) + (fileCount / 10) + (languageCount * 2);

    if (complexityScore > 50) return 'high';
    if (complexityScore > 20) return 'medium';
    return 'low';
  }

  private generateSuggestions(structure: CodeAnalysis['structure'], complexity: CodeAnalysis['complexity']): string[] {
    const suggestions: string[] = [];

    if (structure.testFiles.length === 0) {
      suggestions.push("Consider adding unit tests to improve code reliability");
    }

    if (!structure.configFiles.some(f => f.includes('README'))) {
      suggestions.push("Add a comprehensive README.md file for better documentation");
    }

    if (complexity === 'high') {
      suggestions.push("Consider breaking down the project into smaller, more manageable modules");
    }

    if (structure.directories.length > 20) {
      suggestions.push("Consider reorganizing the directory structure for better maintainability");
    }

    if (suggestions.length === 0) {
      suggestions.push("Code structure looks good! Consider adding CI/CD workflows for automation");
    }

    return suggestions;
  }

  async createRepository(name: string, description?: string, isPrivate: boolean = false): Promise<GitHubRepository> {
    try {
      const octokit = await getUncachableGitHubClient();
      const response = await octokit.rest.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
      });

      return {
        id: response.data.id,
        name: response.data.name,
        fullName: response.data.full_name,
        description: response.data.description,
        url: response.data.html_url,
        language: response.data.language,
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        private: response.data.private,
        updatedAt: response.data.updated_at,
      };
    } catch (error) {
      console.error("Error creating GitHub repository:", error);
      throw new Error("Failed to create repository on GitHub");
    }
  }
}
