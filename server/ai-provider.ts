import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, type Content } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AIProviderType = "gemini" | "openai" | "anthropic" | "gemma";

export interface AIProviderConfig {
    provider: AIProviderType;
    apiKey: string;
    modelName: string;
    baseUrl?: string | null; // For OpenAI-compatible providers
    fallbackGeminiKey?: string; // Always populated so embeddings can fallback to Gemini
}

export interface GenerateOptions {
    systemInstruction?: string;
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * The embedding dimension used across the database (pgvector columns in messages & memory_logs).
 * All embedding providers MUST output vectors of exactly this size.
 */
export const EMBEDDING_DIMENSIONS = 3072;

/** Known Gemini models that support the embedding endpoint. */
const GEMINI_EMBED_MODELS = [
    "embedding-001",
    "gemini-embedding-001",
    "text-embedding-004",
    "embedding",
];

// ─── Safety Settings (Gemini) ────────────────────────────────────────────────

const geminiSafetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ─── AI Provider ──────────────────────────────────────────────────────────────

export class AIProvider {

    /**
     * Generate text content using Gemini, OpenAI, or Anthropic SDK.
     */
    static async generateContent(config: AIProviderConfig, options: GenerateOptions): Promise<string> {
        if (config.provider === "openai") {
            return AIProvider.generateWithOpenAI(config, options);
        } else if (config.provider === "anthropic") {
            return AIProvider.generateWithAnthropic(config, options);
        }
        // For "gemma" provider: generation is handled by GemmaProvider in the orchestrator.
        // But if a non-generation agent (utility/summary) falls through here with gemma,
        // we use the Gemini SDK as a fallback since the API is compatible for simple tasks.
        return AIProvider.generateWithGemini(config, options);
    }

    /**
     * Get a single embedding vector.
     * Tries the user-selected model first. If the result has wrong dimensions
     * or the call fails, automatically falls back to Gemini gemini-embedding-001.
     */
    static async getEmbedding(config: AIProviderConfig, text: string): Promise<number[]> {
        // ── Step 1: Try the user's selected embedding model ──
        try {
            let embedding: number[];
            if (config.provider === "openai") {
                embedding = await AIProvider.getEmbeddingOpenAI(config, text);
            } else if (config.provider === "anthropic") {
                // Anthropic has no embedding API — skip straight to fallback
                throw new Error("Anthropic does not support embeddings; triggering Gemini fallback.");
            } else {
                embedding = await AIProvider.getEmbeddingGemini(config, text);
            }

            // Validate dimensions
            if (embedding.length === EMBEDDING_DIMENSIONS) {
                return embedding;
            }

            console.warn(
                `[AIProvider] Embedding dimension mismatch: got ${embedding.length}, expected ${EMBEDDING_DIMENSIONS}. Falling back to Gemini.`
            );
        } catch (err: any) {
            console.warn(`[AIProvider] Primary embedding failed: ${err.message}. Falling back to Gemini.`);
        }

        // ── Step 2: Fallback to Gemini gemini-embedding-001 ──
        return AIProvider.fallbackGeminiEmbedding(config, text);
    }

    /**
     * Get batch embeddings.
     * Tries the user-selected model first. Falls back to Gemini on error or dimension mismatch.
     */
    static async batchGetEmbeddings(config: AIProviderConfig, texts: string[]): Promise<number[][]> {
        // ── Step 1: Try the user's selected embedding model ──
        try {
            let embeddings: number[][];
            if (config.provider === "openai") {
                embeddings = await AIProvider.batchGetEmbeddingsOpenAI(config, texts);
            } else if (config.provider === "anthropic") {
                throw new Error("Anthropic does not support embeddings; triggering Gemini fallback.");
            } else {
                embeddings = await AIProvider.batchGetEmbeddingsGemini(config, texts);
            }

            // Validate dimensions (check the first vector)
            if (embeddings.length > 0 && embeddings[0].length === EMBEDDING_DIMENSIONS) {
                return embeddings;
            }

            console.warn(
                `[AIProvider] Batch embedding dimension mismatch: got ${embeddings[0]?.length}, expected ${EMBEDDING_DIMENSIONS}. Falling back to Gemini.`
            );
        } catch (err: any) {
            console.warn(`[AIProvider] Primary batch embedding failed: ${err.message}. Falling back to Gemini.`);
        }

        // ── Step 2: Fallback to Gemini gemini-embedding-001 ──
        return AIProvider.fallbackGeminiBatchEmbedding(config, texts);
    }

    // ─── Gemini Embedding Fallback ──────────────────────────────────────────────

    private static async fallbackGeminiEmbedding(config: AIProviderConfig, text: string): Promise<number[]> {
        const geminiKey = config.fallbackGeminiKey || process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            throw new Error(
                "Embedding fallback failed: No Gemini API key available. " +
                "Please add a Google AI API key in Settings to enable automatic embedding fallback."
            );
        }

