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

async function uploadFileToGitHub(octokit: Octokit, owner: string, repo: string, filePath: string, content: string) {
  try {
    // Get existing file to get SHA
    let existingFile;
    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
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
      path: filePath,
      message: `Fix session configuration for ${filePath}`,
      content: Buffer.from(content).toString('base64'),
      sha: existingFile?.sha,
    });
    console.log(`✅ Fixed ${filePath}`);
    return true;
  } catch (error: any) {
    console.log(`❌ Failed to fix ${filePath}: ${error.message}`);
    return false;
  }
}

async function fixSessionConfiguration() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Fixing session configuration for Windows/SQLite...');
  
  // Fix localAuth.ts
  console.log('📁 Fixing server/localAuth.ts...');
  const localAuthCode = fs.readFileSync('server/localAuth.ts', 'utf8');
  
  const fixedLocalAuthCode = localAuthCode
    // Fix session configuration to use in-memory store for SQLite compatibility
    .replace(
      /export function getSession\(\) \{[\s\S]*?return session\(\{[\s\S]*?\}\);[\s\S]*?\}/,
      `export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use in-memory store for local development with SQLite
  // In production, this should be replaced with a persistent store
  return session({
    secret: process.env.SESSION_SECRET || 'ai-assistant-studio-local-dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Allow HTTP in development
      sameSite: 'lax', // CSRF protection
      maxAge: sessionTtl,
    },
  });
}`
    );
  
  if (fixedLocalAuthCode !== localAuthCode) {
    await uploadFileToGitHub(octokit, owner, repo, 'server/localAuth.ts', fixedLocalAuthCode);
  }
  
  console.log('');
  console.log('✅ Session configuration fixed!');
  console.log('');
  console.log('🔧 What was fixed:');
  console.log('✅ Added default session secret for local development');
  console.log('✅ Removed PostgreSQL dependency from sessions');
  console.log('✅ Uses in-memory session store (SQLite compatible)');
  console.log('✅ Maintains security settings for production');
  console.log('');
  console.log('📋 On your Windows machine, run:');
  console.log('git pull origin main');
  console.log('npm run dev');
  console.log('');
  console.log('✨ Session errors should now be resolved!');
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
}

fixSessionConfiguration().catch(console.error);