import type { Message } from "@shared/schema";
import { QueryAgent } from "./query.agent";
import { AIProvider, type AIProviderConfig } from "../ai-provider";

export class SmartRagAgent {
  private providerConfig: AIProviderConfig;
  private embeddingConfig: AIProviderConfig;
  private queryAgent: QueryAgent;

  constructor(providerConfig: AIProviderConfig, embeddingConfig: AIProviderConfig) {
    console.log(`[SmartRagAgent] Initializing with provider: ${providerConfig.provider}, model: ${providerConfig.modelName}`);
    this.providerConfig = providerConfig;
    this.embeddingConfig = embeddingConfig;
    this.queryAgent = new QueryAgent();
  }

  async handleRequest(userMessage: string, rawConversationHistory: Message[], precomputedEmbedding?: number[]): Promise<string> {
    const retrievedMemories = await this.queryAgent.queryMessages(userMessage, this.embeddingConfig, precomputedEmbedding);
    console.log(`[SmartRagAgent] Total queried messages: ${retrievedMemories.length}`);

    const recentHistory = rawConversationHistory.slice(-5);
    const filteredCanon = await this.filterContext(userMessage, retrievedMemories, recentHistory);

    console.log(`[SmartRagAgent] Filtered canon words count: ${filteredCanon.split(/\s+/).length}`);
    console.log(`[SmartRagAgent] Filtered canon character count: ${filteredCanon.length}`);

    return filteredCanon;
  }

  /**
   * Filters retrieved memories to find excerpts strictly relevant to the user's query.
   */
  async filterContext(
    userMessage: string,
    retrievedMemories: Message[],
    recentHistory: Message[]
  ): Promise<string> {
    if (retrievedMemories.length === 0) {
      return ""; // No memories to filter
    }

    const prompt = this.buildFilteringPrompt(userMessage, retrievedMemories, recentHistory);

    const estimatedTokenCount = this.estimateTokenCount(prompt);
    console.log(`[SmartRagAgent] Estimated token usage for filterContext: ~${estimatedTokenCount} tokens`);

    const response = await AIProvider.generateContent(this.providerConfig, {
      messages: [{ role: "user", content: prompt }],
    });

    return response.trim();
  }

  private buildFilteringPrompt(
    userMessage: string,
    retrievedMemories: Message[],
    recentHistory: Message[]
  ): string {
    const memoriesText = retrievedMemories.map(mem => `[Memory Chunk]\n${mem.role}: ${mem.content}`).join('\n\n');
    const historyText = recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');

    return `
**ROLE AND FUNCTION:**
You are a canonical context selector for a story-driven AI system.
Your task is NOT to write prose, but to SELECT existing story passages
that are REQUIRED to maintain narrative continuity for the current scene.

---

**SOURCE OF TRUTH (OUTPUT MAY ONLY COME FROM HERE):**
Below are the retrieved canonical story messages.
These messages are the ONLY allowed source for your output.

---
${memoriesText}
---

**AUXILIARY CONTEXT (FOR REASONING ONLY — NEVER OUTPUT):**
The following messages are provided ONLY to help you understand
the current narrative flow and intent.

Recent conversation:
---
${historyText}
---

User's current input:
---
"${userMessage}"
---

**YOUR TASK:**
1. Understand the current scene, tone, and narrative direction
   based on the auxiliary context.
2. Review the canonical story messages.
3. Select ONLY the passages that:
   - Add background, lore, or prior events REQUIRED to understand the current scene
   - Introduce or explain entities, symbols, titles, or factions referenced or implied
   - Maintain continuity of character roles, identities, or power dynamics
4. The selected passages must contribute NEW information,
   not merely repeat or mirror the user's current input.

**STRICT OUTPUT RULES:**
- You MUST output text ONLY from the canonical story messages.
- You MUST NOT output anything from:
  - User's current input
  - Recent conversation context
- Restating, paraphrasing, or echoing the user's input is FORBIDDEN.
- Partial relevance is NOT sufficient.
- If a passage is only loosely related, DO NOT include it.
- If no canonical passages are truly required, return an EMPTY RESPONSE.

**CRITICAL FAILURE CONDITIONS (AVOID):**
- Including any text not found verbatim in the canonical story messages
- Including passages that only match keywords but do not add narrative value
- Including text that the user already knows from their own input

**FINAL OUTPUT:**
Return ONLY the exact, verbatim passages from the canonical story messages.
Do NOT add headings, explanations, or formatting.
`;
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}