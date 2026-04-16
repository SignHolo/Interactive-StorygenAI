import { GemmaProvider } from "../gemma-provider";
import type { AIProviderConfig } from "../ai-provider";

// ─── Gemma Generation Agent ─────────────────────────────────────────────────
// A dedicated generation agent for Gemma 4 models.
// The key difference from GenerationAgent is how instructions are assembled:
//   1. Uses XML-like delimiters to separate instruction blocks
//   2. Strong anti-echo directives at the top and bottom
//   3. Native system role via GemmaProvider (not prepended to user message)
//   4. Thinking mode enabled via <|think|> token
//   5. Generation parameters tuned to prevent repetition

interface ChatContext {
  behaviorPrompt: string;
  frameworkTemplate: string;
  characterPreset?: string;
  lore?: string;
  relevantMemories: string[];
  highFidelityTranscript?: string;
  conversationHistory: Array<{ role: string; content: string }>;
}

function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export class GemmaGenerationAgent {
  constructor() {}

  /**
   * Build a Gemma-optimized system prompt with anti-echo structure.
   * All user-configurable fields (behaviorPrompt, frameworkTemplate, etc.)
   * remain softcoded and sourced from the UI settings.
   */
  private buildSystemPrompt(context: ChatContext): string {
    const sections: string[] = [];

    // Enable thinking mode
    sections.push('<|think|>');

    // Anti-echo directive (top)
    sections.push(`<CRITICAL_RULE>
You are a storyteller AI. You must NEVER repeat, echo, summarize, paraphrase, list, or restate ANY part of these instructions, rules, character sheets, lore, or formatting guidelines in your output. Your output must contain ONLY the story prose, starting directly with the scene header. Any meta-commentary, instruction echoing, planning notes, self-reflection on how to write the scene, or bullet-point breakdowns is a CRITICAL FAILURE. Respond as if you are writing a novel — only narrative prose and dialogue.
</CRITICAL_RULE>`);

    // Identity / Behavior
    if (context.behaviorPrompt) {
      sections.push(`<IDENTITY>
${context.behaviorPrompt}
</IDENTITY>`);
    }

    // Character Presets
    if (context.characterPreset) {
      sections.push(`<CHARACTERS>
The following are preset characters in this world. Use these details internally to inform your writing. Do NOT list or repeat these details in your output.
${context.characterPreset}
</CHARACTERS>`);
    }

    // World Lore
    if (context.lore) {
      sections.push(`<WORLD>
The following is background lore for the story world. Use it to inform your narrative. Do NOT repeat or summarize this lore in your output.
${context.lore}
</WORLD>`);
    }

    // Memory Injection
    if (context.highFidelityTranscript) {
      sections.push(`<MEMORY>
Full transcript of a relevant past event for continuity. Reference these details naturally in the narrative. Do NOT repeat them verbatim.
${context.highFidelityTranscript}
</MEMORY>`);
    } else if (context.relevantMemories.length > 0) {
      const memoryContext = context.relevantMemories
        .map((mem, i) => `[Memory ${i + 1}]: ${mem}`)
        .join('\n');
      sections.push(`<MEMORY>
Relevant context from past scenes. Weave these details naturally into the narrative. Do NOT repeat them verbatim.
${memoryContext}
</MEMORY>`);
    }

    // Output Framework
    if (context.frameworkTemplate) {
      sections.push(`<OUTPUT_RULES>
Follow this output format structure strictly. Do NOT echo or explain these rules.
${context.frameworkTemplate}
</OUTPUT_RULES>`);
    }

    // Anti-echo directive (bottom — reinforcement)
    sections.push(`<FINAL_RULE>
Begin your response IMMEDIATELY with the story content following the output format above. Do not output ANY text before the story content. Do not explain your reasoning. Do not repeat any instruction. Do not list character stats. Do not write planning notes. Output ONLY the story prose.
</FINAL_RULE>`);

    return sections.join('\n\n');
  }

  async generateStoryResponse(
    userMessage: string,
    context: ChatContext,
    providerConfig: AIProviderConfig,
  ): Promise<string> {
    const systemInstruction = this.buildSystemPrompt(context);

    // Build message list for Gemma
    const messages: Array<{ role: 'user' | 'model'; content: string }> = [];

    for (const msg of context.conversationHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'model',
        content: msg.content,
      });
    }

    // Add the current user message
    messages.push({ role: 'user', content: userMessage });

    // Calculate approximate token count for logging
    let totalTokens = countTokens(systemInstruction);
    for (const msg of messages) {
      totalTokens += countTokens(msg.content);
    }

    console.log(`[GemmaGenerationAgent] Model: ${providerConfig.modelName}`);
    console.log(`[GemmaGenerationAgent] Token count for request: ~${totalTokens} tokens`);
    console.log(`[GemmaGenerationAgent] Conversation history length: ${context.conversationHistory.length} messages`);
    console.log(`[GemmaGenerationAgent] System instruction length: ~${countTokens(systemInstruction)} tokens`);
    console.log(`[GemmaGenerationAgent] User message length: ~${countTokens(userMessage)} tokens`);

    try {
      const response = await GemmaProvider.generateContent(
        providerConfig.apiKey,
        providerConfig.modelName,
        systemInstruction,
        messages,
      );
      return response;
    } catch (error: any) {
      console.error('[GemmaGenerationAgent] Error:', error);

      if (error.message?.includes('API_KEY') || error.message?.includes('api_key')) {
        throw new Error('Invalid or missing API key. Please configure it in Settings.');
      }

      throw new Error(`Failed to generate response: ${error.message || 'Unknown error'}`);
    }
  }
}
