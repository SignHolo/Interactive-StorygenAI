import "dotenv/config";
import { db } from "../server/db";
import { messages, memoryLogs } from "@shared/schema";
import { isNull, eq } from "drizzle-orm";
import { AIProvider, buildProviderConfig } from "../server/ai-provider";
import { storage } from "../server/storage";

async function backfillEmbeddings() {
  console.log("Starting embedding backfill process...");

  // 1. Get Settings
  const settings = await storage.getSettings();
  if (!settings) {
    console.error("Settings not found. Please start the app and configure settings first.");
    process.exit(1);
  }

  const embeddingConfig = buildProviderConfig(settings, "embedding");
  console.log(`Using AI Provider: ${embeddingConfig.provider}`);
  console.log(`Using Model: ${embeddingConfig.modelName}`);

  try {
    // 2. Process Messages
    const nullMessages = await db.select().from(messages).where(isNull(messages.embedding));
    console.log(`\nFound ${nullMessages.length} messages without embeddings.`);

    for (let i = 0; i < nullMessages.length; i++) {
      const msg = nullMessages[i];
      console.log(`[Messages] Processing ${i + 1}/${nullMessages.length} (ID: ${msg.id})`);
      
      try {
        const embedding = await AIProvider.getEmbedding(embeddingConfig, msg.content);
        
        await db.update(messages)
          .set({ embedding })
          .where(eq(messages.id, msg.id));
          
      } catch (err: any) {
        console.error(`[Messages] Failed to embed message ${msg.id}:`, err.message);
      }
      
      // Basic rate limiting prevention (Google AI Studio sometimes rate limits)
      await new Promise(r => setTimeout(r, 1000));
    }

    // 3. Process Memory Logs
    const nullMemoryLogs = await db.select().from(memoryLogs).where(isNull(memoryLogs.embedding));
    console.log(`\nFound ${nullMemoryLogs.length} memory logs without embeddings.`);

    for (let i = 0; i < nullMemoryLogs.length; i++) {
        const log = nullMemoryLogs[i];
        console.log(`[MemoryLogs] Processing ${i + 1}/${nullMemoryLogs.length} (ID: ${log.id})`);
        
        try {
          const textToEmbed = log.summary || log.content;
          const embedding = await AIProvider.getEmbedding(embeddingConfig, textToEmbed);
          
          await db.update(memoryLogs)
            .set({ embedding })
            .where(eq(memoryLogs.id, log.id));
            
        } catch (err: any) {
          console.error(`[MemoryLogs] Failed to embed memory log ${log.id}:`, err.message);
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }
      
    console.log("\n✅ Backfill process completed successfully!");
  } catch (error) {
    console.error("\n❌ Fatal error during backfill:", error);
  }
  
  process.exit(0);
}

backfillEmbeddings();
