import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertMemoryLogSchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { AIProvider, buildProviderConfig } from "./ai-provider";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all messages
  app.get("/api/messages", async (_req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {
        aiProvider: "gemini",
        behaviorPrompt: "You are a creative and engaging storyteller. Your responses should be imaginative, vivid, and captivating.",
        frameworkTemplate: "",
        geminiApiKey: null,
        openaiApiKey: null,
        openaiBaseUrl: null,
        anthropicApiKey: null,
        generationModel: "gemini-3-pro-preview",
        ragModel: "gemini-2.5-pro",
        proofreaderModel: "gemini-2.5-pro",
        utilityModel: "gemini-3-flash-preview",
        embeddingModel: "embedding-001",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update settings
  app.put("/api/settings", async (req, res) => {
    try {
      const data = insertSettingsSchema.partial().parse(req.body);
      const updated = await storage.updateSettings(data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get all memory logs
  app.get("/api/memory", async (_req, res) => {
    try {
      const logs = await storage.getAllMemoryLogs();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update memory log
  app.put("/api/memory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = z.object({ content: z.string() }).parse(req.body);
      const updated = await storage.updateMemoryLog(id, content);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete memory log
  app.delete("/api/memory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMemoryLog(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Chat endpoint - main AI interaction using OrchestratorAgent
  app.post("/api/chat", async (req, res) => {
    try {
      const { content } = z.object({ content: z.string() }).parse(req.body);

      // Get settings for behavior, API key, and model selection
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(400).json({ error: "Settings not configured." });
      }


      // Validate that the appropriate API key is configured
      const provider = settings.aiProvider || "gemini";
      if (provider === "openai" && !settings.openaiApiKey) {
        return res.status(400).json({
          error: "OpenAI API key not configured. Please add it in Settings.",
        });
      }
      if (provider === "anthropic" && !settings.anthropicApiKey) {
        return res.status(400).json({
          error: "Anthropic API key not configured. Please add it in Settings.",
        });
      }
      if ((provider === "gemini" || provider === "gemma") && !settings.geminiApiKey && !process.env.GEMINI_API_KEY) {
        return res.status(400).json({
          error: `${provider === "gemma" ? "Gemma" : "Gemini"} API key not configured. Please add it in Settings.`,
        });
      }

      // Get conversation history
      const allMessages = await storage.getAllMessages();

      // Use OrchestratorAgent to handle the entire flow
      const { OrchestratorAgent } = await import("./agents/orchestrator.agent");
      const orchestrator = new OrchestratorAgent();
      const aiResponse = await orchestrator.handleRequest(content, allMessages);

      // The orchestrator returns the response text IMMEDIATELY after proofreader
      // approval. Post-processing (location extraction, embedding, DB save) runs
      // in the background. Construct a provisional response for the UI now.
      const lastLocation = allMessages.length > 0
        ? allMessages[allMessages.length - 1].location || "Unknown"
        : "Unknown";

      const provisionalMessage = {
        id: `provisional-${Date.now()}`,
        role: "assistant" as const,
        content: aiResponse,
        location: lastLocation,
        embedding: null,
        createdAt: new Date(),
      };

      // ── Send response to UI immediately ──
      res.json(provisionalMessage);

      // ── Background: Summary + Memory Log (fire-and-forget) ──
      // Note: We count the user message that the orchestrator already saved + 
      // the assistant message being saved in background, so use allMessages.length + 2
      const projectedTotal = allMessages.length + 2;
      if (projectedTotal % 4 === 0 && projectedTotal > 0) {
        (async () => {
          try {
            // Wait a moment for the background save to finish 
            // so we can fetch the most recent messages
            await new Promise(r => setTimeout(r, 3000));
            const updatedMessages = await storage.getAllMessages();
            const lastFourMessages = updatedMessages.slice(-4);
            const conversationSnippet = lastFourMessages
              .map((m) => `${m.role}: ${m.content}`)
              .join("\n");

            const { SummaryAgent } = await import("./agents/summary.agent");
            const summaryAgent = new SummaryAgent();
            const utilityConfig = buildProviderConfig(settings, "utility");
            const embeddingConfig = buildProviderConfig(settings, "embedding");
            const summaryLocation = updatedMessages[updatedMessages.length - 1]?.location || "Unknown";
            const summary = await summaryAgent.summarizeForMemory(
              lastFourMessages.map((m) => m.content),
              summaryLocation,
              utilityConfig
            );

            let logEmbedding: number[] | undefined;
            try {
              logEmbedding = await AIProvider.getEmbedding(embeddingConfig, summary);
            } catch (e) {
              console.warn("[Routes] Failed to generate embedding for memory log:", e);
            }

            await storage.createMemoryLog({
              content: conversationSnippet,
              summary,
              importance: 5,
              embedding: logEmbedding
            });
            console.log("[Routes] Background summary + memory log saved successfully.");
          } catch (bgError) {
            console.error("[Routes] Background summary task failed:", bgError);
          }
        })();
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message || "Failed to generate response" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
