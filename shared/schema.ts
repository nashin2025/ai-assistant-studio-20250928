import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, blob, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// UUID generation function that works in both Node.js and browser
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for browser environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Session storage table
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(), // JSON as text in SQLite
    expire: integer("expire").notNull(), // Unix timestamp
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for local authentication
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  passwordHash: text("password_hash"), // For local authentication
  // Legacy fields for backward compatibility
  username: text("username").unique(), // Keep for existing data
  password: text("password"), // Keep for existing data
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  userId: text("user_id").references(() => users.id),
  title: text("title").notNull(),
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  conversationId: text("conversation_id").references(() => conversations.id),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON as text in SQLite
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  githubUrl: text("github_url"),
  status: text("status").default("active"), // 'active' | 'archived' | 'completed'
  metadata: text("metadata"), // JSON as text in SQLite
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()),
});

export const files = sqliteTable("files", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  userId: text("user_id").references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  analysis: text("analysis"), // JSON as text in SQLite
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
});

export const llmConfigurations = sqliteTable("llm_configurations", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  endpoint: text("endpoint").notNull(),
  model: text("model").notNull(),
  temperature: integer("temperature").default(70), // 0-100 range
  maxTokens: integer("max_tokens").default(2048),
  isDefault: integer("is_default", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
});

export const searchEngines = sqliteTable("search_engines", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  enabled: integer("enabled", { mode: 'boolean' }).default(true),
  apiKey: text("api_key"),
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
});

export const userPreferences = sqliteTable("user_preferences", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  userId: text("user_id").references(() => users.id),
  theme: text("theme").default("dark"), // "light" | "dark" | "system"
  compactMode: integer("compact_mode", { mode: 'boolean' }).default(false),
  animations: integer("animations", { mode: 'boolean' }).default(true),
  fontSize: text("font_size").default("medium"), // "small" | "medium" | "large"
  codeFont: text("code_font").default("jetbrains"), // "jetbrains" | "fira" | "source" | "consolas"
  maxConcurrentRequests: integer("max_concurrent_requests").default(5),
  cacheDuration: integer("cache_duration").default(30), // minutes
  autoSaveConversations: integer("auto_save_conversations", { mode: 'boolean' }).default(true),
  analyticsCollection: integer("analytics_collection", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()),
});

export const projectTemplates = sqliteTable("project_templates", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "web", "api", "mobile", "desktop", "ml", "blockchain"
  techStack: text("tech_stack").notNull(), // JSON as text in SQLite
  files: text("files").notNull(), // JSON as text in SQLite
  dependencies: text("dependencies"), // JSON as text in SQLite
  instructions: text("instructions"), // Setup and usage instructions
  difficulty: text("difficulty").default("beginner"), // "beginner" | "intermediate" | "advanced"
  estimatedTime: text("estimated_time"), // "1-2 hours", "1 day", etc.
  tags: text("tags"), // JSON as text in SQLite
  isPublic: integer("is_public", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()),
});

export const projectPlanVersions = sqliteTable("project_plan_versions", {
  id: text("id").primaryKey().$defaultFn(() => generateUUID()),
  projectId: text("project_id").references(() => projects.id),
  userId: text("user_id").references(() => users.id),
  version: integer("version").notNull(), // Version number (1, 2, 3, etc.)
  title: text("title").notNull(), // Plan title/name
  description: text("description"), // Plan description
  goals: text("goals"), // JSON as text in SQLite
  requirements: text("requirements"), // JSON as text in SQLite
  architecture: text("architecture"), // JSON as text in SQLite
  techStack: text("tech_stack"), // JSON as text in SQLite
  timeline: text("timeline"), // JSON as text in SQLite
  resources: text("resources"), // JSON as text in SQLite
  risks: text("risks"), // JSON as text in SQLite
  notes: text("notes"), // Additional notes
  changeLog: text("change_log"), // What changed in this version
  status: text("status").default("draft"), // "draft" | "active" | "archived"
  parentVersionId: text("parent_version_id"), // Reference to previous version (self-reference)
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()),
});

// Auth-related schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Auth upsert schema (supports both Replit Auth and local auth)
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  passwordHash: true, // For local authentication
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  role: true,
  content: true,
  metadata: true,
}).extend({
  // Allow metadata to be either string (JSON) or object (will be stringified)
  metadata: z.union([z.string(), z.object({}).passthrough()]).optional(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  userId: true,
  name: true,
  description: true,
  githubUrl: true,
  status: true,
  metadata: true,
});

export const insertFileSchema = createInsertSchema(files).pick({
  userId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  path: true,
  analysis: true,
});

export const insertLLMConfigurationSchema = createInsertSchema(llmConfigurations).pick({
  userId: true,
  name: true,
  endpoint: true,
  model: true,
  temperature: true,
  maxTokens: true,
  isDefault: true,
});

export const insertSearchEngineSchema = createInsertSchema(searchEngines).pick({
  userId: true,
  name: true,
  enabled: true,
  apiKey: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type InsertLLMConfiguration = z.infer<typeof insertLLMConfigurationSchema>;
export type LLMConfiguration = typeof llmConfigurations.$inferSelect;

export type InsertSearchEngine = z.infer<typeof insertSearchEngineSchema>;
export type SearchEngine = typeof searchEngines.$inferSelect;

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
  userId: true,
  theme: true,
  compactMode: true,
  animations: true,
  fontSize: true,
  codeFont: true,
  maxConcurrentRequests: true,
  cacheDuration: true,
  autoSaveConversations: true,
  analyticsCollection: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

export const insertProjectTemplateSchema = createInsertSchema(projectTemplates).pick({
  name: true,
  description: true,
  category: true,
  techStack: true,
  files: true,
  dependencies: true,
  instructions: true,
  difficulty: true,
  estimatedTime: true,
  tags: true,
  isPublic: true,
});

export type InsertProjectTemplate = z.infer<typeof insertProjectTemplateSchema>;
export type ProjectTemplate = typeof projectTemplates.$inferSelect;

export const insertProjectPlanVersionSchema = createInsertSchema(projectPlanVersions).pick({
  projectId: true,
  userId: true,
  version: true,
  title: true,
  description: true,
  goals: true,
  requirements: true,
  architecture: true,
  techStack: true,
  timeline: true,
  resources: true,
  risks: true,
  notes: true,
  changeLog: true,
  status: true,
  parentVersionId: true,
});

export type InsertProjectPlanVersion = z.infer<typeof insertProjectPlanVersionSchema>;
export type ProjectPlanVersion = typeof projectPlanVersions.$inferSelect;
