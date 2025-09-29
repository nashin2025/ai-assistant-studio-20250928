import {
  User, Project, File, Conversation, Message, 
  LLMConfiguration, SearchEngine, UserPreferences,
  connectMongoDB, initializeDefaultData
} from './mongodb-storage';
import type {
  User as UserType,
  InsertUser,
  UpsertUser,
  Conversation as ConversationType,
  InsertConversation,
  Message as MessageType,
  InsertMessage,
  Project as ProjectType,
  InsertProject,
  File as FileType,
  InsertFile,
  LLMConfiguration as LLMConfigurationType,
  InsertLLMConfiguration,
  SearchEngine as SearchEngineType,
  InsertSearchEngine,
  UserPreferences as UserPreferencesType,
  InsertUserPreferences
} from "@shared/schema";
import { IStorage } from './storage';

export class MongoDBStorage implements IStorage {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await connectMongoDB();
    await initializeDefaultData();
    this.isInitialized = true;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // User methods
  async getUser(id: string): Promise<UserType | undefined> {
    await this.ensureInitialized();
    const user = await User.findById(id).lean();
    return user ? this.formatUser(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<UserType | undefined> {
    await this.ensureInitialized();
    const user = await User.findOne({ username }).lean();
    return user ? this.formatUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<UserType | undefined> {
    await this.ensureInitialized();
    const user = await User.findOne({ email }).lean();
    return user ? this.formatUser(user) : undefined;
  }

  async getAllUsers(): Promise<UserType[]> {
    await this.ensureInitialized();
    const users = await User.find().lean();
    return users.map(this.formatUser);
  }

  async createUser(insertUser: InsertUser): Promise<UserType> {
    await this.ensureInitialized();
    const user = await User.create({
      username: insertUser.username || null,
      password: insertUser.password || null,
      email: null,
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      passwordHash: null,
    });
    return this.formatUser(user.toObject());
  }

  async upsertUser(userData: UpsertUser): Promise<UserType> {
    await this.ensureInitialized();
    const user = await User.findOneAndUpdate(
      { _id: userData.id },
      {
        $set: {
          email: userData.email || null,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          profileImageUrl: userData.profileImageUrl || null,
          passwordHash: userData.passwordHash || null,
        }
      },
      { upsert: true, new: true, lean: true }
    );
    return this.formatUser(user);
  }

  // Project methods
  async getProject(id: string): Promise<ProjectType | undefined> {
    await this.ensureInitialized();
    const project = await Project.findById(id).lean();
    return project ? this.formatProject(project) : undefined;
  }

  async getProjectsByUserId(userId: string): Promise<ProjectType[]> {
    await this.ensureInitialized();
    const projects = await Project.find({ userId }).sort({ updatedAt: -1 }).lean();
    return projects.map(this.formatProject);
  }

  async createProject(insertProject: InsertProject): Promise<ProjectType> {
    await this.ensureInitialized();
    const project = await Project.create({
      userId: insertProject.userId,
      name: insertProject.name,
      description: insertProject.description || null,
      githubUrl: insertProject.githubUrl || null,
      status: insertProject.status || 'active',
      metadata: insertProject.metadata || null,
    });
    return this.formatProject(project.toObject());
  }

  async updateProject(id: string, updates: Partial<ProjectType>): Promise<ProjectType | undefined> {
    await this.ensureInitialized();
    const project = await Project.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, lean: true }
    );
    return project ? this.formatProject(project) : undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await Project.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Enhanced File methods with project organization
  async getFile(id: string): Promise<FileType | undefined> {
    await this.ensureInitialized();
    const file = await File.findById(id).lean();
    return file ? this.formatFile(file) : undefined;
  }

  async getFilesByUserId(userId: string): Promise<FileType[]> {
    await this.ensureInitialized();
    const files = await File.find({ userId }).sort({ createdAt: -1 }).lean();
    return files.map(this.formatFile);
  }

  async getFilesByProjectId(projectId: string): Promise<FileType[]> {
    await this.ensureInitialized();
    const files = await File.find({ projectId }).sort({ createdAt: -1 }).lean();
    return files.map(this.formatFile);
  }

  async getFilesByUserIdAndProjectId(userId: string, projectId: string | null): Promise<FileType[]> {
    await this.ensureInitialized();
    const query: any = { userId };
    if (projectId) {
      query.projectId = projectId;
    } else {
      query.projectId = { $exists: false };
    }
    const files = await File.find(query).sort({ createdAt: -1 }).lean();
    return files.map(this.formatFile);
  }

  async createFile(insertFile: InsertFile): Promise<FileType> {
    await this.ensureInitialized();
    const file = await File.create({
      userId: insertFile.userId,
      projectId: insertFile.projectId || null,
      filename: insertFile.filename,
      originalName: insertFile.originalName,
      mimeType: insertFile.mimeType,
      size: insertFile.size,
      path: insertFile.path,
      analysis: insertFile.analysis || null,
    });
    return this.formatFile(file.toObject());
  }

  async updateFile(id: string, updates: Partial<FileType>): Promise<FileType | undefined> {
    await this.ensureInitialized();
    const file = await File.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, lean: true }
    );
    return file ? this.formatFile(file) : undefined;
  }

