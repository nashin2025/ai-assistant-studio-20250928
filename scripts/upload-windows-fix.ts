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
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Get existing file to get SHA for updates
    let existingFile;
    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: githubPath,
      });
      existingFile = Array.isArray(response.data) ? null : response.data;
    } catch (error: any) {
      if (error.status === 404) {
        existingFile = null;
      } else {
        throw error;
      }
    }
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: githubPath,
      message: `Fix Windows networking - use localhost instead of 0.0.0.0`,
      content: Buffer.from(content).toString('base64'),
      sha: existingFile?.sha,
    });
    
    console.log(`✅ Windows networking fix uploaded: ${githubPath}`);
    return true;
  } catch (error: any) {
    console.log(`❌ Failed to upload ${githubPath}: ${error.message}`);
    return false;
  }
}

async function uploadWindowsFix() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Uploading Windows networking fix...');
  
  // Upload the fixed server/index.ts
  const success = await uploadFileToGitHub(octokit, owner, repo, 'server/index.ts', 'server/index.ts');
  
  if (success) {
    console.log('');
    console.log('✅ WINDOWS FIX UPLOADED TO GITHUB!');
    console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
    console.log('');
    console.log('📋 Windows Fix Includes:');
    console.log('✅ Platform detection (win32 vs unix)');
    console.log('✅ localhost binding on Windows');
    console.log('✅ 0.0.0.0 binding on Linux/macOS');
    console.log('✅ reusePort disabled on Windows');
    console.log('');
    console.log('🚀 Ready to clone on Windows:');
    console.log('git clone https://github.com/nashin2025/ai-assistant-studio-20250928.git');
    console.log('cd ai-assistant-studio-20250928');
    console.log('copy package.windows.json package.json');
    console.log('npm install');
    console.log('npm run dev');
  } else {
    console.log('❌ Failed to upload Windows fix');
  }
}

uploadWindowsFix().catch(console.error);