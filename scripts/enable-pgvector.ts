import { Pool } from '@neondatabase/serverless';
import ws from "ws";

/**
 * Script to enable pgvector extension in the PostgreSQL database.
 * Run with: npx tsx --env-file=.env scripts/enable-pgvector.ts
 */
async function enablePgVector() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("❌ DATABASE_URL is not set. Run with: npx tsx --env-file=.env scripts/enable-pgvector.ts");
        process.exit(1);
    }

    console.log("🚀 Attempting to enable pgvector extension...");

    const pool = new Pool({
        connectionString: databaseUrl,
        webSocketConstructor: ws
    });

    try {
        const client = await pool.connect();
        console.log("✅ Connected to the database.");

        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log("✅ Successfully enabled 'vector' extension.");

        client.release();
    } catch (error: any) {
        console.error("❌ Failed to enable pgvector extension:");
        console.error(error.message);

        if (error.message.includes("permission denied")) {
            console.error("\n💡 Tip: If you are using Neon, the 'vector' extension should be available. Please check your Neon dashboard or contact support.");
        }

        process.exit(1);
    } finally {
        await pool.end();
    }
}

enablePgVector();
