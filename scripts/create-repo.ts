#!/usr/bin/env tsx
import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import fs from 'fs';

async function getGitHubClient() {
  // Try to get token from Replit integration first
  try {
    let connectionSettings: any;
    
    async function getAccessToken() {
      if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
        return connectionSettings.settings.access_token;
      }
      
      const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
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
    
    const accessToken = await getAccessToken();
    return new Octokit({ auth: accessToken });
  } catch (error) {
    // Fallback to environment variable
    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (!token) {
      throw new Error('GitHub token not found. Please set GITHUB_PERSONAL_ACCESS_TOKEN or configure GitHub integration.');
    }
    return new Octokit({ auth: token });
  }
}

async function createRepository() {
  try {
    console.log('🚀 Creating new AI Assistant Studio repository...');
    
    const octokit = await getGitHubClient();
    
    // Get current user to determine repository owner
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`📝 Authenticated as: ${user.login}`);
    
    // Create repository with timestamp to ensure uniqueness
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const repoName = `ai-assistant-studio-${timestamp}`;
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: '🤖 AI Assistant Studio - Local Hosting Edition with SQLite database',
      private: false,
      auto_init: false,
      has_issues: true,
      has_projects: true,
      has_wiki: false,
    });
    
    console.log(`✅ Repository created: ${repo.html_url}`);
    
    // Initialize git repository if not already initialized
    try {
      execSync('git status', { stdio: 'pipe' });
      console.log('📁 Git repository already initialized');
    } catch {
      console.log('🔧 Initializing git repository...');
      execSync('git init');
      execSync('git branch -M main');
    }
    
    // Create .gitignore if it doesn't exist
    const gitignorePath = '.gitignore';
    if (!fs.existsSync(gitignorePath)) {
      const gitignoreContent = `# Dependencies
node_modules/
*.log
npm-debug.log*

# Environment variables
.env
.env.local
.env.production

# Database
data/
*.db
*.sqlite

# Build outputs
dist/
build/
.next/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
tmp/
temp/
.tmp/

# Cache
.cache/
.parcel-cache/
`;
      fs.writeFileSync(gitignorePath, gitignoreContent);
      console.log('📝 Created .gitignore file');
    }
    
    // Add remote if not already exists
    try {
      execSync('git remote get-url origin', { stdio: 'pipe' });
      console.log('🔗 Git remote already configured');
      execSync(`git remote set-url origin ${repo.clone_url}`);
    } catch {
      execSync(`git remote add origin ${repo.clone_url}`);
      console.log('🔗 Added git remote origin');
    }
    
    // Stage all files
    console.log('📦 Staging files...');
    execSync('git add .');
    
    // Commit changes
    console.log('💾 Committing changes...');
    const commitMessage = 'feat: AI Assistant Studio - Local Hosting Edition with SQLite database';
    execSync(`git commit -m "${commitMessage}"`);
    
    // Push to GitHub
    console.log('🚀 Pushing to GitHub...');
    execSync('git push -u origin main');
    
    console.log('🎉 Successfully created and pushed AI Assistant Studio repository!');
    console.log(`🔗 Repository URL: ${repo.html_url}`);
    console.log(`📋 Clone URL: ${repo.clone_url}`);
    
    return repo;
    
  } catch (error) {
    console.error('❌ Error creating repository:', error);
    throw error;
  }
}

// Execute the function
createRepository().catch((error) => {
  console.error('Failed to create repository:', error);
  process.exit(1);
});