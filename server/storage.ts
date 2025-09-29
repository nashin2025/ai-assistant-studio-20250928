import { 
  type User, 
  type InsertUser,
  type UpsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Project,
  type InsertProject,
  type File,
  type InsertFile,
  type LLMConfiguration,
  type InsertLLMConfiguration,
  type SearchEngine,
  type InsertSearchEngine,
  type UserPreferences,
  type InsertUserPreferences,
  type ProjectTemplate,
  type InsertProjectTemplate,
  type ProjectPlanVersion,
  type InsertProjectPlanVersion,
  users,
  conversations,
  messages,
  projects,
  files,
  llmConfigurations,
  searchEngines,
  userPreferences,
  projectTemplates,
  projectPlanVersions
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and } from "drizzle-orm";
import path from "path";
import fs from "fs";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  // Required for Replit Auth and local auth
  upsertUser(user: UpsertUser): Promise<User>;

  // Conversation methods
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;

  // Message methods
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: string): Promise<boolean>;

  // Project methods
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // File methods
  getFile(id: string): Promise<File | undefined>;
  getFilesByUserId(userId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: string, updates: Partial<File>): Promise<File | undefined>;
  deleteFile(id: string): Promise<boolean>;

  // LLM Configuration methods
  getLLMConfiguration(id: string): Promise<LLMConfiguration | undefined>;
  getLLMConfigurationsByUserId(userId: string): Promise<LLMConfiguration[]>;
  getDefaultLLMConfiguration(userId: string): Promise<LLMConfiguration | undefined>;
  createLLMConfiguration(config: InsertLLMConfiguration): Promise<LLMConfiguration>;
  updateLLMConfiguration(id: string, updates: Partial<LLMConfiguration>): Promise<LLMConfiguration | undefined>;
  deleteLLMConfiguration(id: string): Promise<boolean>;

  // Search Engine methods
  getSearchEngine(id: string): Promise<SearchEngine | undefined>;
  getSearchEnginesByUserId(userId: string): Promise<SearchEngine[]>;
  getEnabledSearchEngines(userId: string): Promise<SearchEngine[]>;
  createSearchEngine(engine: InsertSearchEngine): Promise<SearchEngine>;
  updateSearchEngine(id: string, updates: Partial<SearchEngine>): Promise<SearchEngine | undefined>;
  deleteSearchEngine(id: string): Promise<boolean>;

  // User Preferences methods
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined>;

  // Project Template methods
  getProjectTemplate(id: string): Promise<ProjectTemplate | undefined>;
  getProjectTemplates(): Promise<ProjectTemplate[]>;
  getProjectTemplatesByCategory(category: string): Promise<ProjectTemplate[]>;
  createProjectTemplate(template: InsertProjectTemplate): Promise<ProjectTemplate>;
  updateProjectTemplate(id: string, updates: Partial<ProjectTemplate>): Promise<ProjectTemplate | undefined>;
  deleteProjectTemplate(id: string): Promise<boolean>;

  // Project Plan Version methods
  getProjectPlanVersion(id: string): Promise<ProjectPlanVersion | undefined>;
  getProjectPlanVersionsByProjectId(projectId: string): Promise<ProjectPlanVersion[]>;
  getLatestProjectPlanVersion(projectId: string): Promise<ProjectPlanVersion | undefined>;
  createProjectPlanVersion(version: InsertProjectPlanVersion): Promise<ProjectPlanVersion>;
  updateProjectPlanVersion(id: string, updates: Partial<ProjectPlanVersion>): Promise<ProjectPlanVersion | undefined>;
  deleteProjectPlanVersion(id: string): Promise<boolean>;
  getProjectPlanVersionHistory(projectId: string): Promise<ProjectPlanVersion[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private projects: Map<string, Project>;
  private files: Map<string, File>;
  private llmConfigurations: Map<string, LLMConfiguration>;
  private searchEngines: Map<string, SearchEngine>;
  private userPreferences: Map<string, UserPreferences>;
  private projectTemplates: Map<string, ProjectTemplate>;
  private projectPlanVersions: Map<string, ProjectPlanVersion>;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.projects = new Map();
    this.files = new Map();
    this.llmConfigurations = new Map();
    this.searchEngines = new Map();
    this.userPreferences = new Map();
    this.projectTemplates = new Map();
    this.projectPlanVersions = new Map();

    // Initialize with default search engines and LLM configurations
    this.initializeDefaultSearchEngines();
    this.initializeDefaultLLMConfiguration();
  }

  private initializeDefaultSearchEngines() {
    const defaultEngines = [
      { name: "Google", enabled: true, apiKey: null },
      { name: "Bing", enabled: true, apiKey: null },
      { name: "DuckDuckGo", enabled: false, apiKey: null }
    ];

    defaultEngines.forEach(engine => {
      const id = randomUUID();
      this.searchEngines.set(id, {
        id,
        userId: null,
        ...engine,
        createdAt: Date.now()
      });
    });
  }

  private initializeDefaultLLMConfiguration() {
    const id = randomUUID();
    const defaultConfig: LLMConfiguration = {
      id,
      userId: null, // Global default configuration
      name: "Ollama Local",
      endpoint: "http://localhost:11434",
      model: "llama2-7b-chat",
      temperature: 70, // 0.7 * 100
      maxTokens: 2048,
      isDefault: true,
      createdAt: Date.now()
    };
    
    this.llmConfigurations.set(id, defaultConfig);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id, 
      username: insertUser.username || null,
      password: insertUser.password || null,
      email: null,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      passwordHash: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.users.set(id, user);
    return user;
  }

  // Required for Replit Auth
  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id!);
    const now = Date.now();
    
    if (existingUser) {
      // Update existing user
      const updated: User = {
        ...existingUser,
        ...userData,
        updatedAt: now
      };
      this.users.set(userData.id!, updated);
      return updated;
    } else {
      // Create new user
      const newUser: User = {
        id: userData.id!,
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        passwordHash: userData.passwordHash || null, // For local authentication
        username: null, // Legacy field
        password: null, // Legacy field
        createdAt: now,
        updatedAt: now
      };
      this.users.set(userData.id!, newUser);
      return newUser;
    }
  }

  // Conversation methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = Date.now();
    const conversation: Conversation = {
      userId: insertConversation.userId || null,
      title: insertConversation.title,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;

    const updated = { ...conversation, ...updates, updatedAt: Date.now() };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: string): Promise<boolean> {
    return this.conversations.delete(id);
  }

  // Message methods
  async getMessage(id: string): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    
    // Parse metadata back to object if it's a string
    return {
      ...message,
      metadata: typeof message.metadata === 'string' ? parseJSON(message.metadata) : message.metadata,
    };
  }

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .map(message => ({
        ...message,
        metadata: typeof message.metadata === 'string' ? parseJSON(message.metadata) : message.metadata,
      }));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      conversationId: insertMessage.conversationId || null,
      role: insertMessage.role,
      content: insertMessage.content,
      metadata: insertMessage.metadata || null,
      id,
      createdAt: Date.now()
    };
    this.messages.set(id, message);
    return message;
  }

  async deleteMessage(id: string): Promise<boolean> {
    return this.messages.delete(id);
  }

  // Project methods
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values())
      .filter(project => project.userId === userId)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = Date.now();
    const project: Project = {
      userId: insertProject.userId || null,
      name: insertProject.name,
      description: insertProject.description || null,
      githubUrl: insertProject.githubUrl || null,
      status: insertProject.status || null,
      metadata: insertProject.metadata || null,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updated = { ...project, ...updates, updatedAt: Date.now() };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  // File methods
  async getFile(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesByUserId(userId: string): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.userId === userId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const file: File = {
      userId: insertFile.userId || null,
      filename: insertFile.filename,
      originalName: insertFile.originalName,
      mimeType: insertFile.mimeType,
      size: insertFile.size,
      path: insertFile.path,
      analysis: insertFile.analysis || null,
      id,
      createdAt: Date.now()
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: string, updates: Partial<File>): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;

    const updated = { ...file, ...updates };
    this.files.set(id, updated);
    return updated;
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  // LLM Configuration methods
  async getLLMConfiguration(id: string): Promise<LLMConfiguration | undefined> {
    return this.llmConfigurations.get(id);
  }

  async getLLMConfigurationsByUserId(userId: string): Promise<LLMConfiguration[]> {
    return Array.from(this.llmConfigurations.values())
      .filter(config => config.userId === userId || config.userId === null) // Include global configs
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async getDefaultLLMConfiguration(userId: string): Promise<LLMConfiguration | undefined> {
    return Array.from(this.llmConfigurations.values())
      .find(config => (config.userId === userId || config.userId === null) && config.isDefault);
  }

  async createLLMConfiguration(insertConfig: InsertLLMConfiguration): Promise<LLMConfiguration> {
    const id = randomUUID();
    const config: LLMConfiguration = {
      userId: insertConfig.userId || null,
      name: insertConfig.name,
      endpoint: insertConfig.endpoint,
      model: insertConfig.model,
      temperature: insertConfig.temperature || null,
      maxTokens: insertConfig.maxTokens || null,
      isDefault: insertConfig.isDefault || null,
      id,
      createdAt: Date.now()
    };
    this.llmConfigurations.set(id, config);
    return config;
  }

  async updateLLMConfiguration(id: string, updates: Partial<LLMConfiguration>): Promise<LLMConfiguration | undefined> {
    const config = this.llmConfigurations.get(id);
    if (!config) return undefined;

    const updated = { ...config, ...updates };
    this.llmConfigurations.set(id, updated);
    return updated;
  }

  async deleteLLMConfiguration(id: string): Promise<boolean> {
    return this.llmConfigurations.delete(id);
  }

  // Search Engine methods
  async getSearchEngine(id: string): Promise<SearchEngine | undefined> {
    return this.searchEngines.get(id);
  }

  async getSearchEnginesByUserId(userId: string): Promise<SearchEngine[]> {
    return Array.from(this.searchEngines.values())
      .filter(engine => engine.userId === userId || engine.userId === null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getEnabledSearchEngines(userId: string): Promise<SearchEngine[]> {
    return Array.from(this.searchEngines.values())
      .filter(engine => engine.enabled && (engine.userId === userId || engine.userId === null));
  }

  async createSearchEngine(insertEngine: InsertSearchEngine): Promise<SearchEngine> {
    const id = randomUUID();
    const engine: SearchEngine = {
      userId: insertEngine.userId || null,
      name: insertEngine.name,
      enabled: insertEngine.enabled || null,
      apiKey: insertEngine.apiKey || null,
      id,
      createdAt: Date.now()
    };
    this.searchEngines.set(id, engine);
    return engine;
  }

  async updateSearchEngine(id: string, updates: Partial<SearchEngine>): Promise<SearchEngine | undefined> {
    const engine = this.searchEngines.get(id);
    if (!engine) return undefined;

    const updated = { ...engine, ...updates };
    this.searchEngines.set(id, updated);
    return updated;
  }

  async deleteSearchEngine(id: string): Promise<boolean> {
    return this.searchEngines.delete(id);
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const preferences = Array.from(this.userPreferences.values())
      .find(prefs => prefs.userId === userId);
    
    // Return default preferences if none exist
    if (!preferences) {
      const defaultPrefs: UserPreferences = {
        id: randomUUID(),
        userId,
        theme: "dark",
        compactMode: false,
        animations: true,
        fontSize: "medium",
        codeFont: "jetbrains",
        maxConcurrentRequests: 5,
        cacheDuration: 30,
        autoSaveConversations: true,
        analyticsCollection: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.userPreferences.set(defaultPrefs.id, defaultPrefs);
      return defaultPrefs;
    }
    
    return preferences;
  }

  async createUserPreferences(insertPrefs: InsertUserPreferences): Promise<UserPreferences> {
    const id = randomUUID();
    const preferences: UserPreferences = {
      id,
      userId: insertPrefs.userId || null,
      theme: insertPrefs.theme || "dark",
      compactMode: insertPrefs.compactMode || false,
      animations: insertPrefs.animations || true,
      fontSize: insertPrefs.fontSize || "medium",
      codeFont: insertPrefs.codeFont || "jetbrains",
      maxConcurrentRequests: insertPrefs.maxConcurrentRequests || 5,
      cacheDuration: insertPrefs.cacheDuration || 30,
      autoSaveConversations: insertPrefs.autoSaveConversations || true,
      analyticsCollection: insertPrefs.analyticsCollection || false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.userPreferences.set(id, preferences);
    return preferences;
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined> {
    const existing = await this.getUserPreferences(userId);
    if (!existing) return undefined;

    const updated: UserPreferences = { 
      ...existing, 
      ...updates, 
      userId: existing.userId,
      updatedAt: Date.now() 
    };
    this.userPreferences.set(existing.id, updated);
    return updated;
  }

  // Project Template methods
  async getProjectTemplate(id: string): Promise<ProjectTemplate | undefined> {
    return this.projectTemplates.get(id);
  }

  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    return Array.from(this.projectTemplates.values())
      .filter(template => template.isPublic);
  }

  async getProjectTemplatesByCategory(category: string): Promise<ProjectTemplate[]> {
    return Array.from(this.projectTemplates.values())
      .filter(template => template.isPublic && template.category === category);
  }

  async createProjectTemplate(insertTemplate: InsertProjectTemplate): Promise<ProjectTemplate> {
    const id = randomUUID();
    const template: ProjectTemplate = {
      id,
      name: insertTemplate.name,
      description: insertTemplate.description,
      category: insertTemplate.category,
      techStack: insertTemplate.techStack,
      files: insertTemplate.files,
      dependencies: insertTemplate.dependencies || null,
      instructions: insertTemplate.instructions || null,
      difficulty: insertTemplate.difficulty || "beginner",
      estimatedTime: insertTemplate.estimatedTime || null,
      tags: insertTemplate.tags || null,
      isPublic: insertTemplate.isPublic !== undefined ? insertTemplate.isPublic : true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.projectTemplates.set(id, template);
    return template;
  }

  async updateProjectTemplate(id: string, updates: Partial<ProjectTemplate>): Promise<ProjectTemplate | undefined> {
    const existing = this.projectTemplates.get(id);
    if (!existing) return undefined;

    const updated: ProjectTemplate = { 
      ...existing, 
      ...updates, 
      updatedAt: Date.now() 
    };
    this.projectTemplates.set(id, updated);
    return updated;
  }

  async deleteProjectTemplate(id: string): Promise<boolean> {
    return this.projectTemplates.delete(id);
  }

  // Project Plan Version methods
  async getProjectPlanVersion(id: string): Promise<ProjectPlanVersion | undefined> {
    return this.projectPlanVersions.get(id);
  }

  async getProjectPlanVersionsByProjectId(projectId: string): Promise<ProjectPlanVersion[]> {
    return Array.from(this.projectPlanVersions.values())
      .filter(version => version.projectId === projectId)
      .sort((a, b) => b.version - a.version); // Sort by version descending
  }

  async getLatestProjectPlanVersion(projectId: string): Promise<ProjectPlanVersion | undefined> {
    const versions = await this.getProjectPlanVersionsByProjectId(projectId);
    return versions[0]; // First item is latest due to sorting
  }

  async createProjectPlanVersion(insertVersion: InsertProjectPlanVersion): Promise<ProjectPlanVersion> {
    const id = randomUUID();
    
    // Auto-increment version number if not provided
    let version = insertVersion.version;
    if (!version && insertVersion.projectId) {
      const existingVersions = await this.getProjectPlanVersionsByProjectId(insertVersion.projectId);
      version = existingVersions.length > 0 ? Math.max(...existingVersions.map(v => v.version)) + 1 : 1;
    }
    if (!version) {
      version = 1; // Default to version 1 if no project ID or existing versions
    }
    
    const planVersion: ProjectPlanVersion = {
      id,
      projectId: insertVersion.projectId || null,
      userId: insertVersion.userId || null,
      version,
      title: insertVersion.title,
      description: insertVersion.description || null,
      goals: insertVersion.goals || null,
      requirements: insertVersion.requirements || null,
      architecture: insertVersion.architecture || null,
      techStack: insertVersion.techStack || null,
      timeline: insertVersion.timeline || null,
      resources: insertVersion.resources || null,
      risks: insertVersion.risks || null,
      notes: insertVersion.notes || null,
      changeLog: insertVersion.changeLog || null,
      status: insertVersion.status || "draft",
      parentVersionId: insertVersion.parentVersionId || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.projectPlanVersions.set(id, planVersion);
    return planVersion;
  }

  async updateProjectPlanVersion(id: string, updates: Partial<ProjectPlanVersion>): Promise<ProjectPlanVersion | undefined> {
    const existing = this.projectPlanVersions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    this.projectPlanVersions.set(id, updated);
    return updated;
  }

  async deleteProjectPlanVersion(id: string): Promise<boolean> {
    return this.projectPlanVersions.delete(id);
  }

  async getProjectPlanVersionHistory(projectId: string): Promise<ProjectPlanVersion[]> {
    return this.getProjectPlanVersionsByProjectId(projectId); // Same as getProjectPlanVersionsByProjectId
  }
}

// JSON serialization helpers for SQLite
function serializeJSON(obj: any): string | null {
  if (obj === null || obj === undefined) return null;
  return JSON.stringify(obj);
}

function parseJSON(str: string | null): any {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// SQLite Storage Implementation
class SQLiteStorage implements IStorage {
  private db;
  private sqlite;

  constructor() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Initialize SQLite database
    const dbPath = path.join(dataDir, 'ai-assistant-studio.db');
    this.sqlite = new Database(dbPath);
    this.db = drizzle(this.sqlite);
    this.initializeTables();
    this.initializeDefaults();
  }

  private initializeTables() {
    // Create tables if they don't exist
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        profile_image_url TEXT,
        password_hash TEXT,
        username TEXT UNIQUE,
        password TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        title TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT REFERENCES conversations(id),
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL,
        description TEXT,
        github_url TEXT,
        status TEXT DEFAULT 'active',
        metadata TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        analysis TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS llm_configurations (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        model TEXT NOT NULL,
        temperature INTEGER DEFAULT 70,
        max_tokens INTEGER DEFAULT 2048,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS search_engines (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        api_key TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        theme TEXT DEFAULT 'dark',
        compact_mode INTEGER DEFAULT 0,
        animations INTEGER DEFAULT 1,
        font_size TEXT DEFAULT 'medium',
        code_font TEXT DEFAULT 'jetbrains',
        max_concurrent_requests INTEGER DEFAULT 5,
        cache_duration INTEGER DEFAULT 30,
        auto_save_conversations INTEGER DEFAULT 1,
        analytics_collection INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS project_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        tech_stack TEXT NOT NULL,
        files TEXT NOT NULL,
        dependencies TEXT,
        instructions TEXT,
        difficulty TEXT DEFAULT 'beginner',
        estimated_time TEXT,
        tags TEXT,
        is_public INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS project_plan_versions (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id),
        user_id TEXT REFERENCES users(id),
        version INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        goals TEXT,
        requirements TEXT,
        architecture TEXT,
        tech_stack TEXT,
        timeline TEXT,
        resources TEXT,
        risks TEXT,
        notes TEXT,
        change_log TEXT,
        status TEXT DEFAULT 'draft',
        parent_version_id TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions(expire);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    `);
  }

  private async initializeDefaults() {
    try {
      // Initialize default search engines if none exist
      const existingEngines = await this.db.select().from(searchEngines).limit(1);
      if (existingEngines.length === 0) {
        const defaultEngines = [
          { userId: null, name: "Google", enabled: true, apiKey: null },
          { userId: null, name: "Bing", enabled: true, apiKey: null },
          { userId: null, name: "DuckDuckGo", enabled: false, apiKey: null }
        ];

        for (const engine of defaultEngines) {
          await this.db.insert(searchEngines).values(engine);
        }
      }

      // Initialize default LLM configuration if none exist
      const existingLLMs = await this.db.select().from(llmConfigurations).limit(1);
      if (existingLLMs.length === 0) {
        await this.db.insert(llmConfigurations).values({
          userId: null,
          name: "Ollama Local",
          endpoint: "http://localhost:11434",
          model: "llama2-7b-chat",
          temperature: 70,
          maxTokens: 2048,
          isDefault: true
        });
      }
    } catch (error) {
      console.error("Failed to initialize defaults:", error);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  // Required for Replit Auth
  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: Date.now(),
        },
      })
      .returning();
    return result[0];
  }

  // Conversation methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await this.db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return await this.db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await this.db.insert(conversations).values(conversation).returning();
    return result[0];
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const result = await this.db.update(conversations)
      .set({ ...updates, updatedAt: Date.now() })
      .where(eq(conversations.id, id))
      .returning();
    return result[0];
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await this.db.delete(conversations).where(eq(conversations.id, id)).returning({ id: conversations.id });
    return result.length > 0;
  }

  // Message methods
  async getMessage(id: string): Promise<Message | undefined> {
    const result = await this.db.select().from(messages).where(eq(messages.id, id)).limit(1);
    const message = result[0];
    if (!message) return undefined;
    
    // Parse metadata back to object
    return {
      ...message,
      metadata: parseJSON(message.metadata as string),
    };
  }

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    const results = await this.db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    
    // Parse metadata back to objects
    return results.map(message => ({
      ...message,
      metadata: parseJSON(message.metadata as string),
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    // Serialize metadata for SQLite
    const serializedMessage = {
      ...message,
      metadata: serializeJSON(message.metadata),
    };
    
    const result = await this.db.insert(messages).values(serializedMessage).returning();
    
    // Parse metadata back to object for return
    const returnMessage = result[0];
    return {
      ...returnMessage,
      metadata: parseJSON(returnMessage.metadata as string),
    };
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await this.db.delete(messages).where(eq(messages.id, id)).returning({ id: messages.id });
    return result.length > 0;
  }

  // Project methods
  async getProject(id: string): Promise<Project | undefined> {
    const result = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    const project = result[0];
    if (!project) return undefined;
    
    // Parse metadata back to object
    return {
      ...project,
      metadata: parseJSON(project.metadata as string),
    };
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    const results = await this.db.select().from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
    
    // Parse metadata back to objects
    return results.map(project => ({
      ...project,
      metadata: parseJSON(project.metadata as string),
    }));
  }

  async createProject(project: InsertProject): Promise<Project> {
    // Serialize metadata for SQLite
    const serializedProject = {
      ...project,
      metadata: serializeJSON(project.metadata),
    };
    
    const result = await this.db.insert(projects).values(serializedProject).returning();
    
    // Parse metadata back to object for return
    const returnProject = result[0];
    return {
      ...returnProject,
      metadata: parseJSON(returnProject.metadata as string),
    };
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const result = await this.db.update(projects)
      .set({ ...updates, updatedAt: Date.now() })
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
    return result.length > 0;
  }

  // File methods
  async getFile(id: string): Promise<File | undefined> {
    const result = await this.db.select().from(files).where(eq(files.id, id)).limit(1);
    const file = result[0];
    if (!file) return undefined;
    
    // Parse analysis back to object
    return {
      ...file,
      analysis: parseJSON(file.analysis as string),
    };
  }

  async getFilesByUserId(userId: string): Promise<File[]> {
    const results = await this.db.select().from(files)
      .where(eq(files.userId, userId))
      .orderBy(desc(files.createdAt));
    
    // Parse analysis back to objects
    return results.map(file => ({
      ...file,
      analysis: parseJSON(file.analysis as string),
    }));
  }

  async createFile(file: InsertFile): Promise<File> {
    // Serialize analysis for SQLite
    const serializedFile = {
      ...file,
      analysis: serializeJSON(file.analysis),
    };
    
    const result = await this.db.insert(files).values(serializedFile).returning();
    
    // Parse analysis back to object for return
    const returnFile = result[0];
    return {
      ...returnFile,
      analysis: parseJSON(returnFile.analysis as string),
    };
  }

  async updateFile(id: string, updates: Partial<File>): Promise<File | undefined> {
    // Serialize analysis field if present in updates
    const serializedUpdates = {
      ...updates,
      updatedAt: Date.now(),
      ...(updates.analysis !== undefined && { analysis: serializeJSON(updates.analysis) }),
    };
    
    const result = await this.db.update(files)
      .set(serializedUpdates)
      .where(eq(files.id, id))
      .returning();
    
    const file = result[0];
    if (!file) return undefined;
    
    // Parse analysis back to object
    return {
      ...file,
      analysis: parseJSON(file.analysis as string),
    };
  }

  async deleteFile(id: string): Promise<boolean> {
    const result = await this.db.delete(files).where(eq(files.id, id)).returning({ id: files.id });
    return result.length > 0;
  }

  // LLM Configuration methods
  async getLLMConfiguration(id: string): Promise<LLMConfiguration | undefined> {
    const result = await this.db.select().from(llmConfigurations).where(eq(llmConfigurations.id, id)).limit(1);
    return result[0];
  }

  async getLLMConfigurationsByUserId(userId: string): Promise<LLMConfiguration[]> {
    return await this.db.select().from(llmConfigurations)
      .where(eq(llmConfigurations.userId, userId))
      .orderBy(desc(llmConfigurations.createdAt));
  }

  async getDefaultLLMConfiguration(userId: string): Promise<LLMConfiguration | undefined> {
    // First try to get user's default configuration
    const userDefault = await this.db.select().from(llmConfigurations)
      .where(and(eq(llmConfigurations.userId, userId), eq(llmConfigurations.isDefault, true)))
      .limit(1);
    
    if (userDefault.length > 0) {
      return userDefault[0];
    }

    // Fall back to global default (where userId is null)
    const globalDefault = await this.db.select().from(llmConfigurations)
      .where(eq(llmConfigurations.isDefault, true))
      .limit(1);
    
    return globalDefault[0];
  }

  async createLLMConfiguration(config: InsertLLMConfiguration): Promise<LLMConfiguration> {
    const result = await this.db.insert(llmConfigurations).values(config).returning();
    return result[0];
  }

  async updateLLMConfiguration(id: string, updates: Partial<LLMConfiguration>): Promise<LLMConfiguration | undefined> {
    const result = await this.db.update(llmConfigurations)
      .set(updates)
      .where(eq(llmConfigurations.id, id))
      .returning();
    return result[0];
  }

  async deleteLLMConfiguration(id: string): Promise<boolean> {
    const result = await this.db.delete(llmConfigurations).where(eq(llmConfigurations.id, id)).returning({ id: llmConfigurations.id });
    return result.length > 0;
  }

  // Search Engine methods
  async getSearchEngine(id: string): Promise<SearchEngine | undefined> {
    const result = await this.db.select().from(searchEngines).where(eq(searchEngines.id, id)).limit(1);
    return result[0];
  }

  async getSearchEnginesByUserId(userId: string): Promise<SearchEngine[]> {
    return await this.db.select().from(searchEngines)
      .where(eq(searchEngines.userId, userId))
      .orderBy(desc(searchEngines.createdAt));
  }

  async getEnabledSearchEngines(userId: string): Promise<SearchEngine[]> {
    return await this.db.select().from(searchEngines)
      .where(and(eq(searchEngines.userId, userId), eq(searchEngines.enabled, true)))
      .orderBy(desc(searchEngines.createdAt));
  }

  async createSearchEngine(engine: InsertSearchEngine): Promise<SearchEngine> {
    const result = await this.db.insert(searchEngines).values(engine).returning();
    return result[0];
  }

  async updateSearchEngine(id: string, updates: Partial<SearchEngine>): Promise<SearchEngine | undefined> {
    const result = await this.db.update(searchEngines)
      .set(updates)
      .where(eq(searchEngines.id, id))
      .returning();
    return result[0];
  }

  async deleteSearchEngine(id: string): Promise<boolean> {
    const result = await this.db.delete(searchEngines).where(eq(searchEngines.id, id)).returning({ id: searchEngines.id });
    return result.length > 0;
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const result = await this.db.select().from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    
    if (result.length === 0) {
      // Create default preferences
      const defaultPrefs = {
        userId,
        theme: "dark",
        compactMode: false,
        animations: true,
        fontSize: "medium",
        codeFont: "jetbrains",
        maxConcurrentRequests: 5,
        cacheDuration: 30,
        autoSaveConversations: true,
        analyticsCollection: false
      };
      
      return await this.createUserPreferences(defaultPrefs);
    }
    
    return result[0];
  }

  async createUserPreferences(insertPrefs: InsertUserPreferences): Promise<UserPreferences> {
    const result = await this.db.insert(userPreferences).values(insertPrefs).returning();
    return result[0];
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined> {
    const result = await this.db.update(userPreferences)
      .set({ ...updates, updatedAt: Date.now() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return result[0];
  }

  // Project Template methods
  async getProjectTemplate(id: string): Promise<ProjectTemplate | undefined> {
    const result = await this.db.select().from(projectTemplates).where(eq(projectTemplates.id, id)).limit(1);
    return result[0];
  }

  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    const results = await this.db.select().from(projectTemplates)
      .where(eq(projectTemplates.isPublic, true))
      .orderBy(desc(projectTemplates.createdAt));
    
    // Parse JSON fields back to objects
    return results.map(template => ({
      ...template,
      techStack: parseJSON(template.techStack as string),
      files: parseJSON(template.files as string),
      dependencies: parseJSON(template.dependencies as string),
      instructions: parseJSON(template.instructions as string),
      tags: parseJSON(template.tags as string),
    }));
  }

  async getProjectTemplatesByCategory(category: string): Promise<ProjectTemplate[]> {
    const results = await this.db.select().from(projectTemplates)
      .where(and(eq(projectTemplates.category, category), eq(projectTemplates.isPublic, true)))
      .orderBy(desc(projectTemplates.createdAt));
    
    // Parse JSON fields back to objects
    return results.map(template => ({
      ...template,
      techStack: parseJSON(template.techStack as string),
      files: parseJSON(template.files as string),
      dependencies: parseJSON(template.dependencies as string),
      instructions: parseJSON(template.instructions as string),
      tags: parseJSON(template.tags as string),
    }));
  }

  async createProjectTemplate(template: InsertProjectTemplate): Promise<ProjectTemplate> {
    // Serialize array fields to JSON strings for SQLite
    const serializedTemplate = {
      ...template,
      techStack: serializeJSON(template.techStack),
      files: serializeJSON(template.files),
      dependencies: serializeJSON(template.dependencies),
      instructions: serializeJSON(template.instructions),
      tags: serializeJSON(template.tags),
    };

    const result = await this.db.insert(projectTemplates).values(serializedTemplate).returning();
    
    // Parse JSON fields back to objects for return
    const returnTemplate = result[0];
    return {
      ...returnTemplate,
      techStack: parseJSON(returnTemplate.techStack as string),
      files: parseJSON(returnTemplate.files as string),
      dependencies: parseJSON(returnTemplate.dependencies as string),
      instructions: parseJSON(returnTemplate.instructions as string),
      tags: parseJSON(returnTemplate.tags as string),
    };
  }

  async updateProjectTemplate(id: string, updates: Partial<ProjectTemplate>): Promise<ProjectTemplate | undefined> {
    // Serialize JSON fields if present in updates
    const serializedUpdates = {
      ...updates,
      updatedAt: Date.now(),
      ...(updates.techStack !== undefined && { techStack: serializeJSON(updates.techStack) }),
      ...(updates.files !== undefined && { files: serializeJSON(updates.files) }),
      ...(updates.dependencies !== undefined && { dependencies: serializeJSON(updates.dependencies) }),
      ...(updates.instructions !== undefined && { instructions: serializeJSON(updates.instructions) }),
      ...(updates.tags !== undefined && { tags: serializeJSON(updates.tags) }),
    };
    
    const result = await this.db.update(projectTemplates)
      .set(serializedUpdates)
      .where(eq(projectTemplates.id, id))
      .returning();
    
    const template = result[0];
    if (!template) return undefined;
    
    // Parse JSON fields back to objects
    return {
      ...template,
      techStack: parseJSON(template.techStack as string),
      files: parseJSON(template.files as string),
      dependencies: parseJSON(template.dependencies as string),
      instructions: parseJSON(template.instructions as string),
      tags: parseJSON(template.tags as string),
    };
  }

  async deleteProjectTemplate(id: string): Promise<boolean> {
    const result = await this.db.delete(projectTemplates).where(eq(projectTemplates.id, id)).returning({ id: projectTemplates.id });
    return result.length > 0;
  }

  // Project Plan Version methods
  async getProjectPlanVersion(id: string): Promise<ProjectPlanVersion | undefined> {
    const result = await this.db.select().from(projectPlanVersions).where(eq(projectPlanVersions.id, id)).limit(1);
    const version = result[0];
    if (!version) return undefined;
    
    // Parse JSON fields back to objects
    return {
      ...version,
      goals: parseJSON(version.goals as string),
      requirements: parseJSON(version.requirements as string),
      architecture: parseJSON(version.architecture as string),
      techStack: parseJSON(version.techStack as string),
      timeline: parseJSON(version.timeline as string),
      resources: parseJSON(version.resources as string),
      risks: parseJSON(version.risks as string),
      notes: parseJSON(version.notes as string),
      changeLog: parseJSON(version.changeLog as string),
    };
  }

  async getProjectPlanVersionsByProjectId(projectId: string): Promise<ProjectPlanVersion[]> {
    const results = await this.db.select().from(projectPlanVersions)
      .where(eq(projectPlanVersions.projectId, projectId))
      .orderBy(desc(projectPlanVersions.version)); // Sort by version descending
    
    // Parse JSON fields back to objects
    return results.map(version => ({
      ...version,
      goals: parseJSON(version.goals as string),
      requirements: parseJSON(version.requirements as string),
      architecture: parseJSON(version.architecture as string),
      techStack: parseJSON(version.techStack as string),
      timeline: parseJSON(version.timeline as string),
      resources: parseJSON(version.resources as string),
      risks: parseJSON(version.risks as string),
      notes: parseJSON(version.notes as string),
      changeLog: parseJSON(version.changeLog as string),
    }));
  }

  async getLatestProjectPlanVersion(projectId: string): Promise<ProjectPlanVersion | undefined> {
    const result = await this.db.select().from(projectPlanVersions)
      .where(eq(projectPlanVersions.projectId, projectId))
      .orderBy(desc(projectPlanVersions.version))
      .limit(1);
    return result[0];
  }

  async createProjectPlanVersion(insertVersion: InsertProjectPlanVersion): Promise<ProjectPlanVersion> {
    // Auto-increment version number if not provided
    let version = insertVersion.version;
    if (!version && insertVersion.projectId) {
      const latestVersion = await this.getLatestProjectPlanVersion(insertVersion.projectId);
      version = latestVersion ? latestVersion.version + 1 : 1;
    }
    if (!version) {
      version = 1; // Default to version 1 if no project ID or existing versions
    }
    
    // Serialize JSON fields for SQLite
    const serializedVersion = {
      ...insertVersion,
      version,
      goals: serializeJSON(insertVersion.goals),
      requirements: serializeJSON(insertVersion.requirements),
      architecture: serializeJSON(insertVersion.architecture),
      techStack: serializeJSON(insertVersion.techStack),
      timeline: serializeJSON(insertVersion.timeline),
      resources: serializeJSON(insertVersion.resources),
      risks: serializeJSON(insertVersion.risks),
      notes: serializeJSON(insertVersion.notes),
      changeLog: serializeJSON(insertVersion.changeLog),
    };
    
    const result = await this.db.insert(projectPlanVersions).values(serializedVersion).returning();
    
    // Parse JSON fields back to objects for return
    const returnVersion = result[0];
    return {
      ...returnVersion,
      goals: parseJSON(returnVersion.goals as string),
      requirements: parseJSON(returnVersion.requirements as string),
      architecture: parseJSON(returnVersion.architecture as string),
      techStack: parseJSON(returnVersion.techStack as string),
      timeline: parseJSON(returnVersion.timeline as string),
      resources: parseJSON(returnVersion.resources as string),
      risks: parseJSON(returnVersion.risks as string),
      notes: parseJSON(returnVersion.notes as string),
      changeLog: parseJSON(returnVersion.changeLog as string),
    };
  }

  async updateProjectPlanVersion(id: string, updates: Partial<ProjectPlanVersion>): Promise<ProjectPlanVersion | undefined> {
    // Serialize JSON fields if present in updates
    const serializedUpdates = {
      ...updates,
      updatedAt: Date.now(),
      ...(updates.goals !== undefined && { goals: serializeJSON(updates.goals) }),
      ...(updates.requirements !== undefined && { requirements: serializeJSON(updates.requirements) }),
      ...(updates.architecture !== undefined && { architecture: serializeJSON(updates.architecture) }),
      ...(updates.techStack !== undefined && { techStack: serializeJSON(updates.techStack) }),
      ...(updates.timeline !== undefined && { timeline: serializeJSON(updates.timeline) }),
      ...(updates.resources !== undefined && { resources: serializeJSON(updates.resources) }),
      ...(updates.risks !== undefined && { risks: serializeJSON(updates.risks) }),
      ...(updates.notes !== undefined && { notes: serializeJSON(updates.notes) }),
      ...(updates.changeLog !== undefined && { changeLog: serializeJSON(updates.changeLog) }),
    };
    
    const result = await this.db.update(projectPlanVersions)
      .set(serializedUpdates)
      .where(eq(projectPlanVersions.id, id))
      .returning();
    
    const version = result[0];
    if (!version) return undefined;
    
    // Parse JSON fields back to objects
    return {
      ...version,
      goals: parseJSON(version.goals as string),
      requirements: parseJSON(version.requirements as string),
      architecture: parseJSON(version.architecture as string),
      techStack: parseJSON(version.techStack as string),
      timeline: parseJSON(version.timeline as string),
      resources: parseJSON(version.resources as string),
      risks: parseJSON(version.risks as string),
      notes: parseJSON(version.notes as string),
      changeLog: parseJSON(version.changeLog as string),
    };
  }

  async deleteProjectPlanVersion(id: string): Promise<boolean> {
    const result = await this.db.delete(projectPlanVersions).where(eq(projectPlanVersions.id, id)).returning({ id: projectPlanVersions.id });
    return result.length > 0;
  }

  async getProjectPlanVersionHistory(projectId: string): Promise<ProjectPlanVersion[]> {
    return this.getProjectPlanVersionsByProjectId(projectId); // Same as getProjectPlanVersionsByProjectId
  }
}

// Use SQLite storage by default, MemStorage only for explicit testing
export const storage = process.env.USE_MEMORY_STORAGE
  ? new MemStorage() 
  : new SQLiteStorage();
