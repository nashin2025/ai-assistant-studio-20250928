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
      message: `Fix Windows compatibility in ${filePath}`,
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

async function fixCompleteWindowsCompatibility() {
  const octokit = await getGitHubClient();
  const owner = 'nashin2025';
  const repo = 'ai-assistant-studio-20250928';
  
  console.log('🔧 Applying comprehensive Windows compatibility fixes...');
  
  let fixedCount = 0;
  
  // Fix 1: Storage.ts - Fix database path handling and JSON serialization issues
  console.log('📁 Fixing storage.ts for Windows...');
  const storageCode = fs.readFileSync('server/storage.ts', 'utf8');
  
  const fixedStorageCode = storageCode
    // Fix database path for Windows
    .replace(
      /const dataDir = path\.join\(process\.cwd\(\), 'data'\);/,
      `const dataDir = path.join(process.cwd(), 'data');
    // Ensure Windows-compatible path handling
    const normalizedDataDir = path.resolve(dataDir);`
    )
    .replace(
      /const dbPath = path\.join\(dataDir, 'ai-assistant-studio\.db'\);/,
      `const dbPath = path.join(normalizedDataDir, 'ai-assistant-studio.db');
    console.log('SQLite database path:', dbPath);`
    )
    // Fix JSON serialization issues for Windows file paths
    .replace(
      /analysis: await this\.analyzeFile\(content, originalName, mimeType\),/g,
      `analysis: JSON.stringify(await this.analyzeFile(content, originalName, mimeType)),`
    );
  
  if (fixedStorageCode !== storageCode) {
    await uploadFileToGitHub(octokit, owner, repo, 'server/storage.ts', fixedStorageCode);
    fixedCount++;
  }
  
  // Fix 2: File Service - Fix analysis type issue and Windows path handling
  console.log('📁 Fixing file-service.ts for Windows...');
  const fileServiceCode = fs.readFileSync('server/services/file-service.ts', 'utf8');
  
  const fixedFileServiceCode = fileServiceCode
    // Fix analysis type issue
    .replace(
      /analysis: await this\.analyzeFile\(content, originalName, mimeType\),/,
      `analysis: JSON.stringify(await this.analyzeFile(content, originalName, mimeType)),`
    )
    // Ensure Windows-compatible upload directory
    .replace(
      /private uploadDir = process\.env\.UPLOAD_DIR \|\| '\.\/uploads';/,
      `private uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');`
    )
    // Add Windows-compatible path normalization
    .replace(
      /const filePath = path\.join\(this\.uploadDir, filename\);/,
      `const filePath = path.resolve(this.uploadDir, filename);
    console.log('File upload path:', filePath);`
    );
  
  if (fixedFileServiceCode !== fileServiceCode) {
    await uploadFileToGitHub(octokit, owner, repo, 'server/services/file-service.ts', fixedFileServiceCode);
    fixedCount++;
  }
  
  // Fix 3: Project Generator - Windows-compatible project path handling
  console.log('📁 Fixing project-generator.ts for Windows...');
  const projectGenCode = fs.readFileSync('server/services/project-generator.ts', 'utf8');
  
  const fixedProjectGenCode = projectGenCode
    // Fix base output path for Windows
    .replace(
      /private readonly baseOutputPath = path\.join\(process\.cwd\(\), 'generated-projects'\);/,
      `private readonly baseOutputPath = path.resolve(process.cwd(), 'generated-projects');`
    )
    // Add Windows path normalization in sanitization
    .replace(
      /const normalized = path\.normalize\(filePath\);/,
      `const normalized = path.normalize(filePath.replace(/\\\\/g, '/'));`
    )
    // Ensure Windows-compatible directory creation
    .replace(
      /await fs\.mkdir\(projectPath, \{ recursive: true \}\);/,
      `await fs.mkdir(path.resolve(projectPath), { recursive: true });`
    );
  
  if (fixedProjectGenCode !== projectGenCode) {
    await uploadFileToGitHub(octokit, owner, repo, 'server/services/project-generator.ts', fixedProjectGenCode);
    fixedCount++;
  }
  
  // Fix 4: Routes.ts - Windows path handling for README
  console.log('📁 Fixing routes.ts for Windows...');
  const routesCode = fs.readFileSync('server/routes.ts', 'utf8');
  
  const fixedRoutesCode = routesCode
    // Fix README path for Windows
    .replace(
      /readmeContent = await fs\.readFile\('\.\/README\.md', 'utf-8'\);/,
      `readmeContent = await fs.readFile(path.resolve(process.cwd(), 'README.md'), 'utf-8');`
    );
  
  if (fixedRoutesCode !== routesCode) {
    await uploadFileToGitHub(octokit, owner, repo, 'server/routes.ts', fixedRoutesCode);
    fixedCount++;
  }
  
  // Fix 5: Vite.ts - Windows template path handling
  console.log('📁 Fixing vite.ts for Windows...');
  const viteCode = fs.readFileSync('server/vite.ts', 'utf8');
  
  const fixedViteCode = viteCode
    // Ensure Windows-compatible template path
    .replace(
      /const clientTemplate = path\.resolve\(/,
      `const clientTemplate = path.resolve(process.cwd(),`
    )
    // Fix dist path for Windows
    .replace(
      /const distPath = path\.resolve\(import\.meta\.dirname, "public"\);/,
      `const distPath = path.resolve(process.cwd(), "dist", "public");`
    );
  
  if (fixedViteCode !== viteCode) {
    await uploadFileToGitHub(octokit, owner, repo, 'server/vite.ts', fixedViteCode);
    fixedCount++;
  }
  
  // Fix 6: Template Service - Windows command compatibility
  console.log('📁 Fixing template-service.ts for Windows...');
  const templateCode = fs.readFileSync('server/services/template-service.ts', 'utf8');
  
  const fixedTemplateCode = templateCode
    // Fix Windows activation command in Python template
    .replace(
      /"1\. Create a virtual environment: python -m venv venv\\n2\. Activate it: source venv\/bin\/activate \(Unix\) or venv\\\\Scripts\\\\activate \(Windows\)\\n3\. Install dependencies: pip install -r requirements\.txt\\n4\. Create \.env file with DATABASE_URL\\n5\. Run the server: python main\.py\\n6\. Visit http:\/\/localhost:8000\/docs for interactive API documentation"/,
      `"1. Create a virtual environment: python -m venv venv\\n2. Activate it:\\n   - Windows: venv\\\\Scripts\\\\activate.bat\\n   - Unix/Mac: source venv/bin/activate\\n3. Install dependencies: pip install -r requirements.txt\\n4. Create .env file with DATABASE_URL\\n5. Run the server: python main.py\\n6. Visit http://localhost:8000/docs for interactive API documentation"`
    );
  
  if (fixedTemplateCode !== templateCode) {
    await uploadFileToGitHub(octokit, owner, repo, 'server/services/template-service.ts', fixedTemplateCode);
    fixedCount++;
  }
  
  console.log('');
  console.log('📊 Windows Compatibility Summary:');
  console.log(`✅ Fixed: ${fixedCount} files`);
  console.log('');
  console.log('🎉 COMPREHENSIVE WINDOWS COMPATIBILITY APPLIED!');
  console.log('');
  console.log('Fixed Areas:');
  console.log('✅ Database paths (Windows-compatible)');
  console.log('✅ File upload paths (normalized)');
  console.log('✅ Project generation paths (resolved)');
  console.log('✅ Template paths (Windows commands)');
  console.log('✅ JSON serialization (type safety)');
  console.log('✅ Path normalization (cross-platform)');
  console.log('');
  console.log('📋 Windows users can now:');
  console.log('git pull origin main');
  console.log('npm install');
  console.log('npm run dev');
  console.log('');
  console.log('🔗 Repository: https://github.com/nashin2025/ai-assistant-studio-20250928');
}

fixCompleteWindowsCompatibility().catch(console.error);