  async deleteFile(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await File.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Conversation methods
  async getConversation(id: string): Promise<ConversationType | undefined> {
    await this.ensureInitialized();
    const conversation = await Conversation.findById(id).lean();
    return conversation ? this.formatConversation(conversation) : undefined;
  }

  async getConversationsByUserId(userId: string): Promise<ConversationType[]> {
    await this.ensureInitialized();
    const conversations = await Conversation.find({ userId }).sort({ updatedAt: -1 }).lean();
    return conversations.map(this.formatConversation);
  }

  async createConversation(insertConversation: InsertConversation): Promise<ConversationType> {
    await this.ensureInitialized();
    const conversation = await Conversation.create({
      userId: insertConversation.userId,
      title: insertConversation.title,
    });
    return this.formatConversation(conversation.toObject());
  }

  async updateConversation(id: string, updates: Partial<ConversationType>): Promise<ConversationType | undefined> {
    await this.ensureInitialized();
    const conversation = await Conversation.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, lean: true }
    );
    return conversation ? this.formatConversation(conversation) : undefined;
  }

  async deleteConversation(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await Conversation.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Message methods
  async getMessage(id: string): Promise<MessageType | undefined> {
    await this.ensureInitialized();
    const message = await Message.findById(id).lean();
    return message ? this.formatMessage(message) : undefined;
  }

  async getMessagesByConversationId(conversationId: string): Promise<MessageType[]> {
    await this.ensureInitialized();
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).lean();
    return messages.map(this.formatMessage);
  }

  async createMessage(insertMessage: InsertMessage): Promise<MessageType> {
    await this.ensureInitialized();
    const message = await Message.create({
      conversationId: insertMessage.conversationId,
      role: insertMessage.role,
      content: insertMessage.content,
      metadata: insertMessage.metadata || null,
    });
    return this.formatMessage(message.toObject());
  }

  async deleteMessage(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await Message.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // LLM Configuration methods
  async getLLMConfiguration(id: string): Promise<LLMConfigurationType | undefined> {
    await this.ensureInitialized();
    const config = await LLMConfiguration.findById(id).lean();
    return config ? this.formatLLMConfiguration(config) : undefined;
  }

  async getLLMConfigurationsByUserId(userId: string): Promise<LLMConfigurationType[]> {
    await this.ensureInitialized();
    const configs = await LLMConfiguration.find({
      $or: [{ userId }, { userId: null }]
    }).sort({ createdAt: -1 }).lean();
    return configs.map(this.formatLLMConfiguration);
  }

  async getDefaultLLMConfiguration(userId: string): Promise<LLMConfigurationType | undefined> {
    await this.ensureInitialized();
    const config = await LLMConfiguration.findOne({
      $or: [{ userId }, { userId: null }],
      isDefault: true
    }).lean();
    return config ? this.formatLLMConfiguration(config) : undefined;
  }

  async createLLMConfiguration(insertConfig: InsertLLMConfiguration): Promise<LLMConfigurationType> {
    await this.ensureInitialized();
    const config = await LLMConfiguration.create({
      userId: insertConfig.userId,
      name: insertConfig.name,
      endpoint: insertConfig.endpoint,
      model: insertConfig.model,
      temperature: insertConfig.temperature || 70,
      maxTokens: insertConfig.maxTokens || 2048,
      isDefault: insertConfig.isDefault || false,
    });
    return this.formatLLMConfiguration(config.toObject());
  }

  async updateLLMConfiguration(id: string, updates: Partial<LLMConfigurationType>): Promise<LLMConfigurationType | undefined> {
    await this.ensureInitialized();
    const config = await LLMConfiguration.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, lean: true }
    );
    return config ? this.formatLLMConfiguration(config) : undefined;
  }

  async deleteLLMConfiguration(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await LLMConfiguration.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Search Engine methods
  async getSearchEngine(id: string): Promise<SearchEngineType | undefined> {
    await this.ensureInitialized();
    const engine = await SearchEngine.findById(id).lean();
    return engine ? this.formatSearchEngine(engine) : undefined;
  }

  async getSearchEnginesByUserId(userId: string): Promise<SearchEngineType[]> {
    await this.ensureInitialized();
    const engines = await SearchEngine.find({
      $or: [{ userId }, { userId: null }]
    }).sort({ name: 1 }).lean();
    return engines.map(this.formatSearchEngine);
  }

  async getEnabledSearchEngines(userId: string): Promise<SearchEngineType[]> {
    await this.ensureInitialized();
    const engines = await SearchEngine.find({
      $or: [{ userId }, { userId: null }],
      enabled: true
    }).lean();
    return engines.map(this.formatSearchEngine);
  }

  async createSearchEngine(insertEngine: InsertSearchEngine): Promise<SearchEngineType> {
    await this.ensureInitialized();
    const engine = await SearchEngine.create({
      userId: insertEngine.userId,
      name: insertEngine.name,
      enabled: insertEngine.enabled !== undefined ? insertEngine.enabled : true,
      apiKey: insertEngine.apiKey || null,
    });
    return this.formatSearchEngine(engine.toObject());
  }

  async updateSearchEngine(id: string, updates: Partial<SearchEngineType>): Promise<SearchEngineType | undefined> {
    await this.ensureInitialized();
    const engine = await SearchEngine.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, lean: true }
    );
    return engine ? this.formatSearchEngine(engine) : undefined;
  }

  async deleteSearchEngine(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const result = await SearchEngine.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferencesType | undefined> {
    await this.ensureInitialized();
    let preferences = await UserPreferences.findOne({ userId }).lean();
    
    if (!preferences) {
      // Create default preferences
      const newPrefs = await UserPreferences.create({
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
      });
      preferences = newPrefs.toObject();
    }
    
    return this.formatUserPreferences(preferences);
  }

  async createUserPreferences(insertPrefs: InsertUserPreferences): Promise<UserPreferencesType> {
    await this.ensureInitialized();
    const preferences = await UserPreferences.create(insertPrefs);
    return this.formatUserPreferences(preferences.toObject());
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferencesType>): Promise<UserPreferencesType | undefined> {
    await this.ensureInitialized();
    const preferences = await UserPreferences.findOneAndUpdate(
      { userId },
      { $set: updates },
      { upsert: true, new: true, lean: true }
    );
    return preferences ? this.formatUserPreferences(preferences) : undefined;
  }

  // Placeholder methods for compatibility
  async getProjectTemplate(id: string): Promise<any> { return undefined; }
  async getProjectTemplates(): Promise<any[]> { return []; }
  async getProjectTemplatesByCategory(category: string): Promise<any[]> { return []; }
  async createProjectTemplate(template: any): Promise<any> { throw new Error('Not implemented'); }
  async updateProjectTemplate(id: string, updates: any): Promise<any> { return undefined; }
  async deleteProjectTemplate(id: string): Promise<boolean> { return false; }
  async getProjectPlanVersion(id: string): Promise<any> { return undefined; }
  async getProjectPlanVersionsByProjectId(projectId: string): Promise<any[]> { return []; }
  async getLatestProjectPlanVersion(projectId: string): Promise<any> { return undefined; }
  async createProjectPlanVersion(version: any): Promise<any> { throw new Error('Not implemented'); }
  async updateProjectPlanVersion(id: string, updates: any): Promise<any> { return undefined; }
  async deleteProjectPlanVersion(id: string): Promise<boolean> { return false; }
  async getProjectPlanVersionHistory(projectId: string): Promise<any[]> { return []; }

  // Format methods to convert MongoDB documents to expected types
  private formatUser(doc: any): UserType {
    return {
      id: doc._id,
      email: doc.email,
      firstName: doc.firstName,
      lastName: doc.lastName,
      profileImageUrl: doc.profileImageUrl,
      passwordHash: doc.passwordHash,
      username: doc.username,
      password: doc.password,
      createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now(),
    };
  }

  private formatProject(doc: any): ProjectType {
    return {
      id: doc._id,
      userId: doc.userId,
      name: doc.name,
      description: doc.description,
      githubUrl: doc.githubUrl,
      status: doc.status,
      metadata: doc.metadata,
      createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now(),
    };
  }

  private formatFile(doc: any): FileType {
    return {
      id: doc._id,
      userId: doc.userId,
      projectId: doc.projectId,
      filename: doc.filename,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      path: doc.path,
      analysis: doc.analysis,
      createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    };
  }

  private formatConversation(doc: any): ConversationType {
    return {
      id: doc._id,
      userId: doc.userId,
      title: doc.title,
      createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now(),
    };
  }

  private formatMessage(doc: any): MessageType {
    return {
      id: doc._id,
      conversationId: doc.conversationId,
      role: doc.role,
      content: doc.content,
      metadata: doc.metadata,
      createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    };
  }

  private formatLLMConfiguration(doc: any): LLMConfigurationType {
    return {
      id: doc._id,
      userId: doc.userId,
      name: doc.name,
      endpoint: doc.endpoint,
      model: doc.model,
      temperature: doc.temperature,
      maxTokens: doc.maxTokens,
      isDefault: doc.isDefault,
      createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    };
  }

  private formatSearchEngine(doc: any): SearchEngineType {
    return {
      id: doc._id,
      userId: doc.userId,
      name: doc.name,
      enabled: doc.enabled,
      apiKey: doc.apiKey,
      createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    };
  }

  private formatUserPreferences(doc: any): UserPreferencesType {
    return {
      id: doc._id,
      userId: doc.userId,
      theme: doc.theme,
      compactMode: doc.compactMode,
      animations: doc.animations,
      fontSize: doc.fontSize,
      codeFont: doc.codeFont,
      maxConcurrentRequests: doc.maxConcurrentRequests,
      cacheDuration: doc.cacheDuration,
      autoSaveConversations: doc.autoSaveConversations,
      analyticsCollection: doc.analyticsCollection,
      createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now(),
    };
  }
}