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

async function uploadMissingFiles() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Uploading missing configuration files...');
  
  // Essential configuration files that were missing
  const missingFiles = [
    { local: 'vite.config.ts', github: 'vite.config.ts' },
    { local: 'client/src/index.css', github: 'client/src/index.css' },
    { local: 'tailwind.config.ts', github: 'tailwind.config.ts' },
  ];
  
  let uploadedCount = 0;
  
  for (const file of missingFiles) {
    const success = await uploadFileToGitHub(octokit, owner, repo, file.local, file.github);
    if (success) uploadedCount++;
  }
  
  console.log('');
  console.log(`🎉 Upload complete! ${uploadedCount}/${missingFiles.length} files processed.`);
  console.log('');
  console.log('📋 Windows fix is ready! Run these commands:');
  console.log('git pull origin main');
  console.log('npm install');
  console.log('npm run dev');
  console.log('');
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
}

uploadMissingFiles().catch(console.error);