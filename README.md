# Interactive StorygenAI

A sophisticated, agent-driven AI storytelling platform designed for immersive roleplay and narrative generation. This project leverages a multi-agent architecture orchestrated by a central intelligence to deliver consistent, high-quality, and context-aware stories.

## 🧠 Core Architecture

This project uses a specialized multi-agent system to handle story generation:

-   **Orchestrator Agent:** The central "brain" that manages the flow of conversation, handles user requests, and coordinates other agents.
-   **Smart RAG (Retrieval-Augmented Generation):** A dedicated agent (`SmartRagAgent`) that intelligently retrieves and filters past story events. It uses both keyword and semantic search (via `pgvector`) to find relevant memories and then uses a refined LLM prompt to extract *only* the strictly necessary context for the current scene.
-   **Generation Agent:** Specialized in crafting creative, vivid, and engaging narrative prose based on the current context and user input.
-   **Proofreader Agent:** Automatically reviews generated content for quality, consistency, and safety before it reaches the user. If the content falls short, it triggers a regeneration loop with feedback.
-   **Query & Memory Agents:** Handle the storage and retrieval of vector embeddings, ensuring the AI "remembers" important details from long ago.

## 🚀 Key Features

-   **Infinite Context Memory:** By utilizing vector database storage (Neon/PostgreSQL), the system can recall details from the very beginning of the story without hitting token limits.
-   **Dynamic Location Tracking:** The Orchestrator automatically tracks and updates the narrative's current location (e.g., "Heizen Academy - Classroom 1-A | Morning") to maintain spatial consistency.
-   **Self-Correcting Narratives:** The Proofreader Agent ensures that the story stays on track and adheres to your quality standards.
-   **Deep Customization:**
    -   **Behavior Prompts:** Define the AI's personality (e.g., "Dark Fantasy DM", "Sci-Fi Narrator").
    -   **Framework Templates:** Control the output structure (dialogue formatting, stat blocks, etc.).
    -   **Lore & Characters:** Support for loading custom world lore and character presets.
-   **Modern Chat Interface:**
    -   Built with **React** and **Tailwind CSS**.
    -   Dark/Light mode support.
    -   Distraction-free reading experience optimized for long-form text.

## 🛠️ Tech Stack

-   **Frontend:** React (Vite), Tailwind CSS, Radix UI, TanStack Query.
-   **Backend:** Node.js, Express.js.
-   **AI Model:** Google Gemini (Gemini 1.5 Pro / Flash).
-   **Database:** PostgreSQL (Neon) with `pgvector` extension for semantic search.
-   **ORM:** Drizzle ORM.
-   **Language:** TypeScript (Full Stack).

## 📦 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/Interactive-StorygenAI.git
    cd Interactive-StorygenAI
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory (use `.env.template` as a reference if available).
    ```env
    DATABASE_URL=postgres://user:password@host:port/database
    GEMINI_API_KEY=your_google_gemini_api_key
    ```
    *Note: The `DATABASE_URL` must point to a PostgreSQL instance that supports `pgvector` (e.g., Neon.tech).*

4.  **Database Setup:**
    Push the database schema:
    ```bash
    npm run db:push
    ```

5.  **Run the Application:**
    Start the development server:
    ```bash
    npm run dev
    ```
    The application will run on `http://localhost:5000` (or similar port).

## 🛡️ License

MIT License