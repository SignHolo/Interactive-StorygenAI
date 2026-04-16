import { db } from "./db";
import { messages } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Performs semantic search on messages using pgvector's cosine distance operator
 * @param queryEmbedding The embedding vector of the query
 * @param limit Maximum number of results to return
 * @returns Messages ordered by semantic similarity
 */
export async function searchMessagesByVectorSimilarity(
    queryEmbedding: number[],
    limit: number = 15
) {
    // Convert embedding array to pgvector format string
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Use pgvector's <=> operator for cosine distance (lower is more similar)
    const results = await db
        .select()
        .from(messages)
        .where(sql`${messages.embedding} IS NOT NULL`)
        .orderBy(sql`${messages.embedding} <=> ${embeddingStr}::vector`)
        .limit(limit);

    return results;
}

/**
 * Performs semantic search with a similarity threshold
 * @param queryEmbedding The embedding vector of the query
 * @param similarityThreshold Minimum similarity score (0-1, higher is more similar)
 * @param limit Maximum number of results to return
 */
export async function searchMessagesByVectorWithThreshold(
    queryEmbedding: number[],
    similarityThreshold: number = 0.7,
    limit: number = 15
) {
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    // Calculate cosine similarity: 1 - cosine_distance
    const results = await db
        .select({
            id: messages.id,
            role: messages.role,
            content: messages.content,
            location: messages.location,
            createdAt: messages.createdAt,
            similarity: sql<number>`1 - (${messages.embedding} <=> ${embeddingStr}::vector)`,
        })
        .from(messages)
        .where(sql`${messages.embedding} IS NOT NULL AND (1 - (${messages.embedding} <=> ${embeddingStr}::vector)) > ${similarityThreshold}`)
        .orderBy(sql`${messages.embedding} <=> ${embeddingStr}::vector`)
        .limit(limit);

    return results;
}
