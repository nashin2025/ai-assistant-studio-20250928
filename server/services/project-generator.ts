import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { storage } from '../storage';
import type { ProjectTemplate, Project } from '@shared/schema';

// Security utility to validate and sanitize file paths
function sanitizeFilePath(filePath: string, projectPath: string): string {
  // Normalize the file path to prevent directory traversal
  const normalized = path.normalize(filePath);
  
  // Reject absolute paths
  if (path.isAbsolute(normalized)) {
    throw new Error(`Absolute paths are not allowed: ${filePath}`);
  }
  
  // Reject paths with .. segments that could escape the project directory
  if (normalized.includes('..')) {
    throw new Error(`Path traversal detected: ${filePath}`);
  }
  
  // Resolve the full target path
  const targetPath = path.join(projectPath, normalized);
  
  // Ensure the target path is within the project directory
  const relativePath = path.relative(projectPath, targetPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Path escapes project directory: ${filePath}`);
  }
  
  return targetPath;
}

interface GeneratedProject {
  project: Project;
  filesPath: string;
  zipPath: string;
  downloadUrl: string;
}

export class ProjectGeneratorService {
  private readonly baseOutputPath = path.join(process.cwd(), 'generated-projects');

  constructor() {
    this.ensureOutputDirectory();
  }

  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.baseOutputPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create output directory:', error);
    }
  }

  async generateProjectFromTemplate(
    templateId: string,
    projectName: string,
    description: string,
    userId: string
  ): Promise<GeneratedProject> {
    const template = await storage.getProjectTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create project record in database
    const project = await storage.createProject({
      userId,
      name: projectName || template.name,
      description: description || template.description,
      status: 'active',
      metadata: {
        templateId: template.id,
        techStack: template.techStack,
        generatedAt: new Date().toISOString(),
        templateName: template.name
      }
    });

    // Generate files on disk
    const projectPath = path.join(this.baseOutputPath, project.id);
    await this.createProjectFiles(projectPath, template, projectName);

    // Create zip archive
    const zipPath = path.join(this.baseOutputPath, `${project.id}.zip`);
    await this.createZipArchive(projectPath, zipPath);

    return {
      project,
      filesPath: projectPath,
      zipPath,
      downloadUrl: `/api/download/project/${project.id}`
    };
  }

  private async createProjectFiles(
    projectPath: string,
    template: ProjectTemplate,
    projectName: string
  ): Promise<void> {
    // Ensure project directory exists
    await fs.mkdir(projectPath, { recursive: true });

    const files = template.files as Array<{
      path: string;
      content: string;
      type: string;
    }>;

    for (const file of files) {
      // Sanitize file path to prevent directory traversal attacks
      const filePath = sanitizeFilePath(file.path, projectPath);
      const fileDir = path.dirname(filePath);

      // Ensure directory structure exists
      await fs.mkdir(fileDir, { recursive: true });

      // Replace template variables in content
      let content = file.content;
      content = content.replace(/\{\{projectName\}\}/g, projectName);
      content = content.replace(/\{\{PROJECT_NAME\}\}/g, projectName);
      
      // For package.json, update the name field
      if (file.path === 'package.json') {
        try {
          const packageJson = JSON.parse(content);
          packageJson.name = projectName.toLowerCase().replace(/\s+/g, '-');
          content = JSON.stringify(packageJson, null, 2);
        } catch (error) {
          console.warn('Failed to parse package.json template:', error);
        }
      }

      // Write file to disk
      await fs.writeFile(filePath, content, 'utf8');
    }

    // Create README.md with instructions
    const readmeContent = this.generateReadme(template, projectName);
    await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent, 'utf8');

    console.log(`Generated project files for ${projectName} at ${projectPath}`);
  }

  private async createZipArchive(projectPath: string, zipPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(projectPath, false);
      archive.finalize();
    });
  }

  private generateReadme(template: ProjectTemplate, projectName: string): string {
    return `# ${projectName}

${template.description}

## Generated from Template: ${template.name}

**Difficulty:** ${template.difficulty}
${template.estimatedTime ? `**Estimated Setup Time:** ${template.estimatedTime}` : ''}

## Tech Stack

${this.formatTechStack(template.techStack)}

## Setup Instructions

${template.instructions || 'No specific setup instructions provided.'}

## Dependencies

${template.dependencies ? '```json\n' + JSON.stringify(template.dependencies, null, 2) + '\n```' : 'No dependencies specified.'}

## Project Structure

This project was generated with the following file structure:

${this.generateFileTree(template.files as Array<{path: string, type: string}>)}

---

Generated on ${new Date().toISOString()} using AI Assistant Studio
`;
  }

  private formatTechStack(techStack: any): string {
    if (!techStack) return 'No tech stack specified.';

    const sections = [];
    if (techStack.frontend?.length) {
      sections.push(`**Frontend:** ${techStack.frontend.join(', ')}`);
    }
    if (techStack.backend?.length) {
      sections.push(`**Backend:** ${techStack.backend.join(', ')}`);
    }
    if (techStack.database?.length) {
      sections.push(`**Database:** ${techStack.database.join(', ')}`);
    }
    if (techStack.tools?.length) {
      sections.push(`**Tools:** ${techStack.tools.join(', ')}`);
    }

    return sections.join('\n');
  }

  private generateFileTree(files: Array<{path: string, type: string}>): string {
    return files
      .map(file => `- \`${file.path}\` (${file.type})`)
      .join('\n');
  }

  async getProjectDownload(projectId: string): Promise<string | null> {
    // Validate project ID format (should be UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      throw new Error(`Invalid project ID format: ${projectId}`);
    }

    const zipPath = path.join(this.baseOutputPath, `${projectId}.zip`);
    
    // Ensure the resolved path is within the base output directory
    const relativePath = path.relative(this.baseOutputPath, zipPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`Project ID escapes base directory: ${projectId}`);
    }
    
    try {
      await fs.access(zipPath);
      return zipPath;
    } catch {
      return null;
    }
  }

  async cleanupProject(projectId: string): Promise<void> {
    const projectPath = path.join(this.baseOutputPath, projectId);
    const zipPath = path.join(this.baseOutputPath, `${projectId}.zip`);

    try {
      await fs.rm(projectPath, { recursive: true, force: true });
      await fs.rm(zipPath, { force: true });
    } catch (error) {
      console.error(`Failed to cleanup project ${projectId}:`, error);
    }
  }
}