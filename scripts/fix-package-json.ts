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

async function fixPackageJson() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Creating Windows-compatible package.json...');
  
  // Read the current package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Fix the scripts to use cross-env for Windows compatibility
  packageJson.scripts = {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "cross-env NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  };
  
  console.log('✅ Fixed scripts to use cross-env for Windows compatibility');
  
  // Get existing file to get SHA
  let existingFile;
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'package.json',
    });
    existingFile = Array.isArray(response.data) ? null : response.data;
  } catch (error: any) {
    if (error.status === 404) {
      existingFile = null;
    } else {
      throw error;
    }
  }
  
  // Upload the fixed package.json
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: 'package.json',
    message: 'Fix Windows compatibility - use cross-env in npm scripts',
    content: Buffer.from(JSON.stringify(packageJson, null, 2)).toString('base64'),
    sha: existingFile?.sha,
  });
  
  console.log('✅ Uploaded Windows-compatible package.json to GitHub');
  console.log('');
  console.log('🎉 Windows fix is ready!');
  console.log('');
  console.log('📋 On your Windows machine, run:');
  console.log('git pull origin main');
  console.log('npm install');
  console.log('npm run dev');
  console.log('');
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
}

fixPackageJson().catch(console.error);