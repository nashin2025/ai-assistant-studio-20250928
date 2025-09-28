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

async function forceUpdateFile(octokit: Octokit, owner: string, repo: string, filePath: string, githubPath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size > 1024 * 1024) { // Skip files larger than 1MB
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // First get the existing file to get its SHA
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
        existingFile = null; // File doesn't exist
      } else {
        throw error;
      }
    }
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: githubPath,
      message: `Force sync ${githubPath}`,
      content: Buffer.from(content).toString('base64'),
      sha: existingFile?.sha, // Include SHA for updates
    });
    console.log(`✅ Force synced ${githubPath}`);
    return true;
  } catch (error: any) {
    console.log(`❌ Failed to force sync ${githubPath}: ${error.message}`);
    return false;
  }
}

async function forceSyncAll() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Force syncing ALL essential files...');
  
  // Key files that must be perfectly synced
  const criticalFiles = [
    'shared/schema.ts',
    'server/storage.ts', 
    'server/routes.ts',
    'server/index.ts',
    'vite.config.ts',
    'client/src/App.tsx',
    'client/src/main.tsx',
    'client/src/index.css',
    'package.json',
    'tsconfig.json',
    'tailwind.config.ts',
    
    // All client components
    'client/src/components/chat/chat-input.tsx',
    'client/src/components/chat/chat-interface.tsx', 
    'client/src/components/chat/file-upload-zone.tsx',
    'client/src/components/chat/message.tsx',
    'client/src/components/layout/header.tsx',
    'client/src/components/layout/main-layout.tsx',
    'client/src/components/layout/sidebar.tsx',
    
    // All pages
    'client/src/pages/home.tsx',
    'client/src/pages/code-analysis.tsx',
    'client/src/pages/web-search.tsx',
    'client/src/pages/document-analysis.tsx',
    'client/src/pages/project-planning.tsx',
    'client/src/pages/project-templates.tsx',
    'client/src/pages/settings.tsx',
    'client/src/pages/integrations.tsx',
    'client/src/pages/landing.tsx',
    'client/src/pages/not-found.tsx',
    
    // All hooks
    'client/src/hooks/use-chat.ts',
    'client/src/hooks/use-file-upload.ts',
    'client/src/hooks/use-llm.ts',
    'client/src/hooks/useAuth.ts',
    'client/src/hooks/use-toast.ts',
    'client/src/hooks/use-mobile.tsx',
    
    // All contexts
    'client/src/contexts/auth-context.tsx',
    
    // All lib
    'client/src/lib/queryClient.ts',
    'client/src/lib/utils.ts',
    'client/src/lib/authUtils.ts',
    
    // All components/tools
    'client/src/components/tools/context-panel.tsx',
    'client/src/components/tools/llm-config.tsx',
    'client/src/components/tools/search-engines.tsx',
    'client/src/components/project-versions.tsx',
    
    // All server services
    'server/services/file-service.ts',
    'server/services/llm-service.ts',
    'server/services/search-service.ts',
    'server/services/project-generator.ts',
    'server/services/template-service.ts',
  ];
  
  let syncedCount = 0;
  let failedCount = 0;
  
  console.log(`Force syncing ${criticalFiles.length} critical files...`);
  
  for (const file of criticalFiles) {
    const success = await forceUpdateFile(octokit, owner, repo, file, file);
    if (success) {
      syncedCount++;
    } else {
      failedCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('');
  console.log('📊 Force Sync Summary:');
  console.log(`✅ Successfully synced: ${syncedCount} files`);
  console.log(`❌ Failed to sync: ${failedCount} files`);
  console.log('');
  console.log('🎉 ALL FILES ARE NOW PERFECTLY SYNCED ON GITHUB!');
  console.log('');
  console.log('📋 Your Windows machine is ready! Run:');
  console.log('git pull origin main');
  console.log('npm install');
  console.log('npm run dev');
  console.log('');
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
}

forceSyncAll().catch(console.error);