        console.log(`[AIProvider] ⤷ Fallback: using Gemini gemini-embedding-001 (${EMBEDDING_DIMENSIONS}d)`);
        const fallbackConfig: AIProviderConfig = {
            provider: "gemini",
            apiKey: geminiKey,
            modelName: "gemini-embedding-001",
        };
        return AIProvider.getEmbeddingGemini(fallbackConfig, text);
    }

    private static async fallbackGeminiBatchEmbedding(config: AIProviderConfig, texts: string[]): Promise<number[][]> {
        const geminiKey = config.fallbackGeminiKey || process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            throw new Error(
                "Embedding fallback failed: No Gemini API key available. " +
                "Please add a Google AI API key in Settings to enable automatic embedding fallback."
            );
        }

        console.log(`[AIProvider] ⤷ Fallback: using Gemini gemini-embedding-001 for ${texts.length} texts (${EMBEDDING_DIMENSIONS}d)`);
        const fallbackConfig: AIProviderConfig = {
            provider: "gemini",
            apiKey: geminiKey,
            modelName: "gemini-embedding-001",
        };
        return AIProvider.batchGetEmbeddingsGemini(fallbackConfig, texts);
    }

    // ─── Gemini Implementation ──────────────────────────────────────────────────

    private static async generateWithGemini(config: AIProviderConfig, options: GenerateOptions): Promise<string> {
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const model = genAI.getGenerativeModel({
            model: config.modelName,
            safetySettings: geminiSafetySettings,
        });

        // Build Gemini-format contents
        const contents: Content[] = [];

        // Collect system text from systemInstruction and any system-role messages
        let systemText = options.systemInstruction || "";

        for (const msg of options.messages) {
            if (msg.role === "system") {
                systemText += `\n${msg.content}`;
                continue;
            }

            const role = msg.role === "assistant" ? "model" : "user";
            contents.push({ role, parts: [{ text: msg.content }] });
        }

        // Inject system instructions into the first user message for better adherence
        if (systemText) {
            if (contents.length > 0 && contents[0].role === "user") {
                contents[0].parts[0].text = `${systemText}\n\n---\n\n${contents[0].parts[0].text}`;
            } else {
                contents.unshift({ role: "user", parts: [{ text: systemText }] });
            }
        }

        const result = await model.generateContent({ contents });

        // Check for safety blocks
        if (
            result.response.promptFeedback?.blockReason === "SAFETY" ||
            result.response.candidates?.[0]?.finishReason === "SAFETY"
        ) {
            return "Sorry, the response generation was blocked due to detected content that violates the policy. Please try adjusting or changing your prompt.";
        }

        return result.response.text() || "I couldn't generate a response. Please try again.";
    }

    private static async getEmbeddingGemini(config: AIProviderConfig, text: string): Promise<number[]> {
        const genAI = new GoogleGenerativeAI(config.apiKey);

        // Validate / fallback to a known embedding model
        let modelName = config.modelName;
        if (!GEMINI_EMBED_MODELS.some(m => modelName.includes(m))) {
            console.warn(`[AIProvider] Model '${modelName}' does not support embedContent. Falling back to 'gemini-embedding-001'.`);
            modelName = "gemini-embedding-001";
        }

        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.embedContent({
            content: { role: "user", parts: [{ text }] },
        });

        return result.embedding.values;
    }

    private static async batchGetEmbeddingsGemini(config: AIProviderConfig, texts: string[]): Promise<number[][]> {
        const genAI = new GoogleGenerativeAI(config.apiKey);

        // Validate / fallback to a known embedding model
        let modelName = config.modelName;
        if (!GEMINI_EMBED_MODELS.some(m => modelName.includes(m))) {
            console.warn(`[AIProvider] Model '${modelName}' does not support batchEmbedContents. Falling back to 'gemini-embedding-001'.`);
            modelName = "gemini-embedding-001";
        }

        const model = genAI.getGenerativeModel({ model: modelName });
        const requests = texts.map((text) => ({
            content: { role: "user" as const, parts: [{ text }] },
        }));
        const result = await model.batchEmbedContents({ requests });
        return result.embeddings.map((embedding) => embedding.values);
    }

    // ─── OpenAI Implementation ─────────────────────────────────────────────────

    private static async generateWithOpenAI(config: AIProviderConfig, options: GenerateOptions): Promise<string> {
        const openai = new OpenAI({
            apiKey: config.apiKey,
            ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
        });

        // Build OpenAI-format messages
        const messages: OpenAI.ChatCompletionMessageParam[] = [];

        if (options.systemInstruction) {
            messages.push({ role: "system", content: options.systemInstruction });
        }

        for (const msg of options.messages) {
            if (msg.role === "system") {
                messages.push({ role: "system", content: msg.content });
            } else {
                messages.push({ role: msg.role, content: msg.content });
            }
        }

        const response = await openai.chat.completions.create({
            model: config.modelName,
            messages,
        });

        return response.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
    }

    private static async getEmbeddingOpenAI(config: AIProviderConfig, text: string): Promise<number[]> {
        const openai = new OpenAI({
            apiKey: config.apiKey,
            ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
        });

        console.log(`[AIProvider] OpenAI embedding: model=${config.modelName}, dimensions=${EMBEDDING_DIMENSIONS}`);

        const response = await openai.embeddings.create({
            model: config.modelName,
            input: text,
            dimensions: EMBEDDING_DIMENSIONS,
        });

        return response.data[0].embedding;
    }

    private static async batchGetEmbeddingsOpenAI(config: AIProviderConfig, texts: string[]): Promise<number[][]> {
        const openai = new OpenAI({
            apiKey: config.apiKey,
            ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
        });

        console.log(`[AIProvider] OpenAI batch embedding: model=${config.modelName}, count=${texts.length}, dimensions=${EMBEDDING_DIMENSIONS}`);

        const response = await openai.embeddings.create({
            model: config.modelName,
            input: texts,
            dimensions: EMBEDDING_DIMENSIONS,
        });

        // Sort by index to maintain order
        return response.data
            .sort((a, b) => a.index - b.index)
            .map(item => item.embedding);
    }

    // ─── Anthropic Implementation ──────────────────────────────────────────────

    private static async generateWithAnthropic(config: AIProviderConfig, options: GenerateOptions): Promise<string> {
        const anthropic = new Anthropic({
            apiKey: config.apiKey,
        });

        // Build Anthropic-format messages
        const messages: Anthropic.MessageParam[] = [];

        for (const msg of options.messages) {
            if (msg.role === "system") {
                // System messages are handled via the `system` parameter, skip here
                continue;
            }
            messages.push({
                role: msg.role === "assistant" ? "assistant" : "user",
                content: msg.content,
            });
        }

        // Collect system text
        let systemText = options.systemInstruction || "";
        for (const msg of options.messages) {
            if (msg.role === "system") {
                systemText += `\n${msg.content}`;
            }
        }

        const response = await anthropic.messages.create({
            model: config.modelName,
            max_tokens: 8192,
            ...(systemText.trim() ? { system: systemText.trim() } : {}),
            messages,
        });

        // Extract text from response content blocks
        const textBlocks = response.content.filter(block => block.type === "text");
        return textBlocks.map(block => block.text).join("") || "I couldn't generate a response. Please try again.";
    }
}

