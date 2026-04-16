import { GenerationAgent } from "./generation.agent";
import { ProofreaderAgent } from "./proofreader.agent";
import { storage } from "../storage";
import type { Message } from "@shared/schema";
import { SmartRagAgent } from "./SmartRagAgent";
import { AIProvider, buildProviderConfig, type AIProviderConfig } from "../ai-provider";

// Gemma-specific agents
import { GemmaGenerationAgent } from "./gemma-generation.agent";
import { GemmaSmartRagAgent } from "./gemma-rag.agent";
import { GemmaProofreaderAgent } from "./gemma-proofreader.agent";

export class OrchestratorAgent {
  private generationAgent: GenerationAgent;
  private proofreaderAgent: ProofreaderAgent;

  // Gemma agents
  private gemmaGenerationAgent: GemmaGenerationAgent;
  private gemmaProofreaderAgent: GemmaProofreaderAgent;

  constructor() {
    this.generationAgent = new GenerationAgent();
    this.proofreaderAgent = new ProofreaderAgent();
    this.gemmaGenerationAgent = new GemmaGenerationAgent();
    this.gemmaProofreaderAgent = new GemmaProofreaderAgent();
  }

  private async _extractLocation(text: string, utilityConfig: AIProviderConfig): Promise<string | undefined> {
    if (!text) return undefined;
    const explicitMatch = text.match(/^\s*\*\*Location:\*\*\s*(.*)/);
    if (explicitMatch && explicitMatch[1]) {
      return explicitMatch[1].trim();
    }
    const header = text.split('\n').slice(0, 5).join('\n');
    try {
      const prompt = `
From the following header, extract the full location string. The location is typically the first line, often containing a place, time, and day. It might look like "Heizen Academy - Classroom 1-A | Morning | [Day 1] | 09:00".
Respond with *only* the location string, and nothing else. If no clear location is found, respond with "N/A".
Header:
"""
${header}
"""
`;
      const response = await AIProvider.generateContent(utilityConfig, {
        messages: [{ role: "user", content: prompt }],
      });
      const location = response.trim();
      if (location && location !== "N/A" && location.length > 5) {
        return location;
      }
      return undefined;
    } catch (error) {
      console.error("AI-based location extraction failed:", error);
      return undefined;
    }
  }

