import 'dotenv/config';
import { OrchestratorAgent } from "./server/agents/orchestrator.agent";
import { storage } from "./server/storage";
import { Message } from "./shared/schema";
import { getEmbedding } from "./server/agents/memory.agent";

async function setupTestData() {
    await storage.deleteAllMessages();
    console.log("All messages deleted.");

    // Create mock messages
    const mockMessages: Partial<Message>[] = [
        {
            role: 'assistant',
            content: 'The sky is blue in the village.',
            location: 'Village',
        },
        {
            role: 'user',
            content: 'I look at the sky.',
            location: 'Village',
        },
        {
            role: 'assistant',
            content: 'You see a bird flying in the forest.',
            location: 'Forest',
        },
        {
            role: 'user',
            content: 'I follow the bird.',
            location: 'Forest',
        }
    ];

    for (const msg of mockMessages) {
        await storage.createMessage(msg as any);
    }

    // Create mock memory logs
    const memory1Content = "The sky is blue in the village.";
    const memory1Embedding = await getEmbedding(memory1Content, process.env.GEMINI_API_KEY);
    await storage.createMemoryLog({
        content: memory1Content,
        summary: "The sky is blue in the village.",
        location: "Village",
        entity_name: "sky",
        type: "OBSERVATION",
        importance: 1,
        embedding: JSON.stringify(memory1Embedding),
    });

    const memory2Content = "You see a bird flying in the forest.";
    const memory2Embedding = await getEmbedding(memory2Content, process.env.GEMINI_API_KEY);
    await storage.createMemoryLog({
        content: memory2Content,
        summary: "A bird is in the forest.",
        location: "Forest",
        entity_name: "bird",
        type: "OBSERVATION",
        importance: 5,
        embedding: JSON.stringify(memory2Embedding),
    });
}

async function testOrchestrator() {
    console.log("Setting up test data...");
    await setupTestData();
    console.log("Test data set up.");

    const orchestrator = new OrchestratorAgent();

    const userMessage = "What color is the sky?";
    const conversationHistory: Message[] = [];

    console.log(`\n--- Running OrchestratorAgent with message: "${userMessage}" ---\n`);

    const result = await orchestrator.handleRequest(userMessage, conversationHistory, process.env.GEMINI_API_KEY);

    console.log("\n--- OrchestratorAgent finished ---");
    console.log("Final response:", result);
}

testOrchestrator().catch(console.error);
