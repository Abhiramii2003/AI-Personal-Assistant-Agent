# 🤖 AI Personal Assistant Agent — HTML + Node.js

A complete, beginner-friendly **AI Personal Assistant Agent** application built from scratch with **HTML5, CSS3, and JavaScript (Bootstrap 5)** on the frontend and **Node.js (Express)** on the backend.

This project is specifically designed to help you understand how **AI Agents**, **Tools**, **Planning**, **Agent Workflows**, and **Orchestration** work in practice with zero-build simplicity.

---

## 📚 Table of Contents

1. [What is an AI Agent?](#1-what-is-an-ai-agent)
2. [Agent vs Chatbot: What is the Difference?](#2-agent-vs-chatbot-what-is-the-difference)
3. [What is a Tool?](#3-what-is-a-tool)
4. [What is an Agent Workflow?](#4-what-is-an-agent-workflow)
5. [What is Orchestration?](#5-what-is-orchestration)
6. [System Architecture](#6-system-architecture)
7. [Project Structure](#7-project-structure)
8. [How the Agent Works (Step-by-Step Example)](#8-how-the-agent-works-step-by-step-example)
9. [Installation & Setup](#9-installation--setup)
10. [Running the Application](#10-running-the-application)
11. [Testing Checklist](#11-testing-checklist)
12. [In-Memory Storage Note](#12-in-memory-storage-note)
13. [Future Learning Roadmap](#13-future-learning-roadmap)

---

## 1. What is an AI Agent?

An **AI Agent** is an autonomous software system that goes beyond simply answering questions. It:

1. **Perceives** what you are asking for.
2. **Plans** a strategy to accomplish your goal.
3. **Decides** whether it needs to take external actions (using **Tools** like calculators, databases, calendars, or APIs).
4. **Executes** those tools to gather real, deterministic data.
5. **Synthesizes** the results into a clear, natural-language response.

```text
Perceive Request ──► Plan Action ──► Execute Tool ──► Synthesize Result ──► Deliver Answer
```

---

## 2. Agent vs Chatbot: What is the Difference?

| Feature | Traditional Chatbot | AI Agent |
| :--- | :--- | :--- |
| **Brain** | LLM predicts next words based purely on training weights. | LLM functions as a reasoning and planning engine. |
| **Real-time Data** | Cannot access current date, time, or external state unless hardcoded. | Invokes tools dynamically (e.g. `dateTime` tool) to get real-time facts. |
| **Accurate Math** | Frequently hallucinates arithmetic on large numbers. | Invokes a deterministic `calculator` tool to guarantee exact math. |
| **State Mutation** | Cannot take actions (cannot add or delete items in a task list). | Interacts with databases or APIs via tools (e.g. `taskManager`). |
| **Decision Flow** | Linear: Input ➔ LLM ➔ Output. | Orchestrated Loop: Input ➔ Plan ➔ Tool ➔ Observation ➔ Synthesis. |

---

## 3. What is a Tool?

A **Tool** is a standalone, deterministic function or API that the AI Agent can choose to run when text generation alone is insufficient.

```text
User Question
      ↓
LLM / Planner
      ↓
Tool Decision (e.g., "calculator")
      ↓
Tool Execution (e.g., 25 * 48)
      ↓
Tool Result (e.g., 1200)
      ↓
LLM Synthesizes Natural Answer
```

In this project, we provide 3 modular tools:
* **Calculator (`calculator.js`)**: Safely calculates expressions (+, -, *, /, %, ^) without using dangerous `eval()`.
* **Date & Time (`dateTime.js`)**: Returns the exact current date, time, and day of the week.
* **Task Manager (`taskManager.js`)**: Adds, lists, completes, and deletes tasks.

---

## 4. What is an Agent Workflow?

An **Agent Workflow** is the structured series of steps an agent follows to turn a user prompt into a final result:

```text
┌────────────────────────┐
│   1. User Message      │
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  2. Intent Planning    │ (Planner analyzes request and determines action)
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  3. Tool Selection     │ (Selects calculator, datetime, taskManager, or direct answer)
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  4. Tool Execution     │ (Runs safe JavaScript function and gets output)
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│  5. Response Synthesis │ (LLM converts raw tool data into friendly conversation)
└───────────┬────────────┘
            ▼
┌────────────────────────┐
│   6. Final Response    │ (Delivered to HTML UI with activity trace)
└────────────────────────┘
```

---

## 5. What is Orchestration?

**Orchestration** is the code logic that acts as the "conductor" of the agent. The LLM cannot execute tools on its own—it can only generate text.

The **Orchestration Layer (`agent.js`)**:
* Calls the **Planner** to decide *what* to do.
* Intercepts the planner's decision.
* Matches the decision to the **Tool Registry (`executor.js`)**.
* Calls the JavaScript tool function with safe parameters.
* Feeds the tool's result back to the LLM.
* Collects every step for the frontend activity log.

---

## 6. System Architecture

```text
┌────────────────────────────────────────────────────────┐
│             Vanilla HTML Frontend (Zero-Build)         │
│  - index.html (Semantic UI + Bootstrap 5)              │
│  - style.css  (Modern aesthetic & animations)          │
│  - app.js     (State, Fetch API, Live Activity Trace)  │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP POST /api/chat
                            │ { message, conversationHistory }
                            ▼
┌────────────────────────────────────────────────────────┐
│               Node.js + Express Backend                │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │           Agent Orchestrator (agent.js)        │   │
│   └───────┬────────────────────────────────┬───────┘   │
│           ▼                                ▼           │
│   ┌───────────────┐                ┌───────────────┐   │
│   │   Planner     │                │   Executor    │   │
│   │ (planner.js)  │                │ (executor.js) │   │
│   └───────┬───────┘                └───────┬───────┘   │
│           ▼                                ▼           │
│   ┌───────────────┐                ┌───────────────┐   │
│   │  LLM Service  │                │ Tool Registry │   │
│   │   (llm.js)    │                │ - Calculator  │   │
│   └───────────────┘                │ - DateTime    │   │
│                                    │ - TaskManager │   │
│                                    └───────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## 7. Project Structure

```text
ai-agent/
│
├── frontend/
│   ├── index.html                # Semantic HTML5 UI with Bootstrap 5
│   ├── style.css                 # Clean CSS styling, animations & badges
│   └── app.js                    # Vanilla JS chat manager & live activity trace
│
├── backend/
│   ├── src/
│   │   ├── agent/
│   │   │   ├── agent.js          # Core agent loop and step orchestrator
│   │   │   ├── planner.js        # Analyzes user intent into structured JSON plans
│   │   │   └── executor.js       # Tool registry dispatcher
│   │   │
│   │   ├── tools/
│   │   │   ├── calculator.js     # Safe arithmetic parser (no eval)
│   │   │   ├── dateTime.js       # Current date, time, and day provider
│   │   │   └── taskManager.js    # In-memory task management (add, list, complete, delete)
│   │   │
│   │   ├── routes/
│   │   │   └── chat.js           # Express router for POST /api/chat
│   │   │
│   │   ├── services/
│   │   │   └── llm.js            # Isolated LLM client + offline heuristic fallback
│   │   │
│   │   ├── app.js                # Express app configuration and static serving
│   │   ├── server.js             # Server listener entry point
│   │   └── test-agent.js         # Automated backend test suite
│   │
│   ├── .env                      # Local environment configuration (git-ignored)
│   ├── .env.example              # Sample environment template
│   └── package.json              # Backend dependencies (Express, CORS, dotenv, Axios)
│
├── README.md                     # Comprehensive documentation and guide
└── .gitignore                    # Git ignore file
```

---

## 8. How the Agent Works (Step-by-Step Example)

Let's trace what happens when you type: **"What is 25 * 48?"**

```text
1. User types "What is 25 * 48?" in the HTML input field and clicks Send.
   ↓
2. Frontend JavaScript sends HTTP POST /api/chat:
   {
     "message": "What is 25 * 48?",
     "conversationHistory": [...]
   }
   ↓
3. Express server receives request in `backend/src/routes/chat.js` and passes it to `runAgent()`.
   ↓
4. Planner (`planner.js`) analyzes the message.
   It determines that this is a mathematical question and produces structured JSON:
   {
     "action": "calculator",
     "input": "25 * 48",
     "reasoning": "User provided a mathematical expression requiring exact arithmetic."
   }
   ↓
5. Agent Loop (`agent.js`) inspects the plan and sees `action: "calculator"`.
   ↓
6. Executor (`executor.js`) looks up "calculator" in the `toolRegistry` and executes:
   calculate("25 * 48")
   ↓
7. Calculator Tool (`calculator.js`) safely evaluates the tokens without `eval()` and returns:
   { "success": true, "result": 1200 }
   ↓
8. Agent Synthesizer sends the tool result to the LLM to format a friendly final message:
   "25 * 48 = 1200"
   ↓
9. Backend responds with JSON:
   {
     "success": true,
     "message": "25 * 48 = 1200",
     "toolUsed": "calculator",
     "agentSteps": [
       "Received user request",
       "Analyzed request and planning next action",
       "Planned action: calculator (User provided a mathematical expression)",
       "Selected tool: calculator",
       "Executed Calculator Tool successfully",
       "Synthesizing final response with tool results",
       "Generated final response"
     ]
   }
   ↓
10. HTML UI receives the response:
    - Adds the message bubble with the "⚡ Used Calculator Tool" badge.
    - Updates the "Agent Activity" trace panel showing the exact step-by-step reasoning.
```

---

## 9. Installation & Setup

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm**

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables (Optional)
In `backend/.env`:
```env
PORT=5000
NODE_ENV=development

# Optional LLM API Key (OpenAI, OpenRouter, Groq, Gemini OpenAI-compatible)
# If left empty, the application runs in built-in offline simulation mode!
LLM_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

> **Note:** If you do not have an OpenAI API key right now, leave `LLM_API_KEY=` blank. The backend contains an intelligent offline fallback mode that accurately plans tools, evaluates math, gets dates, manages tasks, and recalls conversation memory!

---

## 10. Running the Application

### Start the Application (One Command!)
In the `backend/` folder:
```bash
npm run dev
```
*(Or `npm start`)*

Open your browser and navigate to: **http://localhost:5000**

The Express server automatically serves the HTML/CSS/JS frontend directly at `http://localhost:5000`. You can also open `frontend/index.html` directly in any web browser.

---

## 11. Testing Checklist

Use these test queries to verify every feature of the agent:

| Test Case | Example Query | Expected Behavior | Tool Used |
| :--- | :--- | :--- | :--- |
| **1. Greeting** | `Hello` | Friendly greeting and introduction | `None (Direct LLM)` |
| **2. Calculator (Multiplication)** | `What is 25 * 48?` | Computes `1200` | `calculator` |
| **3. Calculator (Percentage)** | `20% of 500` | Computes `100` | `calculator` |
| **4. Date Query** | `What is today's date?` | Returns current date (e.g. Tuesday, September 1, 2026) | `dateTime` |
| **5. Time Query** | `What time is it?` | Returns current time and timezone | `dateTime` |
| **6. Add Task** | `Add "Learn JavaScript" to my tasks` | Adds task to list and confirms | `taskManager` |
| **7. List Tasks** | `Show my tasks` | Lists all tasks with checkboxes `[ ]` / `[✓]` | `taskManager` |
| **8. Complete Task** | `Complete Learn JavaScript` | Marks the task as completed `[✓]` | `taskManager` |
| **9. Delete Task** | `Delete Learn JavaScript` | Removes the task from the list | `taskManager` |
| **10. Conversation Memory** | 1. `My name is Abhirami.`<br>2. `What is my name?` | Recalls name from conversation history | `None (Direct LLM)` |
| **11. Knowledge Query** | `Explain what an AI agent is.` | Explains concept without invoking a tool | `None (Direct LLM)` |

### Run the Backend Automated Test Suite:
```bash
cd backend
npm test
```
This runs 28 automated test assertions verifying the calculator, datetime, task manager, planner, and end-to-end agent loop.

---

## 12. In-Memory Storage Note

> [!NOTE]
> In this beginner application, the **Task Manager** stores tasks in Node.js server memory (`let tasks = [...]`).
> 
> * **Why?** To keep the project 100% focused on AI Agent concepts, tool calling, and orchestration without the complexity of database drivers, schemas, and migrations.
> * **Production Reality:** In a production application, in-memory arrays are reset when the server restarts. A real-world agent tool would connect to a database (e.g., **PostgreSQL**, **MongoDB**, or **SQLite**) or an external REST API (like Todoist or Notion API).

---

## 13. Future Learning Roadmap

```text
Level 1: Simple Single Agent (This Project)
  └─ Single loop: User ➔ Intent Planner ➔ Single Tool ➔ Response Synthesizer

Level 2: Multi-Step Tool Chaining
  └─ Agent can call multiple tools in a row (e.g., fetch data ➔ calculate ➔ save to tasks).

Level 3: Persistent Database & Session Memory
  └─ Store conversation history and task items in PostgreSQL/SQLite.

Level 4: Retrieval-Augmented Generation (RAG)
  └─ Add a vector search tool (e.g., ChromaDB / Pinecone) for searching PDF documents.

Level 5: Agent Frameworks
  └─ Learn frameworks like LangChain, LlamaIndex, or AutoGen with a solid conceptual foundation.

Level 6: Multi-Agent Systems
  └─ Orchestrate multiple specialized agents (Researcher Agent + Coder Agent + Reviewer Agent).
```

---

## 💡 Summary of Core Agent Concepts in This Project

| Concept | Location in Project | What It Does |
| :--- | :--- | :--- |
| **Frontend** | `frontend/index.html` & `app.js` | Renders UI, tracks conversation history, sends API requests. |
| **Backend** | `backend/src/app.js` & `server.js` | Express HTTP server handling `/api/chat` and serving static files. |
| **LLM Service** | `backend/src/services/llm.js` | Communicates with the model for planning and synthesis. |
| **Planner** | `backend/src/agent/planner.js` | Analyzes intent and generates structured JSON action plans. |
| **Tools** | `backend/src/tools/*.js` | Safe functions for math, date/time, and task management. |
| **Tool Registry** | `backend/src/agent/executor.js` | Dictionary mapping action names to executable tool handlers. |
| **Agent Loop** | `backend/src/agent/agent.js` | Orchestrates perceive ➔ plan ➔ execute ➔ synthesize flow. |
| **Memory** | `conversationHistory` parameter | Passed with each turn to maintain conversational context. |