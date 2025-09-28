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

async function uploadFilesToGitHub() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  // First create README.md
  const readmeContent = fs.readFileSync('README.md', 'utf8');
  
  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: 'Add README for AI Assistant Studio',
      content: Buffer.from(readmeContent).toString('base64'),
    });
    console.log('✅ Uploaded README.md');
  } catch (error) {
    console.log('README already exists, updating...');
    
    // Get existing file SHA
    const existing = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'README.md',
    });
    
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: 'Update README for AI Assistant Studio',
      content: Buffer.from(readmeContent).toString('base64'),
      sha: (existing.data as any).sha,
    });
    console.log('✅ Updated README.md');
  }
  
  // Upload package.json
  const packageContent = fs.readFileSync('package.json', 'utf8');
  
  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'package.json',
      message: 'Add package.json',
      content: Buffer.from(packageContent).toString('base64'),
    });
    console.log('✅ Uploaded package.json');
  } catch (error) {
    console.log('package.json upload failed:', error.message);
  }
  
  console.log('🎉 Repository setup complete!');
  console.log(`🔗 Visit: https://github.com/${owner}/${repo}`);
}

uploadFilesToGitHub().catch(console.error);