import type { Message } from "@shared/schema";
import { QueryAgent } from "./query.agent";
import { GemmaProvider } from "../gemma-provider";
import type { AIProviderConfig } from "../ai-provider";

// ─── Gemma RAG Agent ─────────────────────────────────────────────────────────
// A dedicated RAG agent for Gemma 4 models that uses the GemmaProvider
// with Gemma-optimized prompt structure for context filtering.
// The key difference from SmartRagAgent is:
//   1. Uses GemmaProvider with native system role
//   2. Structured prompt with anti-echo delimiters
//   3. Thinking mode enabled for better reasoning about relevance

export class GemmaSmartRagAgent {
  private providerConfig: AIProviderConfig;
  private embeddingConfig: AIProviderConfig;
  private queryAgent: QueryAgent;

  constructor(providerConfig: AIProviderConfig, embeddingConfig: AIProviderConfig) {
    console.log(`[GemmaSmartRagAgent] Initializing with model: ${providerConfig.modelName}`);
    this.providerConfig = providerConfig;
    this.embeddingConfig = embeddingConfig;
    this.queryAgent = new QueryAgent();
  }

  async handleRequest(userMessage: string, rawConversationHistory: Message[], precomputedEmbedding?: number[]): Promise<string> {
    const retrievedMemories = await this.queryAgent.queryMessages(userMessage, this.embeddingConfig, precomputedEmbedding);
    console.log(`[GemmaSmartRagAgent] Total queried messages: ${retrievedMemories.length}`);

    const recentHistory = rawConversationHistory.slice(-5);
    const filteredCanon = await this.filterContext(userMessage, retrievedMemories, recentHistory);

    console.log(`[GemmaSmartRagAgent] Filtered canon words count: ${filteredCanon.split(/\s+/).length}`);
    console.log(`[GemmaSmartRagAgent] Filtered canon character count: ${filteredCanon.length}`);

    return filteredCanon;
  }

  /**
   * Filters retrieved memories using Gemma with structured prompting.
   */
  async filterContext(
    userMessage: string,
    retrievedMemories: Message[],
    recentHistory: Message[],
  ): Promise<string> {
    if (retrievedMemories.length === 0) {
      return "";
    }

    const { systemInstruction, userPrompt } = this.buildFilteringPrompt(
      userMessage,
      retrievedMemories,
      recentHistory,
    );

    const estimatedTokenCount = Math.ceil((systemInstruction.length + userPrompt.length) / 4);
    console.log(`[GemmaSmartRagAgent] Estimated token usage for filterContext: ~${estimatedTokenCount} tokens`);

    try {
      const response = await GemmaProvider.generateContent(
        this.providerConfig.apiKey,
        this.providerConfig.modelName,
        systemInstruction,
        [{ role: 'user', content: userPrompt }],
      );

      return response.trim();
    } catch (error) {
      console.error("[GemmaSmartRagAgent] Filter context failed:", error);
      // Fallback: return raw memories as-is
      return retrievedMemories.map(mem => mem.content).join('\n\n');
    }
  }

  private buildFilteringPrompt(
    userMessage: string,
    retrievedMemories: Message[],
    recentHistory: Message[],
  ): { systemInstruction: string; userPrompt: string } {
    const memoriesText = retrievedMemories
      .map(mem => `[Memory Chunk]\n${mem.role}: ${mem.content}`)
      .join('\n\n');

    const historyText = recentHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const systemInstruction = `<|think|>
<ROLE>
You are a canonical context selector for a story-driven AI system.
Your task is NOT to write prose, but to SELECT existing story passages
that are REQUIRED to maintain narrative continuity for the current scene.
</ROLE>

<STRICT_RULES>
- You MUST output text ONLY from the canonical story messages provided below.
- You MUST NOT output anything from the user's current input or recent conversation.
- Restating, paraphrasing, or echoing the user's input is FORBIDDEN.
- Partial relevance is NOT sufficient.
- If a passage is only loosely related, DO NOT include it.
- If no canonical passages are truly required, return an EMPTY RESPONSE.
- Do NOT add headings, explanations, labels, or formatting. Return ONLY verbatim passages.
</STRICT_RULES>`;

    const userPrompt = `<SOURCE_OF_TRUTH>
Below are the retrieved canonical story messages. Your output may ONLY come from here:
---
${memoriesText}
---
</SOURCE_OF_TRUTH>

<AUXILIARY_CONTEXT>
For reasoning only — NEVER output any of this:

Recent conversation:
---
${historyText}
---

User's current input:
---
"${userMessage}"
---
</AUXILIARY_CONTEXT>

<TASK>
1. Understand the current scene, tone, and narrative direction from the auxiliary context.
2. Review the canonical story messages.
3. Select ONLY passages that:
   - Add background, lore, or prior events REQUIRED to understand the current scene
   - Introduce or explain entities, symbols, titles, or factions referenced or implied
   - Maintain continuity of character roles, identities, or power dynamics
4. Return ONLY the exact, verbatim passages. No headings, no explanations.
</TASK>`;

    return { systemInstruction, userPrompt };
  }
}
