import { AIProvider, type AIProviderConfig } from "../ai-provider";

export class SummaryAgent {
  constructor() { }

  async summarizeForMemory(messages: string[], location: string, providerConfig: AIProviderConfig): Promise<string> {
    const text = messages.map(m => `- ${m}`).join("\n");
    const prompt = `Create a summary of the following scene. The summary MUST begin with a "Header:" line containing the provided scene location.

Scene Location: ${location}

Conversation Snippet:
---
${text}
---

Summary:
Header: ${location}
`;

    try {
      console.log(`[SummaryAgent] Using provider: ${providerConfig.provider}, model: ${providerConfig.modelName}`);
      const result = await AIProvider.generateContent(providerConfig, {
        messages: [{ role: "user", content: prompt }],
      });
      return result || text;
    } catch (err: any) {
      console.error("Failed to summarize:", err);
      return `Summary of conversation at ${location}: ${messages.join(" ... ")}`;
    }
  }
}
