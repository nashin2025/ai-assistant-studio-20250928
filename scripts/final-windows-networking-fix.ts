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

async function applyFinalWindowsFix() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Applying final Windows networking fix...');
  
  // Read the current server/index.ts
  const serverCode = fs.readFileSync('server/index.ts', 'utf8');
  
  // Apply comprehensive Windows-compatible networking fix
  const fixedCode = serverCode.replace(
    /server\.listen\(\{\s*port,\s*host: "0\.0\.0\.0",\s*reusePort: true,\s*\}/,
    `server.listen(
    port,
    process.platform === 'win32' ? 'localhost' : '0.0.0.0'`
  );
  
  if (fixedCode === serverCode) {
    // Alternative approach - replace the entire listen block with Windows-compatible version
    const windowsCompatibleCode = serverCode.replace(
      /server\.listen\(\{[\s\S]*?\}\s*,\s*\(\)\s*=>\s*\{[\s\S]*?\}\);/,
      `// Windows-compatible server listening
  if (process.platform === 'win32') {
    // Windows: Use simple listen without reusePort
    server.listen(port, 'localhost', () => {
      log(\`serving on port \${port}\`);
    });
  } else {
    // Unix/Linux: Use advanced options
    server.listen({
      port,
      host: '0.0.0.0',
      reusePort: true,
    }, () => {
      log(\`serving on port \${port}\`);
    });
  }`
    );
    
    console.log('✅ Applied comprehensive Windows networking fix');
    await uploadFile(octokit, owner, repo, windowsCompatibleCode);
  } else {
    console.log('✅ Applied Windows networking fix');
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
    message: 'Final Windows fix - remove reusePort and use simple listen on Windows',
    content: Buffer.from(content).toString('base64'),
    sha: existingFile?.sha,
  });
  
  console.log('✅ Uploaded final Windows networking fix to GitHub');
  console.log('');
  console.log('🎉 FINAL WINDOWS NETWORKING FIX APPLIED!');
  console.log('');
  console.log('🔧 What was fixed:');
  console.log('✅ Removed reusePort (Linux-only feature)');
  console.log('✅ Simple listen() call on Windows');
  console.log('✅ Uses localhost on Windows, 0.0.0.0 on Unix');
  console.log('✅ Platform-specific network configuration');
  console.log('');
  console.log('📋 On your Windows machine, run:');
  console.log('git pull origin main');
  console.log('npm run dev');
  console.log('');
  console.log('✨ Server should now start successfully on Windows!');
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
}

applyFinalWindowsFix().catch(console.error);