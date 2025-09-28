#!/usr/bin/env tsx
import { Octokit } from '@octokit/rest';
import fs from 'fs';

async function getGitHubClient() {
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
    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (!token) {
      throw new Error('GitHub token not found');
    }
    return new Octokit({ auth: token });
  }
}

async function uploadFixedPackageJson() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Implementing Windows compatibility fix...');
  
  // Read current package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Update scripts to use cross-env for Windows compatibility
  packageJson.scripts = {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "cross-env NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  };
  
  // Add cross-env to dependencies if not already present
  if (!packageJson.dependencies['cross-env'] && !packageJson.devDependencies['cross-env']) {
    packageJson.dependencies['cross-env'] = '^7.0.3';
  }
  
  try {
    // Get existing file SHA
    const existing = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'package.json',
    });
    
    // Update with Windows-compatible package.json
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'package.json',
      message: 'fix: Add Windows compatibility with cross-env for npm scripts',
      content: Buffer.from(JSON.stringify(packageJson, null, 2)).toString('base64'),
      sha: (existing.data as any).sha,
    });
    
    console.log('✅ Windows compatibility fix implemented!');
    console.log('');
    console.log('📋 Windows users can now:');
    console.log('1. git pull origin main');
    console.log('2. npm install');
    console.log('3. npm run dev');
    console.log('');
    console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
    
  } catch (error: any) {
    console.error('❌ Failed to update package.json:', error.message);
  }
}

uploadFixedPackageJson().catch(console.error);