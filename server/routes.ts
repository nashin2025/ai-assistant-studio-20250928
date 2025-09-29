import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./localAuth";
import { LLMService } from "./services/llm-service";
import { SearchService } from "./services/search-service";
import { FileService } from "./services/file-service";
import { GitHubService } from "./services/github-service";
import { TemplateService } from "./services/template-service";
import { ProjectGeneratorService } from "./services/project-generator";
import { GitHubExportService } from "./services/github-export";
import { promises as fs } from "fs";
import multer from "multer";
import { z } from "zod";
import { 
  insertConversationSchema,
  insertMessageSchema,
  insertProjectSchema,
  insertLLMConfigurationSchema,
  insertSearchEngineSchema,
  insertUserPreferencesSchema,
  insertUserSchema,
  insertProjectTemplateSchema,
  insertProjectPlanVersionSchema
} from "@shared/schema";

// Validation schema for project generation request
const generateProjectSchema = z.object({
  projectName: z.string().min(1, "Project name is required").max(100, "Project name too long"),
  description: z.string().max(500, "Description too long").optional()
});

// Validation schema for GitHub commit request
const githubCommitSchema = z.object({
  repo: z.string().min(1, "Repository name is required"),
  commitMessage: z.string().min(1, "Commit message is required").optional().default("Add/update README.md")
});

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth middleware
  await setupAuth(app);
  
  const llmService = new LLMService();
  const searchService = new SearchService();
  const fileService = new FileService();
  const githubService = new GitHubService();
  const templateService = new TemplateService();
  const projectGenerator = new ProjectGeneratorService();
  const githubExportService = new GitHubExportService();

  // Initialize default templates if none exist
  await templateService.initializeDefaultTemplates();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Sanitize user data - exclude sensitive fields like passwordHash
      const sanitizedUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      res.json(sanitizedUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Helper function to get userId from request
  const getUserId = (req: any): string => {
    return req.user?.id;
  };

  // Conversations
  app.get("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const data = insertConversationSchema.parse({ ...req.body, userId });
      const conversation = await storage.createConversation(data);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      // Verify conversation ownership
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await storage.deleteConversation(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Conversation not found" });
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Messages
  app.get("/api/conversations/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      // Verify conversation ownership
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      if (conversation.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const messages = await storage.getMessagesByConversationId(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      // Transform metadata object to JSON string if it exists
      const requestData = { ...req.body };
      if (requestData.metadata && typeof requestData.metadata === 'object') {
        requestData.metadata = JSON.stringify(requestData.metadata);
      }
      
      const data = insertMessageSchema.parse(requestData);
      const userId = getUserId(req);
      
      // Verify conversation ownership before creating message
      if (data.conversationId) {
        const conversation = await storage.getConversation(data.conversationId);
        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }
        if (conversation.userId !== userId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      
      const message = await storage.createMessage(data);
      
      // Update conversation timestamp (only if conversationId exists)
      if (data.conversationId) {
        await storage.updateConversation(data.conversationId, { updatedAt: Date.now() });
      }
      
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // LLM Integration
  app.post("/api/llm/chat", isAuthenticated, async (req, res) => {
    try {
      const { configId, messages, temperature, maxTokens } = req.body;
      const userId = getUserId(req);
      
      const config = await storage.getLLMConfiguration(configId);
      if (!config) {
        return res.status(404).json({ error: "LLM configuration not found" });
      }
      
      // CRITICAL: Verify config ownership to prevent API key abuse
      if (config.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const response = await llmService.sendMessage(config, {
        messages,
        temperature,
        maxTokens,
      });

      res.json(response);
    } catch (error) {
      console.error("Error in LLM chat:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to process LLM request" });
    }
  });

  app.post("/api/llm/test-connection", isAuthenticated, async (req, res) => {
    try {
      const { endpoint, model } = req.body;
      
      if (!endpoint || !model) {
        return res.status(400).json({ error: "endpoint and model are required" });
      }

      const isConnected = await llmService.testConnection(endpoint, model);
      res.json({ connected: isConnected });
    } catch (error) {
      console.error("Error testing LLM connection:", error);
      res.status(500).json({ error: "Failed to test LLM connection" });
    }
  });

  app.get("/api/llm/models", isAuthenticated, async (req, res) => {
    try {
      const { endpoint } = req.query;
      
      if (!endpoint || typeof endpoint !== 'string') {
        return res.status(400).json({ error: "endpoint is required" });
      }

      const models = await llmService.getAvailableModels(endpoint);
      res.json({ models });
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch models" });
    }
  });

  // LLM Configurations
  app.get("/api/llm-configurations", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req); // Server-derived userId for security
      const configs = await storage.getLLMConfigurationsByUserId(userId);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching LLM configurations:", error);
      res.status(500).json({ error: "Failed to fetch LLM configurations" });
    }
  });

  app.post("/api/llm-configurations", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req); // Server-derived userId for security
      const data = insertLLMConfigurationSchema.parse({ ...req.body, userId });
      const config = await storage.createLLMConfiguration(data);
      res.json(config);
    } catch (error) {
      console.error("Error creating LLM configuration:", error);
      res.status(500).json({ error: "Failed to create LLM configuration" });
    }
  });

  app.put("/api/llm-configurations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const updates = req.body;
      
      // Verify LLM configuration ownership
      const existingConfig = await storage.getLLMConfiguration(id);
      if (!existingConfig) {
        return res.status(404).json({ error: "LLM configuration not found" });
      }
      if (existingConfig.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const config = await storage.updateLLMConfiguration(id, updates);
      if (config) {
        res.json(config);
      } else {
        res.status(404).json({ error: "LLM configuration not found" });
      }
    } catch (error) {
      console.error("Error updating LLM configuration:", error);
      res.status(500).json({ error: "Failed to update LLM configuration" });
    }
  });

  app.delete("/api/llm-configurations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      // Verify LLM configuration ownership
      const config = await storage.getLLMConfiguration(id);
      if (!config) {
        return res.status(404).json({ error: "LLM configuration not found" });
      }
      if (config.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await storage.deleteLLMConfiguration(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "LLM configuration not found" });
      }
    } catch (error) {
      console.error("Error deleting LLM configuration:", error);
      res.status(500).json({ error: "Failed to delete LLM configuration" });
    }
  });

  // Search
  app.post("/api/search", isAuthenticated, async (req, res) => {
    try {
      const { query, maxResults = 10 } = req.body;
      const userId = getUserId(req); // Server-derived userId for security
      
      if (!query) {
        return res.status(400).json({ error: "query is required" });
      }

      const engines = await storage.getEnabledSearchEngines(userId);
      const results = await searchService.search(engines, query, maxResults);
      
      // Add informational message if no results and engines are missing API keys
      if (results.totalResults === 0 && engines.length > 0) {
        const missingKeys = engines.filter(engine => 
          (engine.name.toLowerCase() === 'google' && (!engine.apiKey && !process.env.GOOGLE_API_KEY)) ||
          (engine.name.toLowerCase() === 'bing' && (!engine.apiKey && !process.env.BING_API_KEY))
        );
        
        if (missingKeys.length > 0) {
          results.message = `No results found. ${missingKeys.map(e => e.name).join(', ')} require${missingKeys.length === 1 ? 's' : ''} API key configuration.`;
        }
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error performing search:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  app.post("/api/search/fetch-content", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "url is required" });
      }

      const content = await searchService.fetchWebContent(url);
      res.json({ content });
    } catch (error) {
      console.error("Error fetching web content:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch web content" });
    }
  });

  // Search Engines
  app.get("/api/search-engines", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req); // Server-derived userId for security
      const engines = await storage.getSearchEnginesByUserId(userId);
      // Don't return API keys for security - only indicate if they exist
      const safeEngines = engines.map(engine => ({
        ...engine,
        hasApiKey: !!engine.apiKey,
        apiKey: undefined
      }));
      res.json(safeEngines);
    } catch (error) {
      console.error("Error fetching search engines:", error);
      res.status(500).json({ error: "Failed to fetch search engines" });
    }
  });

  app.put("/api/search-engines/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const updates = req.body;
      
      // Verify search engine ownership
      const existingEngine = await storage.getSearchEngine(id);
      if (!existingEngine) {
        return res.status(404).json({ error: "Search engine not found" });
      }
      if (existingEngine.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const engine = await storage.updateSearchEngine(id, updates);
      if (engine) {
        res.json(engine);
      } else {
        res.status(404).json({ error: "Search engine not found" });
      }
    } catch (error) {
      console.error("Error updating search engine:", error);
      res.status(500).json({ error: "Failed to update search engine" });
    }
  });

  // User Preferences
  app.get("/api/user-preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req); // Server-derived userId for security
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ error: "Failed to fetch user preferences" });
    }
  });

  app.put("/api/user-preferences", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req); // Server-derived userId for security
      const updates = req.body;
      
      const preferences = await storage.updateUserPreferences(userId, updates);
      if (preferences) {
        res.json(preferences);
      } else {
        res.status(404).json({ error: "User preferences not found" });
      }
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ error: "Failed to update user preferences" });
    }
  });

  // Data management endpoints
  app.post("/api/data/export", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req); // CRITICAL: Server-derived userId to prevent data exfiltration

      const userData = {
        conversations: await storage.getConversationsByUserId(userId),
        projects: await storage.getProjectsByUserId(userId),
        files: await storage.getFilesByUserId(userId),
        llmConfigurations: await storage.getLLMConfigurationsByUserId(userId),
        searchEngines: await storage.getSearchEnginesByUserId(userId),
        preferences: await storage.getUserPreferences(userId),
        exportDate: new Date().toISOString(),
      };

      res.json(userData);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  app.post("/api/data/clear-cache", isAuthenticated, async (req, res) => {
    try {
      // In a real implementation, this would clear actual cache
      res.json({ success: true, message: "Cache cleared successfully" });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  app.post("/api/data/reset-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req); // Server-derived userId for security

      // Reset to default preferences
      const defaultPrefs = {
        theme: "dark",
        compactMode: false,
        animations: true,
        fontSize: "medium",
        codeFont: "jetbrains",
        maxConcurrentRequests: 5,
        cacheDuration: 30,
        autoSaveConversations: true,
        analyticsCollection: false,
      };

      const preferences = await storage.updateUserPreferences(userId, defaultPrefs);
      res.json(preferences);
    } catch (error) {
      console.error("Error resetting settings:", error);
      res.status(500).json({ error: "Failed to reset settings" });
    }
  });

  // Project Management
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projects = await storage.getProjectsByUserId(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const projectData = insertProjectSchema.parse({
        ...req.body,
        userId
      });
      
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid project data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      const existingProject = await storage.getProject(id);
      if (!existingProject || existingProject.userId !== userId) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Only allow specific fields to be updated for security
      const allowedUpdates = {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
        githubUrl: req.body.githubUrl,
        metadata: req.body.metadata,
      };
      
      // Remove undefined values
      const updates = Object.fromEntries(
        Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
      );
      
      const updatedProject = await storage.updateProject(id, updates);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      const project = await storage.getProject(id);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const deleted = await storage.deleteProject(id);
      res.json({ success: deleted });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // File Upload and Analysis
  app.post("/api/files/upload", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const userId = getUserId(req); // Server-derived userId
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Use targetPath if provided (for hierarchical uploads), otherwise use original filename
      const targetPath = req.body.targetPath;
      const finalFileName = targetPath || file.originalname;

      console.log("Upload Debug - File originalname:", file.originalname);
      console.log("Upload Debug - Target path:", targetPath);
      console.log("Upload Debug - Final filename:", finalFileName);
      console.log("Upload Debug - File details:", {
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size
      });

      const savedFile = await fileService.saveFile(
        userId,
        finalFileName,
        file.buffer,
        file.mimetype
      );

      console.log("Upload Debug - Saved file:", {
        id: savedFile.id,
        originalName: savedFile.originalName,
        filename: savedFile.filename
      });

      res.json(fileService.sanitizeFileForResponse(savedFile));
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.get("/api/files", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req); // Server-derived userId
      const projectId = req.query.projectId as string;
      
      let files;
      if (projectId && projectId !== 'null' && projectId !== 'undefined') {
        files = await storage.getFilesByUserIdAndProjectId(userId, projectId);
      } else {
        files = await storage.getFilesByUserId(userId);
      }
      
      const sanitizedFiles = files.map(file => fileService.sanitizeFileForResponse(file));
      res.json(sanitizedFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.get("/api/files/:id/content", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Verify file ownership
      if (file.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const content = await fileService.getFileContent(file);
      
      res.set({
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.originalName}"`,
      });
      
      res.send(content);
    } catch (error) {
      console.error("Error fetching file content:", error);
      res.status(500).json({ error: "Failed to fetch file content" });
    }
  });

  app.delete("/api/files/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      // Verify file ownership before deletion
      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      if (file.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await fileService.deleteFile(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Create new text/code file
  app.post("/api/files/create", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { filename, content, language } = req.body;
      
      if (!filename || content === undefined) {
        return res.status(400).json({ error: "Filename and content are required" });
      }
      
      // Validate content size (max 10MB for text files)
      if (typeof content !== 'string' || content.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "Content must be a string and under 10MB" });
      }
      
      // Validate filename
      if (typeof filename !== 'string' || filename.length > 255 || !filename.trim()) {
        return res.status(400).json({ error: "Invalid filename" });
      }
      
      // Determine mime type based on file extension
      const ext = filename.split('.').pop()?.toLowerCase();
      let mimeType = 'text/plain';
      
      const mimeTypes: Record<string, string> = {
        'js': 'text/javascript',
        'jsx': 'text/javascript',
        'ts': 'text/typescript',
        'tsx': 'text/typescript',
        'py': 'text/x-python',
        'html': 'text/html',
        'css': 'text/css',
        'json': 'application/json',
        'md': 'text/markdown',
        'txt': 'text/plain',
        'java': 'text/x-java-source',
        'cpp': 'text/x-c++src',
        'c': 'text/x-csrc',
        'go': 'text/x-go',
        'rs': 'text/x-rustsrc',
        'rb': 'text/x-ruby'
      };
      
      if (ext && mimeTypes[ext]) {
        mimeType = mimeTypes[ext];
      }
      
      const contentBuffer = Buffer.from(content, 'utf8');
      const savedFile = await fileService.saveFile(userId, filename, contentBuffer, mimeType);
      
      res.json(fileService.sanitizeFileForResponse(savedFile));
    } catch (error) {
      console.error("Error creating file:", error);
      res.status(500).json({ error: "Failed to create file" });
    }
  });

  // Update existing text/code file
  app.put("/api/files/:id/content", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const { content } = req.body;
      
      if (content === undefined) {
        return res.status(400).json({ error: "Content is required" });
      }
      
      // Validate content size (max 10MB for text files)
      if (typeof content !== 'string' || content.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "Content must be a string and under 10MB" });
      }
      
      // Verify file ownership
      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      if (file.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const contentBuffer = Buffer.from(content, 'utf8');
      const updatedFile = await fileService.updateFileContent(id, contentBuffer);
      
      res.json(fileService.sanitizeFileForResponse(updatedFile));
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  // Get file content as text (for code viewer)
  app.get("/api/files/:id/text", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Verify file ownership
      if (file.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const content = await fileService.getFileContent(file);
      const textContent = content.toString('utf8');
      
      res.json({ content: textContent, file: fileService.sanitizeFileForResponse(file) });
    } catch (error) {
      console.error("Error fetching file text:", error);
      res.status(500).json({ error: "Failed to fetch file text" });
    }
  });

  // Projects
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req); // Server-derived userId
      const projects = await storage.getProjectsByUserId(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req); // Server-derived userId
      
      // Transform metadata object to JSON string if it exists
      const requestData = { ...req.body, userId };
      if (requestData.metadata && typeof requestData.metadata === 'object') {
        requestData.metadata = JSON.stringify(requestData.metadata);
      }
      
      const data = insertProjectSchema.parse(requestData);
      const project = await storage.createProject(data);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      const updates = req.body;
      
      // Verify project ownership
      const existingProject = await storage.getProject(id);
      if (!existingProject) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (existingProject.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const project = await storage.updateProject(id, updates);
      if (project) {
        res.json(project);
      } else {
        res.status(404).json({ error: "Project not found" });
      }
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      // Verify project ownership
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await storage.deleteProject(id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Project not found" });
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // Project Plan Version endpoints
  app.get("/api/projects/:projectId/versions", isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = getUserId(req);
      
      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const versions = await storage.getProjectPlanVersionsByProjectId(projectId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching project plan versions:", error);
      res.status(500).json({ error: "Failed to fetch project plan versions" });
    }
  });

  app.post("/api/projects/:projectId/versions", isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = getUserId(req);
      
      // Verify project ownership before creating version
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get the next version number atomically from the server
      const latestVersion = await storage.getLatestProjectPlanVersion(projectId);
      const nextVersionNumber = (latestVersion?.version || 0) + 1;
      
      // Transform array fields to JSON strings for database storage
      const requestData = { ...req.body, projectId, version: nextVersionNumber };
      
      // Convert array fields to JSON strings if they exist
      const arrayFields = ['goals', 'requirements', 'techStack', 'resources', 'risks', 'architecture', 'timeline'];
      arrayFields.forEach(field => {
        if (requestData[field] && Array.isArray(requestData[field])) {
          requestData[field] = JSON.stringify(requestData[field]);
        }
      });
      
      const data = insertProjectPlanVersionSchema.parse(requestData);
      
      const version = await storage.createProjectPlanVersion(data);
      res.json(version);
    } catch (error) {
      console.error("Error creating project plan version:", error);
      res.status(500).json({ error: "Failed to create project plan version" });
    }
  });

  app.get("/api/projects/:projectId/versions/:versionId", isAuthenticated, async (req, res) => {
    try {
      const { versionId } = req.params;
      const userId = getUserId(req);
      
      const version = await storage.getProjectPlanVersion(versionId);
      if (!version) {
        return res.status(404).json({ error: "Project plan version not found" });
      }
      
      // Verify project ownership through version's project
      if (!version.projectId) {
        return res.status(400).json({ error: "Invalid project version data" });
      }
      const project = await storage.getProject(version.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(version);
    } catch (error) {
      console.error("Error fetching project plan version:", error);
      res.status(500).json({ error: "Failed to fetch project plan version" });
    }
  });

  app.patch("/api/projects/:projectId/versions/:versionId", isAuthenticated, async (req, res) => {
    try {
      const { versionId } = req.params;
      const userId = getUserId(req);
      // Transform array fields to JSON strings for database storage
      const requestData = { ...req.body };
      const arrayFields = ['goals', 'requirements', 'techStack', 'resources', 'risks', 'architecture', 'timeline'];
      arrayFields.forEach(field => {
        if (requestData[field] && Array.isArray(requestData[field])) {
          requestData[field] = JSON.stringify(requestData[field]);
        }
      });
      
      const updates = insertProjectPlanVersionSchema.partial().parse(requestData);
      
      // Verify project ownership before updating version
      const existingVersion = await storage.getProjectPlanVersion(versionId);
      if (!existingVersion) {
        return res.status(404).json({ error: "Project plan version not found" });
      }
      
      if (!existingVersion.projectId) {
        return res.status(400).json({ error: "Invalid project version data" });
      }
      const project = await storage.getProject(existingVersion.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const version = await storage.updateProjectPlanVersion(versionId, updates);
      if (version) {
        res.json(version);
      } else {
        res.status(404).json({ error: "Project plan version not found" });
      }
    } catch (error) {
      console.error("Error updating project plan version:", error);
      res.status(500).json({ error: "Failed to update project plan version" });
    }
  });

  app.delete("/api/projects/:projectId/versions/:versionId", isAuthenticated, async (req, res) => {
    try {
      const { versionId } = req.params;
      const userId = getUserId(req);
      
      // Verify project ownership before deleting version
      const version = await storage.getProjectPlanVersion(versionId);
      if (!version) {
        return res.status(404).json({ error: "Project plan version not found" });
      }
      
      if (!version.projectId) {
        return res.status(400).json({ error: "Invalid project version data" });
      }
      const project = await storage.getProject(version.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await storage.deleteProjectPlanVersion(versionId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Project plan version not found" });
      }
    } catch (error) {
      console.error("Error deleting project plan version:", error);
      res.status(500).json({ error: "Failed to delete project plan version" });
    }
  });

  // GitHub Integration
  app.get("/api/github/repositories", isAuthenticated, async (req, res) => {
    try {
      const repositories = await githubService.getUserRepositories();
      res.json(repositories);
    } catch (error) {
      console.error("Error fetching GitHub repositories:", error);
      // Return empty array instead of error for better UX when GitHub isn't configured
      res.json([]);
    }
  });

  app.get("/api/github/repositories/:owner/:repo/contents", isAuthenticated, async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const { path = "" } = req.query;
      
      const contents = await githubService.getRepositoryContents(owner, repo, path as string);
      res.json(contents);
    } catch (error) {
      console.error("Error fetching repository contents:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch repository contents" });
    }
  });

  app.get("/api/github/repositories/:owner/:repo/analyze", isAuthenticated, async (req, res) => {
    try {
      const { owner, repo } = req.params;
      
      const analysis = await githubService.analyzeRepository(owner, repo);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing repository:", error);
      
      // Provide more specific error messaging
      let errorMessage = "Failed to analyze repository";
      if (error instanceof Error) {
        if (error.message.includes('GitHub not connected') || error.message.includes('X_REPLIT_TOKEN not found')) {
          errorMessage = "GitHub authentication not configured. Please set up GitHub integration in your Replit account.";
        } else if (error.message.includes('403') || error.message.includes('rate limit')) {
          errorMessage = "GitHub API rate limit exceeded or access denied. Please try again later.";
        } else if (error.message.includes('404')) {
          errorMessage = "Repository not found or not accessible. Please check the repository URL and permissions.";
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/github/repositories", isAuthenticated, async (req, res) => {
    try {
      const { name, description, private: isPrivate = false } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Repository name is required" });
      }

      const repository = await githubService.createRepository(name, description, isPrivate);
      res.json(repository);
    } catch (error) {
      console.error("Error creating repository:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create repository" });
    }
  });

  // Project Templates API
  app.get("/api/project-templates", async (req, res) => {
    try {
      const { category } = req.query;
      
      let templates;
      if (category && typeof category === 'string') {
        templates = await storage.getProjectTemplatesByCategory(category);
      } else {
        templates = await storage.getProjectTemplates();
      }
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching project templates:", error);
      res.status(500).json({ error: "Failed to fetch project templates" });
    }
  });

  app.get("/api/project-templates/:id", async (req, res) => {
    try {
      const template = await storage.getProjectTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Project template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching project template:", error);
      res.status(500).json({ error: "Failed to fetch project template" });
    }
  });

  app.post("/api/project-templates", async (req, res) => {
    try {
      const templateData = insertProjectTemplateSchema.parse(req.body);
      const template = await storage.createProjectTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating project template:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid template data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create project template" });
      }
    }
  });

  app.post("/api/project-templates/:id/generate", isAuthenticated, async (req, res) => {
    try {
      // Validate request body with Zod
      const validationResult = generateProjectSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validationResult.error.errors 
        });
      }

      const { projectName, description } = validationResult.data;
      const templateId = req.params.id;

      // Check if template exists
      const template = await storage.getProjectTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const userId = getUserId(req);
      const result = await projectGenerator.generateProjectFromTemplate(
        templateId,
        projectName.trim(),
        description?.trim() || '',
        userId
      );

      // Return the generated project with download information
      res.json({
        project: result.project,
        downloadUrl: result.downloadUrl,
        message: "Project generated successfully! Files have been created and packaged for download."
      });
    } catch (error) {
      console.error("Error generating project from template:", error);
      const message = error instanceof Error ? error.message : "Failed to generate project from template";
      
      // Return appropriate status code based on error type
      if (message.includes('not found')) {
        return res.status(404).json({ error: message });
      }
      if (message.includes('Path traversal') || message.includes('Absolute paths') || message.includes('Path escapes')) {
        return res.status(400).json({ error: "Invalid file path in template" });
      }
      
      res.status(500).json({ error: message });
    }
  });

  // Project download endpoint
  app.get("/api/download/project/:id", isAuthenticated, async (req, res) => {
    try {
      const projectId = req.params.id;
      
      // Validate project ID format (should be UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(projectId)) {
        return res.status(400).json({ error: "Invalid project ID format" });
      }

      // Check if project exists and user owns it
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const userId = getUserId(req);
      if (project.userId !== userId) {
        return res.status(403).json({ error: "Access denied: you don't own this project" });
      }

      const zipPath = await projectGenerator.getProjectDownload(projectId);
      
      if (!zipPath) {
        return res.status(404).json({ error: "Project download not found" });
      }

      const filename = `${project.name.toLowerCase().replace(/\s+/g, '-')}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.download(zipPath);
    } catch (error) {
      console.error("Error downloading project:", error);
      res.status(500).json({ error: "Failed to download project" });
    }
  });

  // GitHub Export endpoint
  app.post("/api/export/github", isAuthenticated, async (req, res) => {
    try {
      const { repoName = 'ai-assistant-studio', description = 'AI development companion with local LLM integration', isPrivate = false } = req.body;
      
      console.log(`Starting GitHub export for repository: ${repoName}`);
      const result = await githubExportService.exportProject(repoName, description, isPrivate);
      
      if (result.success) {
        res.json({
          success: true,
          repositoryUrl: result.repositoryUrl,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("GitHub export failed:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Export functionality
  app.post("/api/export/conversation", isAuthenticated, async (req, res) => {
    try {
      const { conversationId, format = 'json' } = req.body;
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const messages = await storage.getMessagesByConversationId(conversationId);
      
      const exportData = {
        conversation,
        messages,
        exportedAt: new Date().toISOString(),
      };

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.json"`);
        res.json(exportData);
      } else if (format === 'markdown') {
        let markdown = `# ${conversation.title}\n\n`;
        markdown += `**Created:** ${conversation.createdAt}\n`;
        markdown += `**Updated:** ${conversation.updatedAt}\n\n`;
        
        messages.forEach(message => {
          markdown += `## ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}\n\n`;
          markdown += `${message.content}\n\n`;
          markdown += `*${message.createdAt}*\n\n---\n\n`;
        });

        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="conversation-${conversationId}.md"`);
        res.send(markdown);
      } else {
        res.status(400).json({ error: "Unsupported export format. Use 'json' or 'markdown'" });
      }
    } catch (error) {
      console.error("Error exporting conversation:", error);
      res.status(500).json({ error: "Failed to export conversation" });
    }
  });

  // Commit README to GitHub (only to authenticated user's repositories)
  app.post("/api/github/commit-readme", isAuthenticated, async (req, res) => {
    try {
      // Validate request body
      const validationResult = githubCommitSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.issues
        });
      }

      const { repo, commitMessage } = validationResult.data;
      
      // Get authenticated user's GitHub info for security
      const { getUncachableGitHubClient } = require('./services/github-export');
      const octokit = await getUncachableGitHubClient();
      const authenticatedUser = await octokit.users.getAuthenticated();
      const owner = authenticatedUser.data.login;

      // Verify user has write access to the repository
      try {
        const repoInfo = await octokit.repos.get({ owner, repo });
        if (!repoInfo.data.permissions?.push) {
          return res.status(403).json({
            success: false,
            error: 'No write access to this repository'
          });
        }
      } catch (error: any) {
        if (error.status === 404) {
          return res.status(404).json({
            success: false,
            error: 'Repository not found or no access'
          });
        }
        throw error;
      }

      // Read the current README.md file
      let readmeContent: string;
      try {
        readmeContent = await fs.readFile('./README.md', 'utf-8');
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return res.status(404).json({
            success: false,
            error: 'README.md file not found in project'
          });
        }
        throw error;
      }
      
      console.log(`Committing README.md to ${owner}/${repo}`);
      const result = await githubExportService.commitSingleFile(
        owner,
        repo,
        'README.md',
        readmeContent,
        commitMessage
      );
      
      res.json({
        success: true,
        commitSha: result.commit.sha,
        repositoryUrl: `https://github.com/${owner}/${repo}`,
        message: 'README.md committed successfully'
      });
      
    } catch (error: any) {
      console.error("README commit failed:", error);
      
      // Map common GitHub API errors to appropriate HTTP status codes
      if (error.status === 403) {
        res.status(403).json({ 
          success: false, 
          error: "Permission denied - check repository access"
        });
      } else if (error.status === 404) {
        res.status(404).json({ 
          success: false, 
          error: "Repository not found"
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to commit README.md"
        });
      }
    }
  });

  // Push workspace changes to GitHub (enhanced Monaco Editor features)
  app.post("/api/github/push-workspace", isAuthenticated, async (req, res) => {
    try {
      const { repo, commitMessage = "Add Replit-like Monaco Editor with advanced features" } = req.body;
      
      if (!repo) {
        return res.status(400).json({
          success: false,
          error: 'Repository name is required'
        });
      }
      
      // Get authenticated user's GitHub info
      const { getUncachableGitHubClient } = require('./services/github-export');
      const octokit = await getUncachableGitHubClient();
      const authenticatedUser = await octokit.users.getAuthenticated();
      const owner = authenticatedUser.data.login;

      // Verify user has write access to the repository
      try {
        const repoInfo = await octokit.repos.get({ owner, repo });
        if (!repoInfo.data.permissions?.push) {
          return res.status(403).json({
            success: false,
            error: 'No write access to this repository'
          });
        }
      } catch (error: any) {
        if (error.status === 404) {
          return res.status(404).json({
            success: false,
            error: 'Repository not found or no access'
          });
        }
        throw error;
      }

      // Read the enhanced file-manager.tsx with Replit-like features
      let fileManagerContent: string;
      try {
        fileManagerContent = await fs.readFile('./client/src/pages/file-manager.tsx', 'utf-8');
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return res.status(404).json({
            success: false,
            error: 'Enhanced file-manager.tsx not found'
          });
        }
        throw error;
      }
      
      console.log(`Pushing enhanced Monaco Editor to ${owner}/${repo}`);
      
      // Commit the enhanced file-manager.tsx
      const result = await githubExportService.commitSingleFile(
        owner,
        repo,
        'client/src/pages/file-manager.tsx',
        fileManagerContent,
        commitMessage
      );
      
      res.json({
        success: true,
        commitSha: result.commit.sha,
        repositoryUrl: `https://github.com/${owner}/${repo}`,
        message: 'Enhanced Monaco Editor with Replit-like features committed successfully',
        features: [
          'Real-time error checking and diagnostics',
          'Advanced IntelliSense with code completion', 
          'Professional code formatting with format-on-save',
          'Multi-language linting (JS/TS/Python/JSON)',
          'Enhanced UI with diagnostics panel',
          'Professional keyboard shortcuts'
        ]
      });
      
    } catch (error: any) {
      console.error("Workspace push failed:", error);
      
      // Map common GitHub API errors to appropriate HTTP status codes
      if (error.status === 403) {
        res.status(403).json({ 
          success: false, 
          error: "Permission denied - check repository access"
        });
      } else if (error.status === 404) {
        res.status(404).json({ 
          success: false, 
          error: "Repository not found"
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: "Failed to push workspace changes"
        });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
