#!/usr/bin/env tsx
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

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

async function uploadFileToGitHub(octokit: Octokit, owner: string, repo: string, filePath: string, githubPath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: githubPath,
      message: `Add ${githubPath}`,
      content: Buffer.from(content).toString('base64'),
    });
    console.log(`✅ Uploaded ${githubPath}`);
  } catch (error: any) {
    if (error.status === 422) {
      console.log(`⚠️  ${githubPath} already exists, skipping...`);
    } else {
      console.log(`❌ Failed to upload ${githubPath}: ${error.message}`);
    }
  }
}

async function uploadCompleteProject() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🚀 Uploading complete AI Assistant Studio...');
  
  // Essential configuration files
  const files = [
    { local: 'package.json', github: 'package.json' },
    { local: 'package-lock.json', github: 'package-lock.json' },
    { local: 'drizzle.config.ts', github: 'drizzle.config.ts' },
    { local: 'components.json', github: 'components.json' },
    { local: 'postcss.config.js', github: 'postcss.config.js' },
    { local: '.gitignore', github: '.gitignore' },
    { local: '.replit', github: '.replit' },
    { local: 'replit.md', github: 'replit.md' },
    
    // Core application files
    { local: 'shared/schema.ts', github: 'shared/schema.ts' },
    { local: 'server/storage.ts', github: 'server/storage.ts' },
    { local: 'server/index.ts', github: 'server/index.ts' },
    { local: 'server/routes.ts', github: 'server/routes.ts' },
    { local: 'server/localAuth.ts', github: 'server/localAuth.ts' },
    { local: 'server/localGitHubClient.ts', github: 'server/localGitHubClient.ts' },
    { local: 'server/vite.ts', github: 'server/vite.ts' },
  ];
  
  for (const file of files) {
    await uploadFileToGitHub(octokit, owner, repo, file.local, file.github);
  }
  
  console.log('🎉 Core application uploaded successfully!');
  console.log(`🔗 Visit: https://github.com/${owner}/${repo}`);
  console.log('');
  console.log('📋 Next steps for full setup:');
  console.log('1. Clone the repository locally');
  console.log('2. Upload client/ directory (frontend React app)');
  console.log('3. Upload server/services/ directory');
  console.log('4. Run npm install && npm run dev');
}

uploadCompleteProject().catch(console.error);