  async handleRequest(userMessage: string, rawConversationHistory: Message[], clientApiKey?: string): Promise<string> {
    const settings = await storage.getSettings();
    if (!settings) throw new Error("Settings not found.");

    const isGemma = settings.aiProvider === "gemma";

    // Build provider configs for each agent role
    const generationConfig = buildProviderConfig(settings, "generation");
    const utilityConfig = buildProviderConfig(settings, "utility");
    const proofreaderConfig = buildProviderConfig(settings, "proofreader");
    const ragConfig = buildProviderConfig(settings, "rag");
    const embeddingConfig = buildProviderConfig(settings, "embedding");

    // Override API key if provided by the client (backwards compat)
    if (clientApiKey) {
      generationConfig.apiKey = clientApiKey;
      utilityConfig.apiKey = clientApiKey;
      proofreaderConfig.apiKey = clientApiKey;
      ragConfig.apiKey = clientApiKey;
      embeddingConfig.apiKey = clientApiKey;
    }

    const lastKnownLocation = rawConversationHistory.length > 0 ? rawConversationHistory[rawConversationHistory.length - 1].location || "Unknown" : "Unknown";

    // ══════════════════════════════════════════════════════════════════════════
    // GROUP 1: User Embedding ‖ RAG Retrieval (parallel)
    // — Both are independent. The embedding is also forwarded to RAG's
    //   QueryAgent to avoid a duplicate embedding API call.
    // ══════════════════════════════════════════════════════════════════════════
    console.log("[Orchestrator] ⚡ Group 1: User embedding + RAG retrieval (parallel)");

    let userEmbedding: number[] | undefined;

    // Create the RAG agent early so we can start it in parallel
    const ragAgent = isGemma
      ? new GemmaSmartRagAgent(ragConfig, embeddingConfig)
      : new SmartRagAgent(ragConfig, embeddingConfig);

    // Start user embedding generation
    const embeddingPromise = AIProvider.getEmbedding(embeddingConfig, userMessage)
      .then(emb => { userEmbedding = emb; return emb; })
      .catch(e => {
        console.warn("[Orchestrator] Failed to generate embedding for user message:", e);
        return undefined;
      });

    // Start RAG retrieval concurrently — it will start keyword search + DB query
    // immediately, and the semantic search will reuse the precomputed embedding
    // once it resolves via the promise.
    const ragPromise = embeddingPromise.then(emb => {
      // Once embedding is ready, pass it to RAG so it can skip re-embedding
      // the same text in its semantic search path.
      return ragAgent.handleRequest(userMessage, [...rawConversationHistory], emb);
    });

    // Wait for embedding (fast) — RAG continues in background
    await embeddingPromise;

    // ══════════════════════════════════════════════════════════════════════════
    // GROUP 2: Save User Message ‖ Wait for RAG filtering (parallel)
    // — Saving the user message to DB doesn't block the RAG agent's work.
    // ══════════════════════════════════════════════════════════════════════════
    console.log("[Orchestrator] ⚡ Group 2: Save user message + RAG filtering (parallel)");

    const [createdMessage, filteredCanon] = await Promise.all([
      storage.createMessage({
        role: "user",
        content: userMessage,
        location: lastKnownLocation,
        embedding: userEmbedding
      }),
      ragPromise
    ]);

    // Create the full history for the context, including the new user message
    const updatedConversationHistory = [...rawConversationHistory, createdMessage];

    const chatContext: any = {
      behaviorPrompt: settings.behaviorPrompt,
      frameworkTemplate: settings.frameworkTemplate,
      characterPreset: settings.characterPreset || undefined,
      lore: settings.lore || undefined,
      relevantMemories: [filteredCanon],
      conversationHistory: updatedConversationHistory.slice(-20).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        content: msg.content
      })),
    };

    // ══════════════════════════════════════════════════════════════════════════
    // SEQUENTIAL: Generation → Proofreader retry loop (cannot be parallelized)
    // ══════════════════════════════════════════════════════════════════════════
    let response = "";
    const MAX_RETRIES = 2;
    for (let i = 0; i < MAX_RETRIES; i++) {
      console.log(`[Orchestrator] Generation attempt ${i + 1} (provider: ${isGemma ? 'gemma' : settings.aiProvider})`);

      // ── Generation Phase ──
      let generatedResponse: string;
      if (isGemma) {
        generatedResponse = await this.gemmaGenerationAgent.generateStoryResponse(
          userMessage, chatContext, generationConfig
        );
      } else {
        generatedResponse = await this.generationAgent.generateStoryResponse(
          userMessage, chatContext, generationConfig
        );
      }

      // ── Proofreader Phase ──
      console.log("[Orchestrator] Reviewing response with ProofreaderAgent...");
      let review;
      if (isGemma) {
        review = await this.gemmaProofreaderAgent.reviewResponse(generatedResponse, proofreaderConfig, userMessage);
      } else {
        review = await this.proofreaderAgent.reviewResponse(generatedResponse, proofreaderConfig, userMessage);
      }

      if (review.isCompliant) {
        response = generatedResponse;
        break;
      } else {
        response = generatedResponse;
        console.log(`[Orchestrator] Response non-compliant. Adding feedback for retry.`);
        chatContext.conversationHistory.push(
          { role: 'model', content: generatedResponse },
          { role: 'user', content: `System Note: The previous response was not compliant. Please fix the following issues and regenerate the response:\n- ${review.feedback}` }
        );
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BACKGROUND: Location extraction + embedding + save (fire-and-forget)
    // — The response is returned to the caller IMMEDIATELY so the UI can
    //   display the story without waiting for post-processing.
    // ══════════════════════════════════════════════════════════════════════════
    console.log("[Orchestrator] ✅ Proofreader approved — returning response to UI immediately.");
    console.log("[Orchestrator] 🔄 Post-processing (location + embedding + save) running in background...");

    const bgResponse = response; // capture for closure
    (async () => {
      try {
        // Group 3: Location Extraction ‖ Assistant Embedding (parallel)
        const [extractedLocation, assistantEmbedding] = await Promise.all([
          this._extractLocation(bgResponse, utilityConfig)
            .then(loc => loc || lastKnownLocation),
          AIProvider.getEmbedding(embeddingConfig, bgResponse)
            .catch(e => {
              console.warn("[Orchestrator] Failed to generate embedding for assistant message:", e);
              return undefined;
            })
        ]);

        // Save the final assistant message
        await storage.createMessage({
          role: "assistant",
          content: bgResponse,
          location: extractedLocation,
          embedding: assistantEmbedding
        });
        console.log("[Orchestrator] ✅ Background post-processing complete (message saved).");
      } catch (bgError) {
        console.error("[Orchestrator] ❌ Background post-processing failed:", bgError);
        // Fallback: save without location/embedding so the message isn't lost
        try {
          await storage.createMessage({
            role: "assistant",
            content: bgResponse,
            location: lastKnownLocation,
          });
          console.log("[Orchestrator] ⚠️ Fallback save complete (no embedding/location).");
        } catch (fallbackError) {
          console.error("[Orchestrator] ❌ Fallback save also failed:", fallbackError);
        }
      }
    })();

    return response;
  }
}