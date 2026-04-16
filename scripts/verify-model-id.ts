import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "YOUR_API_KEY";
const genAI = new GoogleGenerativeAI(apiKey);

async function verifyModel() {
    const modelId = "gemini-exp-1206";
    console.log(`Testing model ID: ${modelId} (The correct ID for Gemini 2.0 Pro Experimental)`);
    try {
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent("Respond with 'Confirmed' if you are working.");
        const response = await result.response;
        console.log(`✅ Success! Response: ${response.text()}`);
    } catch (error: any) {
        console.error(`❌ Failed: ${error.message}`);
    }
}

verifyModel().then(() => {
    // Keep terminal open
    console.log("\nPress any key to exit...");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
});
