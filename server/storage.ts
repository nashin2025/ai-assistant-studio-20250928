import { randomUUID } from 'crypto';
import postgres from 'postgres';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { eq, desc, and } from 'drizzle-orm';
import { mkdir } from 'fs';
import { dirname } from 'path';
import {
  users,
  conversations,
  messages,
  projects,
  files,
  searchEngines,
  llmConfigurations,
  projectTemplates,
  projectPlanVersions,
  userPreferences,
  type User,
  type Conversation,
  type Message,
  type Project,
  type File,
  type SearchEngine,
  type LLMConfiguration,
  type ProjectTemplate,
  type ProjectPlanVersion,
  type UserPreferences,
  type InsertUser,
  type InsertConversation,
  type InsertMessage,
  type InsertProject,
  type InsertFile,
  type InsertSearchEngine,
  type InsertLLMConfiguration,
  type InsertProjectTemplate,
  type InsertProjectPlanVersion,
  type InsertUserPreferences,
  type UpsertUser
} from '@shared/schema';

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(insertUser: InsertUser): Promise<User>;
  upsertUser(userData: UpsertUser): Promise<User>;

  // Conversation methods
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: string): Promise<Conversation[]>;
  createConversation(insertConversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;

  // Message methods
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  createMessage(insertMessage: InsertMessage): Promise<Message>;
  deleteMessage(id: string): Promise<boolean>;

  // Project methods
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  createProject(insertProject: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  // File methods
  getFile(id: string): Promise<File | undefined>;
  getFilesByUserId(userId: string): Promise<File[]>;
  getFilesByProjectId(projectId: string): Promise<File[]>;
  createFile(insertFile: InsertFile): Promise<File>;
  updateFile(id: string, updates: Partial<File>): Promise<File | undefined>;
  deleteFile(id: string): Promise<boolean>;

  // LLM Configuration methods
  getLLMConfiguration(id: string): Promise<LLMConfiguration | undefined>;
  getLLMConfigurationsByUserId(userId: string): Promise<LLMConfiguration[]>;
  createLLMConfiguration(insertConfig: InsertLLMConfiguration): Promise<LLMConfiguration>;
  updateLLMConfiguration(id: string, updates: Partial<LLMConfiguration>): Promise<LLMConfiguration | undefined>;
  deleteLLMConfiguration(id: string): Promise<boolean>;

  // Search Engine methods
  getSearchEngine(id: string): Promise<SearchEngine | undefined>;
  getSearchEnginesByUserId(userId: string): Promise<SearchEngine[]>;
  createSearchEngine(insertEngine: InsertSearchEngine): Promise<SearchEngine>;
  updateSearchEngine(id: string, updates: Partial<SearchEngine>): Promise<SearchEngine | undefined>;
  deleteSearchEngine(id: string): Promise<boolean>;

  // Project Template methods
  getProjectTemplate(id: string): Promise<ProjectTemplate | undefined>;
  getProjectTemplates(): Promise<ProjectTemplate[]>;
  getAllProjectTemplates(): Promise<ProjectTemplate[]>;
  createProjectTemplate(insertTemplate: InsertProjectTemplate): Promise<ProjectTemplate>;
  updateProjectTemplate(id: string, updates: Partial<ProjectTemplate>): Promise<ProjectTemplate | undefined>;
  deleteProjectTemplate(id: string): Promise<boolean>;

  // Project Plan Version methods
  getProjectPlanVersion(id: string): Promise<ProjectPlanVersion | undefined>;
  getProjectPlanVersionsByProjectId(projectId: string): Promise<ProjectPlanVersion[]>;
  getLatestProjectPlanVersion(projectId: string): Promise<ProjectPlanVersion | undefined>;
  createProjectPlanVersion(insertVersion: InsertProjectPlanVersion): Promise<ProjectPlanVersion>;
  updateProjectPlanVersion(id: string, updates: Partial<ProjectPlanVersion>): Promise<ProjectPlanVersion | undefined>;
  deleteProjectPlanVersion(id: string): Promise<boolean>;
  getProjectPlanVersionHistory(projectId: string): Promise<ProjectPlanVersion[]>;

  // User Preferences methods
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(insertPreferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined>;
}

// Hybrid Storage implementation (PostgreSQL or SQLite)
class PostgreSQLStorage implements IStorage {
  private db: any;
  private dbType: 'postgres' | 'sqlite';

  constructor() {
    this.dbType = process.env.DATABASE_URL ? 'postgres' : 'sqlite';
    this.initializeDatabase();
  }

  private initializeDatabase() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl) {
      // Use PostgreSQL for Replit/production
      console.log('Initializing PostgreSQL database...');
      const client = postgres(databaseUrl);
      this.db = drizzlePostgres(client);
    } else {
      // Use SQLite for local development
      console.log('DATABASE_URL not found. Using SQLite for local development...');
      const dbPath = './data/ai-assistant-studio.db';
      
      // Ensure data directory exists
      try {
        mkdir('./data', { recursive: true }, (err) => {
          if (err && err.code !== 'EEXIST') {
            console.error('Error creating data directory:', err);
          }
        });
      } catch (err) {
        // Directory might already exist, ignore
      }
      
      const sqlite = new Database(dbPath);
      this.db = drizzleSQLite(sqlite);
      
      // Enable WAL mode for better concurrency
      sqlite.pragma('journal_mode = WAL');
      
      // Create tables if they don't exist
      this.createSQLiteTables(sqlite);
    }
    
    this.initializeDefaults();
  }

  private createSQLiteTables(sqlite: Database) {
    // Create all necessary tables for SQLite
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

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
        project_id TEXT REFERENCES projects(id),
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
        difficulty TEXT DEFAULT 'intermediate',
        estimated_time TEXT DEFAULT '2-4 hours',
        tech_stack TEXT NOT NULL,
        dependencies TEXT,
        files TEXT NOT NULL,
        instructions TEXT,
        tags TEXT,
        is_public INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS project_plan_versions (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id),
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
        created_at INTEGER,
        updated_at INTEGER
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
    `);
    
    console.log('✅ SQLite tables created successfully');
  }

  private async initializeDefaults() {
    try {
      // Check if search engines exist, if not create defaults
      const existingEngines = await this.db.select().from(searchEngines).limit(1);
      if (existingEngines.length === 0) {
        await this.db.insert(searchEngines).values([
          {
            id: randomUUID(),
            name: "Google",
            enabled: true,
            apiKey: null,
            createdAt: Date.now()
          },
          {
            id: randomUUID(),
            name: "Bing",
            enabled: true,
            apiKey: null,
            createdAt: Date.now()
          }
        ]);
      }

      // Check if LLM configurations exist, if not create defaults
      const existingConfigs = await this.db.select().from(llmConfigurations).limit(1);
      if (existingConfigs.length === 0) {
        await this.db.insert(llmConfigurations).values([
          {
            id: randomUUID(),
            name: "Local LLM",
            endpoint: "http://localhost:8080/v1/chat/completions",
            model: "llama-2-7b-chat",
            isDefault: true,
            temperature: 70,
            maxTokens: 2048,
            createdAt: Date.now()
          }
        ]);
      }
    } catch (error) {
      console.error('Error initializing defaults:', error);
    }
  }

  // Helper functions for JSON serialization
  private parseJSON(str: string | null): any {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }

  private serializeJSON(obj: any): string {
    if (obj === null || obj === undefined) return '';
    if (typeof obj === 'string') return obj;
    return JSON.stringify(obj);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = Date.now();
    const newUser = {
      id,
      username: insertUser.username || null,
      password: insertUser.password || null,
      email: null,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      passwordHash: null,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await this.db.insert(users).values(newUser).returning();
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = Date.now();
    
    if (userData.id) {
      // Try to update existing user
      const existing = await this.getUser(userData.id);
      if (existing) {
        const updated = {
          ...userData,
          updatedAt: now
        };
        const result = await this.db.update(users)
          .set(updated)
          .where(eq(users.id, userData.id))
          .returning();
        return result[0];
      }
    }
    
    // Create new user
    const newUser = {
      id: userData.id || randomUUID(),
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      passwordHash: userData.passwordHash || null,
      username: null,
      password: null,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await this.db.insert(users).values(newUser).returning();
    return result[0];
  }

  // Conversation methods
  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await this.db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0] || undefined;
  }

  async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return await this.db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = Date.now();
    const newConversation = {
      id,
      userId: insertConversation.userId || null,
      title: insertConversation.title,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await this.db.insert(conversations).values(newConversation).returning();
    return result[0];
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const updated = {
      ...updates,
      updatedAt: Date.now()
    };
    
    const result = await this.db.update(conversations)
      .set(updated)
      .where(eq(conversations.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await this.db.delete(conversations).where(eq(conversations.id, id)).returning({ id: conversations.id });
    return result.length > 0;
  }

  // Message methods
  async getMessage(id: string): Promise<Message | undefined> {
    const result = await this.db.select().from(messages).where(eq(messages.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    const result = await this.db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    
    return result.map(message => ({
      ...message,
      metadata: this.parseJSON(message.metadata as string)
    }));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const newMessage = {
      id,
      conversationId: insertMessage.conversationId || null,
      role: insertMessage.role,
      content: insertMessage.content,
      metadata: insertMessage.metadata ? this.serializeJSON(insertMessage.metadata) : null,
      createdAt: Date.now()
    };
    
    const result = await this.db.insert(messages).values(newMessage).returning();
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await this.db.delete(messages).where(eq(messages.id, id)).returning({ id: messages.id });
    return result.length > 0;
  }

  // Project methods
  async getProject(id: string): Promise<Project | undefined> {
    const result = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    const result = await this.db.select().from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
    
    return result.map(project => ({
      ...project,
      metadata: this.parseJSON(project.metadata as string)
    }));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = Date.now();
    const newProject = {
      id,
      userId: insertProject.userId || null,
      name: insertProject.name,
      description: insertProject.description || null,
      status: insertProject.status || "active",
      githubUrl: insertProject.githubUrl || null,
      metadata: insertProject.metadata ? this.serializeJSON(insertProject.metadata) : null,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await this.db.insert(projects).values(newProject).returning();
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const updated = {
      ...updates,
      metadata: updates.metadata ? this.serializeJSON(updates.metadata) : undefined,
      updatedAt: Date.now()
    };
    
    const result = await this.db.update(projects)
      .set(updated)
      .where(eq(projects.id, id))
      .returning();
    
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
    return result.length > 0;
  }

  // File methods
  async getFile(id: string): Promise<File | undefined> {
    const result = await this.db.select().from(files).where(eq(files.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async getFilesByUserId(userId: string): Promise<File[]> {
    const result = await this.db.select().from(files)
      .where(eq(files.userId, userId))
      .orderBy(desc(files.createdAt));
    
    return result.map(file => ({
      ...file,
      analysis: this.parseJSON(file.analysis as string)
    }));
  }

  async getFilesByProjectId(projectId: string): Promise<File[]> {
    const result = await this.db.select().from(files)
      .where(eq(files.projectId, projectId))
      .orderBy(desc(files.createdAt));
    
    return result.map(file => ({
      ...file,
      analysis: this.parseJSON(file.analysis as string)
    }));
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const now = Date.now();
    const newFile = {
      id,
      userId: insertFile.userId || null,
      projectId: insertFile.projectId || null,
      filename: insertFile.filename,
      originalName: insertFile.originalName,
      mimeType: insertFile.mimeType,
      path: insertFile.path,
      size: insertFile.size || 0,
      analysis: insertFile.analysis ? this.serializeJSON(insertFile.analysis) : null,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await this.db.insert(files).values(newFile).returning();
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async updateFile(id: string, updates: Partial<File>): Promise<File | undefined> {
    const updated = {
      ...updates,
      metadata: updates.metadata ? this.serializeJSON(updates.metadata) : undefined,
      updatedAt: Date.now()
    };
    
    const result = await this.db.update(files)
      .set(updated)
      .where(eq(files.id, id))
      .returning();
    
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async deleteFile(id: string): Promise<boolean> {
    const result = await this.db.delete(files).where(eq(files.id, id)).returning({ id: files.id });
    return result.length > 0;
  }

  // LLM Configuration methods
  async getLLMConfiguration(id: string): Promise<LLMConfiguration | undefined> {
    const result = await this.db.select().from(llmConfigurations).where(eq(llmConfigurations.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async getLLMConfigurationsByUserId(userId: string): Promise<LLMConfiguration[]> {
    const result = await this.db.select().from(llmConfigurations)
      .where(eq(llmConfigurations.userId, userId))
      .orderBy(desc(llmConfigurations.createdAt));
    
    return result.map(config => ({
      ...config,
      metadata: this.parseJSON(config.metadata as string)
    }));
  }

  async createLLMConfiguration(insertConfig: InsertLLMConfiguration): Promise<LLMConfiguration> {
    const id = randomUUID();
    const now = Date.now();
    const newConfig = {
      id,
      userId: insertConfig.userId || null,
      name: insertConfig.name,
      provider: insertConfig.provider,
      model: insertConfig.model || null,
      apiKey: insertConfig.apiKey || null,
      endpoint: insertConfig.endpoint || null,
      isDefault: insertConfig.isDefault || false,
      temperature: insertConfig.temperature || 0.7,
      maxTokens: insertConfig.maxTokens || 2048,
      metadata: insertConfig.metadata ? this.serializeJSON(insertConfig.metadata) : null,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await this.db.insert(llmConfigurations).values(newConfig).returning();
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async updateLLMConfiguration(id: string, updates: Partial<LLMConfiguration>): Promise<LLMConfiguration | undefined> {
    const updated = {
      ...updates,
      metadata: updates.metadata ? this.serializeJSON(updates.metadata) : undefined,
      updatedAt: Date.now()
    };
    
    const result = await this.db.update(llmConfigurations)
      .set(updated)
      .where(eq(llmConfigurations.id, id))
      .returning();
    
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async deleteLLMConfiguration(id: string): Promise<boolean> {
    const result = await this.db.delete(llmConfigurations).where(eq(llmConfigurations.id, id)).returning({ id: llmConfigurations.id });
    return result.length > 0;
  }

  // Search Engine methods
  async getSearchEngine(id: string): Promise<SearchEngine | undefined> {
    const result = await this.db.select().from(searchEngines).where(eq(searchEngines.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async getSearchEnginesByUserId(userId: string): Promise<SearchEngine[]> {
    const result = await this.db.select().from(searchEngines)
      .where(eq(searchEngines.userId, userId))
      .orderBy(desc(searchEngines.createdAt));
    
    return result.map(engine => ({
      ...engine,
      metadata: this.parseJSON(engine.metadata as string)
    }));
  }

  async createSearchEngine(insertEngine: InsertSearchEngine): Promise<SearchEngine> {
    const id = randomUUID();
    const now = Date.now();
    const newEngine = {
      id,
      userId: insertEngine.userId || null,
      name: insertEngine.name,
      baseUrl: insertEngine.baseUrl,
      apiKey: insertEngine.apiKey || null,
      isDefault: insertEngine.isDefault || false,
      metadata: insertEngine.metadata ? this.serializeJSON(insertEngine.metadata) : null,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await this.db.insert(searchEngines).values(newEngine).returning();
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async updateSearchEngine(id: string, updates: Partial<SearchEngine>): Promise<SearchEngine | undefined> {
    const updated = {
      ...updates,
      metadata: updates.metadata ? this.serializeJSON(updates.metadata) : undefined,
      updatedAt: Date.now()
    };
    
    const result = await this.db.update(searchEngines)
      .set(updated)
      .where(eq(searchEngines.id, id))
      .returning();
    
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      metadata: this.parseJSON(result[0].metadata as string)
    };
  }

  async deleteSearchEngine(id: string): Promise<boolean> {
    const result = await this.db.delete(searchEngines).where(eq(searchEngines.id, id)).returning({ id: searchEngines.id });
    return result.length > 0;
  }

  // Project Template methods
  async getProjectTemplate(id: string): Promise<ProjectTemplate | undefined> {
    const result = await this.db.select().from(projectTemplates).where(eq(projectTemplates.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      techStack: this.parseJSON(result[0].techStack as string),
      files: this.parseJSON(result[0].files as string),
      dependencies: this.parseJSON(result[0].dependencies as string),
      tags: this.parseJSON(result[0].tags as string)
    };
  }

  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    const result = await this.db.select().from(projectTemplates)
      .orderBy(projectTemplates.name);
    
    return result.map(template => ({
      ...template,
      techStack: this.parseJSON(template.techStack as string),
      files: this.parseJSON(template.files as string),
      dependencies: this.parseJSON(template.dependencies as string),
      tags: this.parseJSON(template.tags as string)
    }));
  }

  async getAllProjectTemplates(): Promise<ProjectTemplate[]> {
    return this.getProjectTemplates();
  }

  async createProjectTemplate(insertTemplate: InsertProjectTemplate): Promise<ProjectTemplate> {
    const id = randomUUID();
    const now = Date.now();
    const newTemplate = {
      id,
      name: insertTemplate.name,
      description: insertTemplate.description,
      category: insertTemplate.category,
      techStack: insertTemplate.techStack,
      files: insertTemplate.files,
      dependencies: insertTemplate.dependencies || null,
      instructions: insertTemplate.instructions || null,
      difficulty: insertTemplate.difficulty || 'beginner',
      estimatedTime: insertTemplate.estimatedTime || null,
      tags: insertTemplate.tags || null,
      isPublic: insertTemplate.isPublic ?? true,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await this.db.insert(projectTemplates).values(newTemplate).returning();
    return {
      ...result[0],
      techStack: this.parseJSON(result[0].techStack as string),
      files: this.parseJSON(result[0].files as string),
      dependencies: this.parseJSON(result[0].dependencies as string),
      tags: this.parseJSON(result[0].tags as string)
    };
  }

  async updateProjectTemplate(id: string, updates: Partial<ProjectTemplate>): Promise<ProjectTemplate | undefined> {
    const updated = {
      ...updates,
      techStack: updates.techStack ? this.serializeJSON(updates.techStack) : undefined,
      files: updates.files ? this.serializeJSON(updates.files) : undefined,
      dependencies: updates.dependencies ? this.serializeJSON(updates.dependencies) : undefined,
      tags: updates.tags ? this.serializeJSON(updates.tags) : undefined,
      updatedAt: Date.now()
    };
    
    const result = await this.db.update(projectTemplates)
      .set(updated)
      .where(eq(projectTemplates.id, id))
      .returning();
    
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      techStack: this.parseJSON(result[0].techStack as string),
      files: this.parseJSON(result[0].files as string),
      dependencies: this.parseJSON(result[0].dependencies as string),
      tags: this.parseJSON(result[0].tags as string)
    };
  }

  async deleteProjectTemplate(id: string): Promise<boolean> {
    const result = await this.db.delete(projectTemplates).where(eq(projectTemplates.id, id)).returning({ id: projectTemplates.id });
    return result.length > 0;
  }

  // Project Plan Version methods
  async getProjectPlanVersion(id: string): Promise<ProjectPlanVersion | undefined> {
    const result = await this.db.select().from(projectPlanVersions).where(eq(projectPlanVersions.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      goals: this.parseJSON(result[0].goals as string),
      requirements: this.parseJSON(result[0].requirements as string),
      architecture: this.parseJSON(result[0].architecture as string),
      techStack: this.parseJSON(result[0].techStack as string),
      timeline: this.parseJSON(result[0].timeline as string),
      resources: this.parseJSON(result[0].resources as string),
      risks: this.parseJSON(result[0].risks as string),
      notes: this.parseJSON(result[0].notes as string),
      changeLog: this.parseJSON(result[0].changeLog as string)
    };
  }

  async getProjectPlanVersionsByProjectId(projectId: string): Promise<ProjectPlanVersion[]> {
    const result = await this.db.select().from(projectPlanVersions)
      .where(eq(projectPlanVersions.projectId, projectId))
      .orderBy(desc(projectPlanVersions.version));
    
    return result.map(version => ({
      ...version,
      goals: this.parseJSON(version.goals as string),
      requirements: this.parseJSON(version.requirements as string),
      architecture: this.parseJSON(version.architecture as string),
      techStack: this.parseJSON(version.techStack as string),
      timeline: this.parseJSON(version.timeline as string),
      resources: this.parseJSON(version.resources as string),
      risks: this.parseJSON(version.risks as string),
      notes: this.parseJSON(version.notes as string),
      changeLog: this.parseJSON(version.changeLog as string)
    }));
  }

  async getLatestProjectPlanVersion(projectId: string): Promise<ProjectPlanVersion | undefined> {
    const versions = await this.getProjectPlanVersionsByProjectId(projectId);
    return versions[0];
  }

  async createProjectPlanVersion(insertVersion: InsertProjectPlanVersion): Promise<ProjectPlanVersion> {
    const id = randomUUID();
    const now = Date.now();
    
    // Auto-increment version number if not provided
    let version = insertVersion.version;
    if (!version && insertVersion.projectId) {
      const existingVersions = await this.getProjectPlanVersionsByProjectId(insertVersion.projectId);
      version = existingVersions.length > 0 ? Math.max(...existingVersions.map(v => v.version)) + 1 : 1;
    }
    if (!version) {
      version = 1;
    }
    
    const newVersion = {
      id,
      projectId: insertVersion.projectId || null,
      userId: insertVersion.userId || null,
      version,
      title: insertVersion.title,
      description: insertVersion.description || null,
      goals: insertVersion.goals ? this.serializeJSON(insertVersion.goals) : null,
      requirements: insertVersion.requirements ? this.serializeJSON(insertVersion.requirements) : null,
      architecture: insertVersion.architecture ? this.serializeJSON(insertVersion.architecture) : null,
      techStack: insertVersion.techStack ? this.serializeJSON(insertVersion.techStack) : null,
      timeline: insertVersion.timeline ? this.serializeJSON(insertVersion.timeline) : null,
      resources: insertVersion.resources ? this.serializeJSON(insertVersion.resources) : null,
      risks: insertVersion.risks ? this.serializeJSON(insertVersion.risks) : null,
      notes: insertVersion.notes ? this.serializeJSON(insertVersion.notes) : null,
      changeLog: insertVersion.changeLog ? this.serializeJSON(insertVersion.changeLog) : null,
      status: insertVersion.status || "draft",
      parentVersionId: insertVersion.parentVersionId || null,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await this.db.insert(projectPlanVersions).values(newVersion).returning();
    return {
      ...result[0],
      goals: this.parseJSON(result[0].goals as string),
      requirements: this.parseJSON(result[0].requirements as string),
      architecture: this.parseJSON(result[0].architecture as string),
      techStack: this.parseJSON(result[0].techStack as string),
      timeline: this.parseJSON(result[0].timeline as string),
      resources: this.parseJSON(result[0].resources as string),
      risks: this.parseJSON(result[0].risks as string),
      notes: this.parseJSON(result[0].notes as string),
      changeLog: this.parseJSON(result[0].changeLog as string)
    };
  }

  async updateProjectPlanVersion(id: string, updates: Partial<ProjectPlanVersion>): Promise<ProjectPlanVersion | undefined> {
    const updated = {
      ...updates,
      goals: updates.goals ? this.serializeJSON(updates.goals) : undefined,
      requirements: updates.requirements ? this.serializeJSON(updates.requirements) : undefined,
      architecture: updates.architecture ? this.serializeJSON(updates.architecture) : undefined,
      techStack: updates.techStack ? this.serializeJSON(updates.techStack) : undefined,
      timeline: updates.timeline ? this.serializeJSON(updates.timeline) : undefined,
      resources: updates.resources ? this.serializeJSON(updates.resources) : undefined,
      risks: updates.risks ? this.serializeJSON(updates.risks) : undefined,
      notes: updates.notes ? this.serializeJSON(updates.notes) : undefined,
      changeLog: updates.changeLog ? this.serializeJSON(updates.changeLog) : undefined,
      updatedAt: Date.now()
    };
    
    const result = await this.db.update(projectPlanVersions)
      .set(updated)
      .where(eq(projectPlanVersions.id, id))
      .returning();
    
    if (!result[0]) return undefined;
    
    return {
      ...result[0],
      goals: this.parseJSON(result[0].goals as string),
      requirements: this.parseJSON(result[0].requirements as string),
      architecture: this.parseJSON(result[0].architecture as string),
      techStack: this.parseJSON(result[0].techStack as string),
      timeline: this.parseJSON(result[0].timeline as string),
      resources: this.parseJSON(result[0].resources as string),
      risks: this.parseJSON(result[0].risks as string),
      notes: this.parseJSON(result[0].notes as string),
      changeLog: this.parseJSON(result[0].changeLog as string)
    };
  }

  async deleteProjectPlanVersion(id: string): Promise<boolean> {
    const result = await this.db.delete(projectPlanVersions).where(eq(projectPlanVersions.id, id)).returning({ id: projectPlanVersions.id });
    return result.length > 0;
  }

  async getProjectPlanVersionHistory(projectId: string): Promise<ProjectPlanVersion[]> {
    return this.getProjectPlanVersionsByProjectId(projectId);
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const result = await this.db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    return result[0] || undefined;
  }

  async createUserPreferences(insertPreferences: InsertUserPreferences): Promise<UserPreferences> {
    const id = randomUUID();
    const now = Date.now();
    const newPreferences = {
      id,
      userId: insertPreferences.userId,
      theme: insertPreferences.theme || 'dark',
      compactMode: insertPreferences.compactMode ?? false,
      animations: insertPreferences.animations ?? true,
      fontSize: insertPreferences.fontSize || 'medium',
      codeFont: insertPreferences.codeFont || 'jetbrains',
      maxConcurrentRequests: insertPreferences.maxConcurrentRequests || 5,
      cacheDuration: insertPreferences.cacheDuration || 30,
      autoSaveConversations: insertPreferences.autoSaveConversations ?? true,
      analyticsCollection: insertPreferences.analyticsCollection ?? false,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await this.db.insert(userPreferences).values(newPreferences).returning();
    return result[0];
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences | undefined> {
    const updated = {
      ...updates,
      updatedAt: Date.now()
    };
    
    const result = await this.db.update(userPreferences)
      .set(updated)
      .where(eq(userPreferences.userId, userId))
      .returning();
    
    return result[0] || undefined;
  }
}

// Export single storage instance
export const storage: IStorage = new PostgreSQLStorage();