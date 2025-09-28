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

async function fixWindowsHost() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Fixing Windows host binding issue...');
  
  // Read the current server/index.ts
  const serverCode = fs.readFileSync('server/index.ts', 'utf8');
  
  // Replace the problematic Windows binding
  const fixedCode = serverCode.replace(
    /server\.listen\(\{\s*port,\s*host: "0\.0\.0\.0",\s*reusePort: true,\s*\}/,
    `server.listen({
    port,
    host: process.platform === 'win32' ? 'localhost' : '0.0.0.0',
    reusePort: true,
  }`
  );
  
  if (fixedCode === serverCode) {
    console.log('⚠️  Code pattern not found, using alternative fix...');
    // Alternative approach - replace the specific line
    const altFixedCode = serverCode.replace(
      'host: "0.0.0.0",',
      'host: process.platform === \'win32\' ? \'localhost\' : \'0.0.0.0\','
    );
    
    if (altFixedCode !== serverCode) {
      console.log('✅ Applied Windows host binding fix');
      await uploadFile(octokit, owner, repo, altFixedCode);
    } else {
      throw new Error('Could not find host binding line to fix');
    }
  } else {
    console.log('✅ Applied Windows host binding fix');
    await uploadFile(octokit, owner, repo, fixedCode);
  }
}

async function uploadFile(octokit: any, owner: string, repo: string, content: string) {
  // Get existing file to get SHA
  let existingFile;
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'server/index.ts',
    });
    existingFile = Array.isArray(response.data) ? null : response.data;
  } catch (error: any) {
    if (error.status === 404) {
      existingFile = null;
    } else {
      throw error;
    }
  }
  
  // Upload the fixed server/index.ts
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: 'server/index.ts',
    message: 'Fix Windows host binding - use localhost on Windows platform',
    content: Buffer.from(content).toString('base64'),
    sha: existingFile?.sha,
  });
  
  console.log('✅ Uploaded Windows-compatible server/index.ts to GitHub');
  console.log('');
  console.log('🎉 Windows networking fix is ready!');
  console.log('');
  console.log('📋 On your Windows machine, run:');
  console.log('git pull origin main');
  console.log('npm run dev');
  console.log('');
  console.log('ℹ️  The server will now bind to localhost instead of 0.0.0.0 on Windows');
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
}

fixWindowsHost().catch(console.error);