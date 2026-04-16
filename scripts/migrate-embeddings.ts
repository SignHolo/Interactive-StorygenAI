import { Pool } from '@neondatabase/serverless';
import ws from "ws";

/**
 * Migrates the existing text-based embedding column to pgvector type.
 * Run with: npx tsx --env-file=.env scripts/migrate-embeddings.ts
 */
async function migrateEmbeddings() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("❌ DATABASE_URL is not set. Run with: npx tsx --env-file=.env scripts/migrate-embeddings.ts");
        process.exit(1);
    }

    console.log("🚀 Starting embedding column migration...");

    const pool = new Pool({
        connectionString: databaseUrl,
        webSocketConstructor: ws
    });

    try {
        const client = await pool.connect();
        console.log("✅ Connected to the database.");

        // Drop old text-based embedding column from memory_logs and re-add as vector
        console.log("📦 Migrating memory_logs.embedding from text → vector(768)...");
        await client.query('ALTER TABLE memory_logs DROP COLUMN IF EXISTS embedding;');
        await client.query('ALTER TABLE memory_logs ADD COLUMN embedding vector(768);');
        console.log("✅ memory_logs.embedding migrated.");

        client.release();
        console.log("\n🎉 Migration complete! You can now run: npm run db:push");
    } catch (error: any) {
        console.error("❌ Migration failed:", error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrateEmbeddings();
