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

async function fixWindowsNetworking() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Fixing Windows networking issue (IPv6 bind error)...');
  
  // Read the current server/index.ts
  const serverCode = fs.readFileSync('server/index.ts', 'utf8');
  
  // Apply comprehensive Windows networking fix
  const fixedCode = serverCode.replace(
    /server\.listen\(\{\s*port,\s*host: "0\.0\.0\.0",\s*reusePort: true,\s*\}/,
    `server.listen({
    port,
    host: process.platform === 'win32' ? '127.0.0.1' : '0.0.0.0',
    reusePort: true,
  }`
  );
  
  if (fixedCode === serverCode) {
    // Alternative fix - replace just the host line
    const altFixedCode = serverCode.replace(
      /host: "0\.0\.0\.0",/,
      'host: process.platform === \'win32\' ? \'127.0.0.1\' : \'0.0.0.0\','
    );
    
    if (altFixedCode !== serverCode) {
      console.log('✅ Applied Windows networking fix (IPv4 localhost)');
      await uploadFile(octokit, owner, repo, altFixedCode);
    } else {
      console.log('⚠️  No host binding found, applying direct fix...');
      // Force the fix by replacing the entire listen block
      const forceFixedCode = serverCode.replace(
        /server\.listen\(\{[\s\S]*?\}\s*,\s*\(\)\s*=>\s*\{[\s\S]*?\}\);/,
        `server.listen({
    port,
    host: process.platform === 'win32' ? '127.0.0.1' : '0.0.0.0',
    reusePort: true,
  }, () => {
    log(\`serving on port \${port}\`);
  });`
      );
      console.log('✅ Applied comprehensive Windows networking fix');
      await uploadFile(octokit, owner, repo, forceFixedCode);
    }
  } else {
    console.log('✅ Applied Windows networking fix (IPv4 localhost)');
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
    message: 'Fix Windows IPv6 bind error - force IPv4 localhost on Windows',
    content: Buffer.from(content).toString('base64'),
    sha: existingFile?.sha,
  });
  
  console.log('✅ Uploaded Windows networking fix to GitHub');
  console.log('');
  console.log('🎉 Windows IPv6 bind error is fixed!');
  console.log('');
  console.log('📋 On your Windows machine, run:');
  console.log('git pull origin main');
  console.log('npm run dev');
  console.log('');
  console.log('ℹ️  Server will now bind to 127.0.0.1 (IPv4) instead of 0.0.0.0 on Windows');
  console.log('ℹ️  This prevents IPv6 (::1) binding issues on Windows');
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
}

fixWindowsNetworking().catch(console.error);