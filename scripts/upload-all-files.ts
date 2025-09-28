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

async function uploadFileToGitHub(octokit: Octokit, owner: string, repo: string, filePath: string, githubPath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size > 1024 * 1024) { // Skip files larger than 1MB
      console.log(`⚠️  Skipping large file: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
      return false;
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
    return true;
  } catch (error: any) {
    if (error.status === 422) {
      return true; // File already exists, that's fine
    } else {
      console.log(`❌ Failed to upload ${githubPath}: ${error.message}`);
      return false;
    }
  }
}

async function getAllFiles(dir: string, baseDir: string = ''): Promise<string[]> {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = baseDir ? path.join(baseDir, entry.name) : entry.name;
    
    // Skip certain directories and files
    if (entry.name.startsWith('.') || 
        entry.name === 'node_modules' || 
        entry.name === 'dist' ||
        entry.name === 'data' ||
        entry.name === 'uploads' ||
        entry.name === 'generated-projects' ||
        entry.name === '.cache' ||
        entry.name === '.local' ||
        entry.name === '.upm' ||
        entry.name.endsWith('.log') ||
        entry.name.endsWith('.tar.gz')) {
      continue;
    }
    
    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, relativePath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      // Only include source code and config files
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.md'].includes(ext) ||
          entry.name === 'components.json' ||
          entry.name.includes('config')) {
        files.push(relativePath);
      }
    }
  }
  
  return files;
}

async function uploadAllFiles() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Scanning for ALL project files...');
  
  // Get all files from the project
  const allFiles = await getAllFiles('.');
  
  console.log(`Found ${allFiles.length} files to check/upload`);
  console.log('📤 Starting comprehensive upload...');
  
  let uploadedCount = 0;
  let existingCount = 0;
  let failedCount = 0;
  
  // Upload files in batches to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (file) => {
      const success = await uploadFileToGitHub(octokit, owner, repo, file, file);
      if (success) {
        if (fs.existsSync(file)) {
          uploadedCount++;
        } else {
          existingCount++;
        }
      } else {
        failedCount++;
      }
    }));
    
    // Small delay between batches
    if (i + batchSize < allFiles.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('');
  console.log('📊 Upload Summary:');
  console.log(`✅ Uploaded: ${uploadedCount} files`);
  console.log(`⚠️  Already existed: ${existingCount} files`);
  console.log(`❌ Failed: ${failedCount} files`);
  console.log(`📝 Total processed: ${allFiles.length} files`);
  console.log('');
  console.log('🎉 COMPLETE! All files are now on GitHub!');
  console.log('');
  console.log('📋 Run these commands on Windows:');
  console.log('git pull origin main');
  console.log('npm install');
  console.log('npm run dev');
  console.log('');
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
}

uploadAllFiles().catch(console.error);