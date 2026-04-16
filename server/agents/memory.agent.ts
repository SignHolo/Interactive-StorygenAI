import { AIProvider, type AIProviderConfig } from "../ai-provider";

/**
 * Gets embedding for text using the configured AI provider
 */
export async function getEmbedding(text: string, providerConfig: AIProviderConfig): Promise<number[]> {
  try {
    return await AIProvider.getEmbedding(providerConfig, text);
  } catch (error) {
    console.error("Error getting embedding:", error);
    throw error;
  }
}

/**
 * Memory Agent class for managing memories and embeddings
 */
export class MemoryAgent {
  private providerConfig: AIProviderConfig | undefined;

  constructor(providerConfig?: AIProviderConfig) {
    this.providerConfig = providerConfig;
  }

  async getEmbedding(text: string) {
    if (!this.providerConfig) {
      throw new Error("AI provider config not set for MemoryAgent");
    }
    return getEmbedding(text, this.providerConfig);
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.providerConfig) {
      throw new Error("AI provider config not set for MemoryAgent");
    }
    return AIProvider.batchGetEmbeddings(this.providerConfig, texts);
  }

  /**
   * Finds relevant memories based on similarity to the query
   */
  async findRelevantMemories(query: string, memoryPool: Array<{ content: string; embedding: string }>, topK: number = 3) {
    const queryEmbedding = await this.getEmbedding(query);

    // Calculate cosine similarity between query and all memories
    const similarities = memoryPool.map(memory => {
      const memoryEmbedding = JSON.parse(memory.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, memoryEmbedding);
      return {
        ...memory,
        similarity
      };
    });

    // Sort by similarity and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Calculates cosine similarity between two vectors
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, val, idx) => sum + val * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }
}