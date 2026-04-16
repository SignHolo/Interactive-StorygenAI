import { GemmaProvider } from "../gemma-provider";
import type { AIProviderConfig } from "../ai-provider";

// ─── Gemma Proofreader Agent ─────────────────────────────────────────────────
// A dedicated proofreader agent for Gemma 4 models.
// Uses GemmaProvider with native system role and thinking mode for
// better reasoning about narrative compliance.

export type ProofreaderResult = {
  isCompliant: boolean;
  feedback: string | null;
};

export class GemmaProofreaderAgent {

  /**
   * Reviews a story response to ensure it does not improperly seize narrative control.
   * Uses Gemma 4 with thinking mode for better analysis.
   */
  async reviewResponse(
    response: string,
    providerConfig: AIProviderConfig,
    userMessage: string,
  ): Promise<ProofreaderResult> {

    const systemInstruction = `<|think|>
<ROLE>
You are a specialized proofreading assistant for a story-driven AI system.
Your ONLY task is to determine if the AI-generated story segment improperly seized narrative control from the user.
</ROLE>

<RULES>
The fundamental rule is: "The AI must not advance the story's time, change the location, unless the user explicitly requested it."

Analyze the AI's response for these specific violations:
1. Unauthorized Time Skip: Did the AI change the time of day, day of the week, or skip forward in time (e.g., "later that day," "the next morning") WITHOUT the user asking?
2. Unauthorized Location/Scene Change: Did the AI change the location or scene WITHOUT the user's instruction?
3. Unrequested Arc Reports: Did the AI introduce arc summarization not prompted by the user?

Guidelines:
- Direct user requests override violations.
- Subtle user hints count (e.g., "Let's move to the next scene").
- Implicit permission for location changes if the user suggests movement (e.g., "We should head to the library").
- Natural clock time progression (under 4 hours) is allowed.
- Minor detail additions to the same location are allowed.
- Sub-location changes within the same main location are allowed.
</RULES>

<OUTPUT_FORMAT>
- If compliant: respond ONLY with "COMPLIANT"
- If non-compliant: respond with "NON-COMPLIANT" followed by a brief explanation of the violation.
- Do NOT add any other text, preamble, or explanation.
</OUTPUT_FORMAT>`;

    const userPrompt = `The user's most recent input was:
"""
${userMessage}
"""

The AI generated this response:
"""
${response}
"""

Provide your verdict now.`;

    try {
      console.log(`[GemmaProofreaderAgent] Using model: ${providerConfig.modelName}`);
      const text = await GemmaProvider.generateContent(
        providerConfig.apiKey,
        providerConfig.modelName,
        systemInstruction,
        [{ role: 'user', content: userPrompt }],
      );

      const trimmedText = text.trim();

      if (trimmedText.startsWith("COMPLIANT")) {
        console.log("[GemmaProofreaderAgent] Response is compliant.");
        return { isCompliant: true, feedback: null };
      } else {
        const feedback = trimmedText.replace(/^NON-COMPLIANT\s*/, '').trim();
        console.log(`[GemmaProofreaderAgent] Response is NON-COMPLIANT. Feedback: ${feedback}`);
        return {
          isCompliant: false,
          feedback: feedback || "The response was non-compliant, but no specific feedback was provided.",
        };
      }
    } catch (error) {
      console.error("[GemmaProofreaderAgent] Failed:", error);
      // If the proofreader fails, assume compliant to avoid blocking the user.
      return { isCompliant: true, feedback: null };
    }
  }
}
