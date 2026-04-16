import { AIProvider, type AIProviderConfig } from "../ai-provider";

// The result from the proofreader can be a simple "OK" or feedback for improvement.
export type ProofreaderResult = {
  isCompliant: boolean;
  feedback: string | null;
};

export class ProofreaderAgent {
  /**
   * Reviews a story response to ensure it does not improperly seize narrative control.
   * @param response The story response to check.
   * @param providerConfig The AI provider configuration.
   * @param userMessage The original user message that prompted the response.
   * @returns A ProofreaderResult indicating compliance and providing feedback if necessary.
   */
  async reviewResponse(
    response: string,
    providerConfig: AIProviderConfig,
    userMessage: string,
  ): Promise<ProofreaderResult> {
    const prompt = `
You are a specialized proofreading assistant. Your ONLY task is to determine if the AI-generated story segment improperly seized narrative control from the user.

The user's most recent input was:
"""
${userMessage}
"""

The AI generated this response:
"""
${response}
"""

Your job is to analyze and review the AI's response.
The fundamental rule is: **"The AI must not advance the story's time, change the location, unless the user explicitly requested it."**

Analyze the AI's response in the context of the user's input and check for these specific violations:
1.  **Unauthorized Time Skip**: Did the AI change the time of day, day of the week, or skip forward in time (e.g., "later that day," "the next morning") WITHOUT the user asking for it?
2.  **Unauthorized Location/Scene Change**: Did the AI change the location or scene (e.g., from a classroom to a hallway) WITHOUT the user's instruction?
3.  **Unrequested Arc Reports**: Did the AI introduce arc summarization, that were not prompted or requested by the user?

Consider these guidelines while making your assessment:
1.  **Direct User Requests Override Violations**: If the user explicitly requested a time skip, location change, or new plot point, then it is allowed.
2.  **Subtle User Hints Count**: If the user hinted at a change (e.g., "Let's move to the next scene", "What happens later?"), then it is allowed.
3.  **Follow the context, and estimate if the user gave implicit permission for any of the above changes. If the user input suggests a change (e.g., "We should head to the library", "let's enter it for now(the location already suggested/mentioned in the story)"), then it is allowed.
4.  **Always allow the CLOCK TIME to change naturally as part of the story progression, if it changes in natural pace, it doesn't considered as time skip, unless the user specifically requested to keep it the same. Only consider it a violation if the skip is more than 4 hours ahead without user permission.
5.  **compare the details of the location/scene before and after the AI response, if they are mostly the same with minor changes (e.g., adding more description), it is allowed.
6.  * Always allow sub-location changes within the same main location (e.g., moving from "the library" to "the library's reading room") without user permission.

**Your task:**
- If the AI's response is a direct narration or consequence of the user's input, it is compliant.
- If the AI's response introduces any of the violations listed above without user permission, it is non-compliant.
- Your response must start with either "COMPLIANT" or "NON-COMPLIANT".
- If compliant, respond ONLY with "COMPLIANT".
- If NON-COMPLIANT, respond with "NON-COMPLIANT" and a brief explanation of the violation (e.g., "The AI changed the location from the library to the courtyard without being asked.").

Provide your verdict now.`;

    try {
      console.log(`[Proofreader] Using provider: ${providerConfig.provider}, model: ${providerConfig.modelName}`);
      const text = await AIProvider.generateContent(providerConfig, {
        messages: [{ role: "user", content: prompt }],
      });

      const trimmedText = text.trim();

      if (trimmedText.startsWith("COMPLIANT")) {
        console.log("[Proofreader] Response is compliant.");
        return { isCompliant: true, feedback: null };
      } else {
        // Remove the "NON-COMPLIANT" line to get only the feedback.
        const feedback = trimmedText.replace(/^NON-COMPLIANT\s*/, '').trim();
        console.log(`[Proofreader] Response is NON-COMPLIANT. Feedback: ${feedback}`);
        return { isCompliant: false, feedback: feedback || "The response was non-compliant, but no specific feedback was provided." };
      }
    } catch (error) {
      console.error("Proofreader agent failed:", error);
      // If the proofreader fails, we assume the response is compliant to avoid blocking the user.
      return { isCompliant: true, feedback: null };
    }
  }
}
