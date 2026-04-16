import { MemoryAgent } from "./memory.agent";
import type { Message, MemoryLog } from "@shared/schema";
import { storage } from "../storage";
import type { AIProviderConfig } from "../ai-provider";
import { searchMessagesByVectorSimilarity } from "../pgvector-utils";

export class QueryAgent {
  private memoryAgent: MemoryAgent;

  constructor() {
    this.memoryAgent = new MemoryAgent();
  }

  public async queryMessages(query: string, providerConfig: AIProviderConfig, precomputedEmbedding?: number[]): Promise<Message[]> {
    this.memoryAgent = new MemoryAgent(providerConfig);

    // Get all messages to search through
    const allMessages = await storage.getAllMessages();

    if (allMessages.length === 0) {
      return [];
    }

    console.log(`[QueryAgent] Starting query for: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
    console.log(`[QueryAgent] Total messages in database: ${allMessages.length}`);

    // Perform keyword-based search (which already handles the complex logic)
    const keywordBasedResults = await this.keywordSearch(query, allMessages);
    console.log(`[QueryAgent] Keyword-based search returned: ${keywordBasedResults.length} messages`);

    // Perform semantic search for additional context (reuse precomputed embedding if available)
    const semanticSearchResults = await this.semanticSearch(query, allMessages, precomputedEmbedding);
    console.log(`[QueryAgent] Semantic search returned: ${semanticSearchResults.length} messages`);

    // Combine and deduplicate results, prioritizing keyword matches
    const combinedResults = [...keywordBasedResults];

    // Add semantic results that aren't already in keyword results
    const existingIds = new Set(combinedResults.map(m => m.id));
    let addedFromSemantic = 0;
    for (const message of semanticSearchResults) {
      if (!existingIds.has(message.id)) {
        combinedResults.push(message);
        addedFromSemantic++;
      }
    }
    console.log(`[QueryAgent] Added ${addedFromSemantic} unique messages from semantic search`);
    console.log(`[QueryAgent] Final combined results: ${combinedResults.length} messages`);

    return combinedResults;
  }

  private async keywordSearch(query: string, allMessages: Message[]): Promise<Message[]> {
    const keywords = this.extractKeywords(query);
    console.log(`[QueryAgent] Extracted keywords: ${JSON.stringify(keywords)}`);

    if (keywords.length === 0) {
      return allMessages.slice(-5);
    }

    // Search for each keyword independently
    const keywordLimit = Math.ceil(15 / keywords.length);
    const allKeywordMatches = new Map<string, Message[]>();

    for (const keyword of keywords) {
      const matches = allMessages.filter(msg =>
        msg.content.toLowerCase().includes(keyword.toLowerCase())
      );

      // Sort matches by recency (most recent first)
      const sortedMatches = matches.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      allKeywordMatches.set(keyword, sortedMatches.slice(0, keywordLimit));
    }

    // Collect all unique messages across all keywords
    const uniqueMessages = new Map<string, Message>(); // messageId -> Message

    allKeywordMatches.forEach((matches) => {
      matches.forEach((message) => {
        // Ensure each message is only added once, even if it matches multiple keywords
        if (!uniqueMessages.has(message.id)) {
          uniqueMessages.set(message.id, message);
        }
      });
    });

    return Array.from(uniqueMessages.values());
  }

  private extractKeywords(query: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP techniques
    // Remove common stop words and extract meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did'
    ]);

    // Extract words (remove punctuation and split)
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Return unique keywords
    return Array.from(new Set(words));
  }

  private async semanticSearch(query: string, allMessages: Message[], precomputedEmbedding?: number[]): Promise<Message[]> {
    try {
      // 1. Use precomputed embedding if available, otherwise generate one
      const queryEmbedding = precomputedEmbedding || await this.memoryAgent.getEmbedding(query);
      if (precomputedEmbedding) {
        console.log(`[QueryAgent] Reusing precomputed embedding for semantic search.`);
      }
      
      // 2. Search database utilizing pgvector `<=>` index directly
      console.log(`[QueryAgent] Querying pgvector for top matches...`);
      const results = await searchMessagesByVectorSimilarity(queryEmbedding, 15);
      
      // Because searchMessagesByVectorSimilarity might return raw messages directly from query,
      // we just return them. Keyword search will layer on top.
      return results as Message[];
      
    } catch (error) {
      console.warn("PGVector semantic search failed (likely DB issue or missing embedding array), falling back to keyword search:", error);
      return []; // Return empty array, keyword search will provide results
    }
  }

}
