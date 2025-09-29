import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

// MongoDB Auto Setup Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-assistant-studio';

// Auto-initialize MongoDB connection
let isConnected = false;

export async function connectMongoDB(): Promise<void> {
  if (isConnected) return;
  
  try {
    await mongoose.connect(MONGODB_URI, {
      // Auto-configuration options
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('✅ MongoDB auto-setup completed successfully');
  } catch (error) {
    console.error('❌ MongoDB auto-setup failed:', error);
    // Fallback to in-memory storage if MongoDB fails
    console.log('📝 Falling back to in-memory storage');
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  email: { type: String, unique: true, sparse: true },
  firstName: String,
  lastName: String,
  profileImageUrl: String,
  passwordHash: String,
  username: { type: String, unique: true, sparse: true },
  password: String,
}, { 
  timestamps: true,
  versionKey: false 
});

// Project Schema with enhanced organization
const projectSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  userId: { type: String, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  githubUrl: String,
  status: { type: String, enum: ['active', 'archived', 'completed'], default: 'active' },
  color: { type: String, default: '#3B82F6' }, // For UI organization
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
}, { 
  timestamps: true,
  versionKey: false 
});

// Enhanced File Schema with project organization
const fileSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  userId: { type: String, ref: 'User', required: true },
  projectId: { type: String, ref: 'Project', required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
  analysis: mongoose.Schema.Types.Mixed,
  // Enhanced file organization
  folder: { type: String, default: '/' },
  isStarred: { type: Boolean, default: false },
  lastModified: { type: Date, default: Date.now },
}, { 
  timestamps: true,
  versionKey: false 
});

// Conversation Schema
const conversationSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  userId: { type: String, ref: 'User' },
  projectId: { type: String, ref: 'Project' }, // Link conversations to projects
  title: { type: String, required: true },
}, { 
  timestamps: true,
  versionKey: false 
});

// Message Schema
const messageSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  conversationId: { type: String, ref: 'Conversation' },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  metadata: mongoose.Schema.Types.Mixed,
}, { 
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false 
});

// LLM Configuration Schema
const llmConfigSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  userId: { type: String, ref: 'User' },
  name: { type: String, required: true },
  endpoint: { type: String, required: true },
  model: { type: String, required: true },
  temperature: { type: Number, default: 70 },
  maxTokens: { type: Number, default: 2048 },
  isDefault: { type: Boolean, default: false },
}, { 
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false 
});

// Search Engine Schema
const searchEngineSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  userId: { type: String, ref: 'User' },
  name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  apiKey: String,
}, { 
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false 
});

// User Preferences Schema
const userPreferencesSchema = new mongoose.Schema({
  _id: { type: String, default: () => randomUUID() },
  userId: { type: String, ref: 'User', unique: true },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
  compactMode: { type: Boolean, default: false },
  animations: { type: Boolean, default: true },
  fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
  codeFont: { type: String, enum: ['jetbrains', 'fira', 'source', 'consolas'], default: 'jetbrains' },
  maxConcurrentRequests: { type: Number, default: 5 },
  cacheDuration: { type: Number, default: 30 },
  autoSaveConversations: { type: Boolean, default: true },
  analyticsCollection: { type: Boolean, default: false },
}, { 
  timestamps: true,
  versionKey: false 
});

// Auto-create models
export const User = mongoose.model('User', userSchema);
export const Project = mongoose.model('Project', projectSchema);
export const File = mongoose.model('File', fileSchema);
export const Conversation = mongoose.model('Conversation', conversationSchema);
export const Message = mongoose.model('Message', messageSchema);
export const LLMConfiguration = mongoose.model('LLMConfiguration', llmConfigSchema);
export const SearchEngine = mongoose.model('SearchEngine', searchEngineSchema);
export const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);

// Auto-setup default data
export async function initializeDefaultData(): Promise<void> {
  try {
    // Check if default data already exists
    const defaultLLMCount = await LLMConfiguration.countDocuments({ userId: null });
    const defaultSearchCount = await SearchEngine.countDocuments({ userId: null });
    
    if (defaultLLMCount === 0) {
      // Create default LLM configuration
      await LLMConfiguration.create({
        userId: null,
        name: "Ollama Local",
        endpoint: "http://localhost:11434",
        model: "llama2-7b-chat",
        temperature: 70,
        maxTokens: 2048,
        isDefault: true,
      });
      console.log('✅ Default LLM configuration created');
    }
    
    if (defaultSearchCount === 0) {
      // Create default search engines
      const defaultEngines = [
        { name: "Google", enabled: true, apiKey: null },
        { name: "Bing", enabled: true, apiKey: null },
        { name: "DuckDuckGo", enabled: false, apiKey: null }
      ];
      
      await SearchEngine.insertMany(
        defaultEngines.map(engine => ({ ...engine, userId: null }))
      );
      console.log('✅ Default search engines created');
    }
  } catch (error) {
    console.warn('⚠️ Failed to initialize default data:', error);
  }
}

// Export connection function for auto-setup
export { connectMongoDB as autoSetupMongoDB };