// ─── Config Builder ──────────────────────────────────────────────────────────

export interface SettingsForAI {
    aiProvider: string;
    geminiApiKey?: string | null;
    openaiApiKey?: string | null;
    openaiBaseUrl?: string | null;
    anthropicApiKey?: string | null;
    generationModel: string;
    ragModel: string;
    proofreaderModel: string;
    utilityModel: string;
    embeddingModel: string;
}

export function buildProviderConfig(
    settings: SettingsForAI,
    role: "generation" | "rag" | "proofreader" | "utility" | "embedding"
): AIProviderConfig {
    const provider = (settings.aiProvider || "gemini") as AIProviderType;

    // Special case for embeddings: If Anthropic is selected, force fallback or error.
    // For now, if the provider is Anthropic and the role is embedding, we will throw an error 
    // closer to usage if the user hasn't selected a compatible model, 
    // BUT the provider selection is global. 
    // Ideally, we should allow per-agent provider selection, but the current UI suggests a global provider.
    // However, the `task.md` implies we are adding "model names for each agent role". 
    // If the user selects "Anthropic" globally, they must provide an Anthropic key. 
    // If they try to use it for embeddings, `AIProvider.getEmbedding` will throw.

    // Future improvement: Allow per-agent provider selection. 
    // Current constraint: Global provider toggle.

    let apiKey: string = "";
    if (provider === "openai") {
        apiKey = settings.openaiApiKey || "";
    } else if (provider === "anthropic") {
        apiKey = settings.anthropicApiKey || "";
    } else {
        // Default to Gemini (also handles "gemma" — same API key)
        apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || "";
    }

    if (!apiKey && role !== 'embedding') { // Allow empty key for embedding if we are going to fail anyway or if it's not used
        // Actually we should enforce key presence
        const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
        throw new Error(`${providerName} API key not configured. Please add it in Settings.`);
    }

    // Checking key for embedding specifically might be redundant if the method throws, but good for UX.
    if (!apiKey && role === 'embedding' && provider !== 'anthropic') {
        const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
        throw new Error(`${providerName} API key not configured for embeddings.`);
    }


    const modelMap: Record<string, string> = {
        generation: settings.generationModel,
        rag: settings.ragModel,
        proofreader: settings.proofreaderModel,
        utility: settings.utilityModel,
        embedding: settings.embeddingModel,
    };

    // Always include the Gemini key for embedding fallback, regardless of active provider
    const fallbackGeminiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY || "";

    return {
        provider,
        apiKey,
        modelName: modelMap[role],
        baseUrl: provider === "openai" ? settings.openaiBaseUrl : undefined,
        fallbackGeminiKey: fallbackGeminiKey || undefined,
    };
}
