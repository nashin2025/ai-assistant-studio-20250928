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

async function uploadServices() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🚀 Uploading AI Assistant Studio services...');
  
  // Essential service files
  const serviceFiles = [
    { local: 'server/services/file-service.ts', github: 'server/services/file-service.ts' },
    { local: 'server/services/github-service.ts', github: 'server/services/github-service.ts' },
    { local: 'server/services/llm-service.ts', github: 'server/services/llm-service.ts' },
    { local: 'server/services/project-generator.ts', github: 'server/services/project-generator.ts' },
    { local: 'server/services/search-service.ts', github: 'server/services/search-service.ts' },
    { local: 'server/services/template-service.ts', github: 'server/services/template-service.ts' },
    { local: 'server/services/github-export.ts', github: 'server/services/github-export.ts' },
  ];
  
  // Essential client files
  const clientFiles = [
    { local: 'client/index.html', github: 'client/index.html' },
    { local: 'client/src/main.tsx', github: 'client/src/main.tsx' },
    { local: 'client/src/App.tsx', github: 'client/src/App.tsx' },
    { local: 'client/src/lib/queryClient.ts', github: 'client/src/lib/queryClient.ts' },
    { local: 'client/src/hooks/useAuth.ts', github: 'client/src/hooks/useAuth.ts' },
    { local: 'client/src/hooks/use-chat.ts', github: 'client/src/hooks/use-chat.ts' },
  ];
  
  console.log('📦 Uploading service files...');
  for (const file of serviceFiles) {
    await uploadFileToGitHub(octokit, owner, repo, file.local, file.github);
  }
  
  console.log('🎨 Uploading key client files...');
  for (const file of clientFiles) {
    await uploadFileToGitHub(octokit, owner, repo, file.local, file.github);
  }
  
  console.log('🎉 Services and key client files uploaded successfully!');
  console.log(`🔗 Visit: https://github.com/${owner}/${repo}`);
}

uploadServices().catch(console.error);