import { GoogleGenAI, type Content } from '@google/genai';

// ─── Gemma Provider ──────────────────────────────────────────────────────────
// A dedicated provider for Google Gemma 4 models using the @google/genai SDK.
// This is completely separate from the legacy @google/generative-ai SDK used
// by the Gemini provider, because Gemma 4 requires:
//   1. Native `system` role via `config.systemInstruction`
//   2. Different prompt formatting (anti-echo structure)
//   3. Thinking mode support via <|think|> token
//   4. Response post-processing to strip thinking tokens

export class GemmaProvider {

  /**
   * Generate text content using the Gemma 4 model via the @google/genai SDK.
   * Uses native systemInstruction support and thinking mode.
   */
  static async generateContent(
    apiKey: string,
    modelName: string,
    systemInstruction: string,
    messages: Array<{ role: 'user' | 'model'; content: string }>,
  ): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });

    // Build Gemma-format contents
    const contents: Content[] = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    console.log(`[GemmaProvider] Model: ${modelName}, Messages: ${messages.length}`);
    console.log(`[GemmaProvider] System instruction length: ${systemInstruction.length} chars`);

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.85,
        },
      });

      let text = response.text || '';

      // Strip thinking tokens from response if the model leaks them
      // Gemma 4 larger models may output <|channel>thought ... <channel|> blocks
      text = text.replace(/<\|channel>thought[\s\S]*?<channel\|>/g, '').trim();

      // Also strip any residual control tokens that might leak
      text = text.replace(/<\|think\|>/g, '').trim();
      text = text.replace(/<\|turn>/g, '').trim();
      text = text.replace(/<turn\|>/g, '').trim();

      return text || "I couldn't generate a response. Please try again.";
    } catch (error: any) {
      console.error(`[GemmaProvider] Error for ${modelName}:`, error.message);

      if (error.message?.includes('API_KEY') || error.message?.includes('api_key')) {
        throw new Error('Invalid or missing Gemini API key. Gemma 4 uses the same API key as Gemini. Please configure it in Settings.');
      }

      throw new Error(`Failed to generate Gemma response: ${error.message || 'Unknown error'}`);
    }
  }
}
