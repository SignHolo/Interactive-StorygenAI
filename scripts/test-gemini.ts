import { GoogleGenerativeAI } from "@google/generative-ai";

// Check if API key is provided via environment variable
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "YOUR_API_KEY";

if (apiKey === "YOUR_API_KEY") {
    console.error("❌ Error: API key not found.");
    console.error("Please set GEMINI_API_KEY or GOOGLE_API_KEY in your .env file.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function runTest() {
    console.log("🚀 Starting Gemini API Test...\n");

    // 1. List Models
    // Note: The Node.js SDK (GoogleGenerativeAI) does not currently expose listModels directly on the client instance.
    // We use the REST API for this test to list available models.
    try {
        console.log("📋 Fetching available models (via REST API)...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ Success! Found ${data.models?.length || 0} models.`);

        // Display all models
        if (data.models && data.models.length > 0) {
            console.log("All available models:");
            data.models.forEach((m: any) => {
                console.log(` - ${m.name.replace('models/', '')} (${m.displayName})`);
            });
        }
    } catch (error: any) {
        console.error("❌ Failed to list models:", error.message);
    }

    console.log("\n-----------------------------------\n");

    /*
    // 2. Test Generation
    try {
        const modelName = "gemini-2.0-flash"; // Using a newer available model
        console.log(`🤖 Testing content generation with model: ${modelName}...`);

        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello! Please reply with 'Gemini is working!' if you receive this.");
        const response = await result.response;
        const text = response.text();

        console.log("✅ Generation Successful!");
        console.log("Response:", text.trim());
    } catch (error: any) {
        console.error("❌ Failed to generate content:", error.message);
        console.error("Details:", error);
    }
    */
}

runTest().then(() => {
    // Keep terminal open
    console.log("\nPress any key to exit...");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
});
