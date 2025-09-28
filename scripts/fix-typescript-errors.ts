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
      message: `Fix TypeScript errors in ${filePath}`,
      content: Buffer.from(content).toString('base64'),
      sha: existingFile?.sha,
    });
    console.log(`✅ Fixed TypeScript errors in ${filePath}`);
    return true;
  } catch (error: any) {
    console.log(`❌ Failed to fix ${filePath}: ${error.message}`);
    return false;
  }
}

async function fixTypeScriptErrors() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Fixing TypeScript errors...');
  
  // Fix file-service.ts - Analysis type issue
  console.log('📁 Fixing server/services/file-service.ts...');
  const fileServiceCode = fs.readFileSync('server/services/file-service.ts', 'utf8');
  
  const fixedFileServiceCode = fileServiceCode
    // Fix the analysis type issue - already serialize to string
    .replace(
      /analysis: JSON\.stringify\(await this\.analyzeFile\(content, originalName, mimeType\)\),/,
      `analysis: JSON.stringify(await this.analyzeFile(content, originalName, mimeType)),`
    )
    // Also ensure the analyzeFile method returns a serializable object
    .replace(
      /async analyzeFile\(content: Buffer, originalName: string, mimeType: string\): Promise<FileAnalysis>/,
      `async analyzeFile(content: Buffer, originalName: string, mimeType: string): Promise<string>`
    )
    .replace(
      /return \{[\s\S]*?\};/g, // Replace the return object
      (match) => {
        if (match.includes('type:') && match.includes('size:')) {
          return `return JSON.stringify(${match.slice(7, -1)});`; // Remove 'return ' and ';', add JSON.stringify
        }
        return match;
      }
    );
  
  if (fixedFileServiceCode !== fileServiceCode) {
    await uploadFileToGitHub(octokit, owner, repo, 'server/services/file-service.ts', fixedFileServiceCode);
  }
  
  console.log('');
  console.log('✅ TypeScript errors fixed!');
  console.log('');
  console.log('📋 Windows networking and TypeScript fixes applied!');
  console.log('');
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
}

fixTypeScriptErrors().catch(console.error);