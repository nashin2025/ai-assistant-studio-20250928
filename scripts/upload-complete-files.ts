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
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: githubPath,
      message: `Add missing ${githubPath}`,
      content: Buffer.from(content).toString('base64'),
    });
    console.log(`✅ Uploaded ${githubPath}`);
    return true;
  } catch (error: any) {
    if (error.status === 422) {
      console.log(`⚠️  ${githubPath} already exists, skipping...`);
      return true;
    } else {
      console.log(`❌ Failed to upload ${githubPath}: ${error.message}`);
      return false;
    }
  }
}

async function uploadCompleteFiles() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Uploading missing essential files...');
  
  // Complete list of essential files that need to be uploaded
  const essentialFiles = [
    // Shared directory (schema and types)
    { local: 'shared/schema.ts', github: 'shared/schema.ts' },
    
    // Server files
    { local: 'server/storage.ts', github: 'server/storage.ts' },
    { local: 'server/routes.ts', github: 'server/routes.ts' },
    { local: 'server/index.ts', github: 'server/index.ts' },
    { local: 'server/vite.ts', github: 'server/vite.ts' },
    { local: 'server/localAuth.ts', github: 'server/localAuth.ts' },
    { local: 'server/localGitHubClient.ts', github: 'server/localGitHubClient.ts' },
    { local: 'server/replitAuth.ts', github: 'server/replitAuth.ts' },
    { local: 'server/githubClient.ts', github: 'server/githubClient.ts' },
    
    // Server services
    { local: 'server/services/file-service.ts', github: 'server/services/file-service.ts' },
    
    // Configuration files already uploaded but ensure they exist
    { local: 'tsconfig.json', github: 'tsconfig.json' },
    { local: 'tailwind.config.ts', github: 'tailwind.config.ts' },
    
    // Client index.html
    { local: 'client/index.html', github: 'client/index.html' },
    
    // Client main files
    { local: 'client/src/main.tsx', github: 'client/src/main.tsx' },
    { local: 'client/src/App.tsx', github: 'client/src/App.tsx' },
  ];
  
  let uploadedCount = 0;
  let skippedCount = 0;
  
  for (const file of essentialFiles) {
    const success = await uploadFileToGitHub(octokit, owner, repo, file.local, file.github);
    if (success) {
      if (fs.existsSync(file.local)) {
        uploadedCount++;
      } else {
        skippedCount++;
      }
    }
  }
  
  console.log('');
  console.log(`🎉 Upload complete! ${uploadedCount} files uploaded, ${skippedCount} skipped.`);
  console.log('');
  console.log('📋 Fix for "@shared/schema" error is ready! Run these commands:');
  console.log('git pull origin main');
  console.log('npm install');
  console.log('npm run dev');
  console.log('');
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
}

uploadCompleteFiles().catch(console.error);