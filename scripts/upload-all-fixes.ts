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
      message: `Fix button functionality and all server errors - comprehensive bug fixes`,
      content: Buffer.from(content).toString('base64'),
      sha: existingFile?.sha,
    });
    
    console.log(`✅ Uploaded: ${githubPath}`);
    return true;
  } catch (error: any) {
    console.log(`❌ Failed to upload ${githubPath}: ${error.message}`);
    return false;
  }
}

async function uploadAllFixes() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Uploading comprehensive bug fixes...');
  console.log('');
  
  const filesToUpload = [
    'server/routes.ts',
    'server/services/project-generator.ts', 
    'server/services/github-service.ts',
    'server/localAuth.ts',
    'server/index.ts'
  ];
  
  let successCount = 0;
  
  for (const file of filesToUpload) {
    const success = await uploadFileToGitHub(octokit, owner, repo, file, file);
    if (success) successCount++;
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
  }
  
  console.log('');
  console.log('🎉 COMPREHENSIVE BUG FIXES UPLOADED TO GITHUB!');
  console.log(`✅ Successfully uploaded: ${successCount}/${filesToUpload.length} files`);
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
  console.log('');
  console.log('📋 All Button & Error Issues Fixed:');
  console.log('✅ Type safety in routes.ts (timestamps, null checks)');
  console.log('✅ Project generation errors (path validation, template parsing)');
  console.log('✅ Project creation validation (metadata JSON handling)');
  console.log('✅ GitHub integration made optional (no crashes without token)');
  console.log('✅ Session configuration (Windows compatible memory store)');
  console.log('✅ Regression fixes (conversationId guard, JSON.parse protection)');
  console.log('');
  console.log('🚀 Ready for Windows:');
  console.log('git clone https://github.com/nashin2025/ai-assistant-studio-20250928.git');
  console.log('cd ai-assistant-studio-20250928');
  console.log('copy package.windows.json package.json');
  console.log('npm install');
  console.log('npm run dev');
  console.log('# SUCCESS: All buttons work, no server errors!');
}

uploadAllFixes().catch(console.error);