import { Octokit } from '@octokit/rest';
import { promises as fs } from 'fs';
import path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

interface FileContent {
  path: string;
  content: string;
}

export class GitHubExportService {
  async getAllFiles(dir: string, baseDir: string = dir): Promise<FileContent[]> {
    const files: FileContent[] = [];
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const relativePath = path.relative(baseDir, fullPath);

      // Skip certain directories and files
      if (this.shouldSkip(relativePath)) {
        continue;
      }

      if (item.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({
            path: relativePath.replace(/\\/g, '/'), // Normalize path separators
            content
          });
        } catch (error) {
          // Skip binary files or files that can't be read as text
          console.log(`Skipping file ${relativePath}: ${error}`);
        }
      }
    }

    return files;
  }

  private shouldSkip(relativePath: string): boolean {
    const skipPatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'coverage',
      '.nyc_output',
      'generated-projects',
      '/tmp',
      '.replit',
      'replit.nix'
    ];

    const skipFiles = [
      '.DS_Store',
      'Thumbs.db',
      '*.log',
      '*.lock'
    ];

    // Check directory patterns
    for (const pattern of skipPatterns) {
      if (relativePath.includes(pattern)) {
        return true;
      }
    }

    // Check file patterns
    for (const pattern of skipFiles) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        if (regex.test(relativePath)) {
          return true;
        }
      } else if (relativePath.endsWith(pattern)) {
        return true;
      }
    }

    return false;
  }

  async createRepository(repoName: string, description: string, isPrivate: boolean = false) {
    const octokit = await getUncachableGitHubClient();
    
    try {
      const response = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description,
        private: isPrivate,
        auto_init: false
      });
      
      return response.data;
    } catch (error: any) {
      if (error.status === 422) {
        throw new Error(`Repository '${repoName}' already exists`);
      }
      throw error;
    }
  }

  async pushFilesToRepository(owner: string, repo: string, files: FileContent[], commitMessage: string) {
    const octokit = await getUncachableGitHubClient();

    // For empty repositories, we need to create an initial commit first
    // Create a simple README to initialize the repository
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: 'Initial commit',
      content: Buffer.from('# AI Assistant Studio\n\nComprehensive AI development companion with local LLM integration.').toString('base64')
    });

    // Now we can use the Git API to push all files
    // Get the current main branch reference
    const ref = await octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main'
    });

    // Create blobs for all files
    const blobs = await Promise.all(
      files.map(async (file) => {
        const blob = await octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content, 'utf-8').toString('base64'),
          encoding: 'base64'
        });
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.data.sha
        };
      })
    );

    // Create tree with all files
    const tree = await octokit.git.createTree({
      owner,
      repo,
      tree: blobs,
      base_tree: ref.data.object.sha
    });

    // Create commit
    const commit = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: tree.data.sha,
      parents: [ref.data.object.sha]
    });

    // Update main branch reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: commit.data.sha
    });

    return commit.data;
  }

  async commitSingleFile(owner: string, repo: string, filePath: string, fileContent: string, commitMessage: string) {
    const octokit = await getUncachableGitHubClient();

    try {
      // Try to get the existing file to get its SHA (needed for updates)
      let sha: string | undefined;
      try {
        const existingFile = await octokit.repos.getContent({
          owner,
          repo,
          path: filePath
        });
        if ('sha' in existingFile.data) {
          sha = existingFile.data.sha;
        }
      } catch (error: any) {
        // File doesn't exist, which is fine for new files
        if (error.status !== 404) {
          throw error;
        }
      }

      // Create or update the file
      const response = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content: Buffer.from(fileContent, 'utf-8').toString('base64'),
        ...(sha && { sha }) // Include SHA if updating existing file
      });

      return response.data;
    } catch (error: any) {
      console.error('Failed to commit file:', error);
      throw error;
    }
  }

  async exportProject(repoName: string, description: string, isPrivate: boolean = false) {
    try {
      console.log('Creating GitHub repository...');
      const repo = await this.createRepository(repoName, description, isPrivate);
      
      console.log('Collecting project files...');
      const files = await this.getAllFiles(process.cwd());
      
      console.log(`Found ${files.length} files to export`);
      
      console.log('Pushing files to GitHub...');
      await this.pushFilesToRepository(
        repo.owner.login,
        repo.name,
        files,
        'Initial commit: AI Assistant Studio'
      );
      
      return {
        success: true,
        repositoryUrl: repo.html_url,
        message: `Successfully exported ${files.length} files to GitHub`
      };
    } catch (error: any) {
      console.error('GitHub export failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}