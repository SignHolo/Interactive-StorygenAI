# Interactive StorygenAI: An Agentic Storytelling Engine 🧠🎭

Interactive StorygenAI is a sophisticated, multi-agent "Harness" designed to power immersive, high-accuracy, long-form storytelling. Unlike simple AI wrappers, this project utilizes a coordinated network of specialized agents to exceed the technical limitations of native LLM context windows, aiming for zero hallucinations and persistent narrative consistency.

## 🌟 Core Philosophy
- **Infinite Context:** Using hybrid vector-based memory (`pgvector`) to maintain story continuity over thousands of messages.
- **Agentic Precision:** Decoupling generation, memory retrieval, and quality control into specialized agents.
- **Narrative Persistence:** Tracking world state, locations, and character lore as structured data to prevent "narrative drift".

---

## 🧠 Multi-Agent Architecture
The system is orchestrated by a central "brain" that coordinates several specialized agents:

1.  **Orchestrator Agent**: The central coordination layer that manages the conversation flow and delegates tasks to specialized sub-agents.
2.  **Smart RAG Agent**: An advanced retrieval-augmented generation layer. It doesn't just fetch context; it uses an LLM to filter and summarize only the *strictly necessary* memories for the current scene, keeping prompts clean and focused.
3.  **Generation Agent**: Specialized in crafting vivid, engaging narrative prose. Supports specialized logic for **Gemma** models.
4.  **Proofreader Agent**: The "Editor" that reviews every generated response for consistency, safety, and quality. If it detects a hallucination or error, it triggers a self-correction loop.
5.  **Classification Agent**: Analyzes user intent to help the orchestrator decide the best course of action (e.g., character interaction vs. world lore query).
6.  **Memory & Query Agents**: Handle the storage and semantic retrieval of episodic and semantic memories using vector embeddings.
7.  **Summary Agent**: Periodically condenses historical context into high-level summaries to maintain a secondary layer of long-term awareness.

---

## 🛠️ Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, TanStack Query, Radix UI.
- **Backend**: Node.js, Express.js.
- **AI Providers**: 
    - **Google Gemini**: Primary support for Gemini 1.5 Pro & Flash.
    - **OpenAI**: Compatible with GPT-4 and OpenAI-compatible APIs (like Mistral).
    - **Anthropic**: Support for Claude 3.5 Sonnet & Opus.
- **Database**: PostgreSQL (Neon) with the `pgvector` extension for semantic memory.
- **ORM**: Drizzle ORM.

---

## 🚀 Key Features
- **Zero-Hallucination Goal**: Automated proofreading loops that validate AI responses against the established story history.
- **Dynamic Location Tracking**: Automatically extracts and updates the current narrative location (e.g., "Heizen Academy - Afternoon").
- **Customizable Playstyles**:
    - **Behavior Prompts**: Fine-tune the AI's personality (e.g., Dark Fantasy, Sci-Fi, Whimsical).
    - **Lore & Character Presets**: Load custom world-building data for consistent roleplay.
- **Per-Agent Model Selection**: Configure different models for each role (e.g., Claude for generation, Gemini Flash for RAG).

---

##  Installation & Setup

1.  **Clone & Install**:
    ```bash
    git clone https://github.com/SignHolo/Interactive-StorygenAI
    cd Interactive-StorygenAI
    npm install
    ```

2.  **Environment Setup**:
    Create a `.env` file from the template and add your API keys:
    ```env
    DATABASE_URL=your_postgresql_url
    GEMINI_API_KEY=your_key
    OPENAI_API_KEY=your_key (optional)
    ANTHROPIC_API_KEY=your_key (optional)
    ```

3.  **Database Configuration**:
    Enable `pgvector` and push the schema:
    ```bash
    npx tsx scripts/enable-pgvector.ts
    npm run db:push
    ```

4.  **Launch**:
    ```bash
    npm run dev
    ```

---

## 🛡️ License
MIT License