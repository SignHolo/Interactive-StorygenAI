import { AIProvider, type AIProviderConfig } from "../ai-provider";

interface ChatContext {
  behaviorPrompt: string;
  frameworkTemplate: string;
  characterPreset?: string;
  lore?: string;
  relevantMemories: string[];
  highFidelityTranscript?: string; // For Tier 2 memory
  conversationHistory: Array<{ role: string; content: string }>;
}

// Simple token counting function (approximate)
function countTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters or 0.75 words
  return Math.ceil(text.length / 4);
}

export class GenerationAgent {
  constructor() { }

  async generateStoryResponse(
    userMessage: string,
    context: ChatContext,
    providerConfig: AIProviderConfig
  ): Promise<string> {
    let systemInstruction = context.behaviorPrompt;

    if (context.characterPreset) {
      systemInstruction += `\n\n--- PRESET CHARACTER DETAILS ---\n${context.characterPreset}`;
    }

    if (context.lore) {
      systemInstruction += `\n\n--- WORLD LORE & BACKGROUND ---\n${context.lore}`;
    }

    if (context.frameworkTemplate) {
      systemInstruction += `\n\nOutput Format:\n${context.frameworkTemplate}`;
    }

    // --- Memory Injection ---
    if (context.highFidelityTranscript) {
      systemInstruction += `\n\n--- Full Transcript of a Relevant Past Event ---\nYou have requested details about a past event. Here is the full transcript of that scene to help you provide a detailed answer:\n${context.highFidelityTranscript}`;
    } else if (context.relevantMemories.length > 0) {
      const memoryContext = context.relevantMemories.map((mem, i) => `[Memory ${i + 1}]: ${mem}`).join("\n");
      systemInstruction += `\n\n--- Relevant Context from Memory ---\n${memoryContext}`;
    }
    // --- End Memory Injection ---

    // Build message list for the provider
    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

    for (const msg of context.conversationHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }

    // Add the current user message
    messages.push({ role: "user", content: userMessage });

    // Calculate approximate token count for logging
    let totalTokens = countTokens(systemInstruction);
    for (const msg of messages) {
      totalTokens += countTokens(msg.content);
    }

    console.log(`[GenerationAgent] Provider: ${providerConfig.provider}, Model: ${providerConfig.modelName}`);
    console.log(`[GenerationAgent] Token count for request: ~${totalTokens} tokens`);
    console.log(`[GenerationAgent] Conversation history length: ${context.conversationHistory.length} messages`);
    console.log(`[GenerationAgent] System instruction length: ~${countTokens(systemInstruction)} tokens`);
    console.log(`[GenerationAgent] User message length: ~${countTokens(userMessage)} tokens`);

    try {
      const response = await AIProvider.generateContent(providerConfig, {
        systemInstruction,
        messages,
      });
      return response;
    } catch (error: any) {
      console.error("AI Provider error:", error);

      if (error.message?.includes("API_KEY") || error.message?.includes("api_key")) {
        throw new Error("Invalid or missing API key. Please configure it in Settings.");
      }

      throw new Error(`Failed to generate response: ${error.message || "Unknown error"}`);
    }
  }
}