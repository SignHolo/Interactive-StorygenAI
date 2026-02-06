import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Settings table - stores app configuration including API key
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  geminiApiKey: text("gemini_api_key"),
  behaviorPrompt: text("behavior_prompt").notNull().default("You are a creative and engaging storyteller. Your responses should be imaginative, vivid, and captivating."),
  frameworkTemplate: text("framework_template").notNull().default(""),
  characterPreset: text("character_preset").notNull().default(""),
  lore: text("lore").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Messages table - stores chat history
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Memory logs table - stores RAG memory entries for context retrieval
export const memoryLogs = pgTable("memory_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  embedding: text("embedding"),
  location: text("location"),
  summary: text("summary"), // Optional summarized version for RAG
  type: text("type"),
  importance: integer("importance").notNull().default(5), // 1-10 scale
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const archivedTranscripts = pgTable("archived_transcripts", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    memory_log_id: varchar("memory_log_id").notNull().references(() => memoryLogs.id, { onDelete: 'cascade' }),
    transcript_content: text("transcript_content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertMemoryLogSchema = createInsertSchema(memoryLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertArchivedTranscriptSchema = createInsertSchema(archivedTranscripts).omit({
    id: true,
    createdAt: true,
});

// Types
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type MemoryLog = typeof memoryLogs.$inferSelect;
export type InsertMemoryLog = z.infer<typeof insertMemoryLogSchema>;

export type ArchivedTranscript = typeof archivedTranscripts.$inferSelect;
export type InsertArchivedTranscript = z.infer<typeof insertArchivedTranscriptSchema>;
