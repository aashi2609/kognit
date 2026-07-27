<div align="center">

# 🧠 Kognit — AI Coding Tutor

### **Real-Time Socratic AI Tutor & Interactive Coding Arena**

[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.6-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_DB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.2-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

*Kognit is a real-time AI coding tutor that watches you write code, speaks to you through an emotion-aware animated character, and helps you learn by asking guiding Socratic questions — without giving away raw answers.*

---

[What It Does](#-what-it-does) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack) • [Getting Started](#-running-locally) • [WebSocket Protocol](#-websocket-protocol) • [Deployment](#-deploying-the-backend-to-railway)

</div>

---

## 🌟 What It Does

- 🎙️ **Real-Time Voice Conversation** — Speak directly to the AI tutor. Your voice is transcribed via Groq Whisper STT, processed by Gemini/Groq LLMs, and spoken back out loud using ElevenLabs neural voice streaming with barge-in support.
- ⚡ **Debounced Code Analysis** — Watches your code as you type, detecting syntax errors, missing edge cases, and logic bugs in real time. Provides spoken, line-specific Socratic guidance.
- 🎭 **Animated AI Character** — Emotion-aware avatar that dynamically reacts to your coding progress (encouraging, concerned, contemplative, celebratory).
- 📊 **Visual Skill Tracking** — Maps detected error patterns (semicolons, indentation, null checks, recursion edge cases) to an interactive knowledge graph per user.
- 🔒 **Isolated Code Execution** — Run multi-language code directly in the browser via the Piston API; compilation outputs, stdout, and stderr are automatically piped back to the AI.
- ⚔️ **Mock Exam Arena** — Timed coding challenges where the AI tutor supervises in real time, scoring time/space complexity and problem-solving accuracy.

---

## 🏗️ Architecture

Kognit is built on an event-driven, microservices-inspired architecture combining REST APIs for resource management and high-concurrency WebSockets for real-time code analysis, speech transcription, and audio streaming.

### 1. System Architecture Diagram

```mermaid
flowchart TD
    classDef frontend fill:#1e1e2e,stroke:#89b4fa,stroke-width:2px,color:#cdd6f4;
    classDef gateway fill:#181825,stroke:#f9e2af,stroke-width:2px,color:#cdd6f4;
    classDef ai fill:#1e1e2e,stroke:#a6e3a1,stroke-width:2px,color:#cdd6f4;
    classDef storage fill:#1e1e2e,stroke:#f38ba8,stroke-width:2px,color:#cdd6f4;
    classDef exec fill:#1e1e2e,stroke:#cba6f7,stroke-width:2px,color:#cdd6f4;

    subgraph Client_Layer["🖥️ Frontend Client Layer (Next.js / React 19)"]
        Monaco["Monaco Editor<br/>(Live Code Input & Debounce)"]:::frontend
        VoiceSub["Voice Audio Processor<br/>(Mic Input & Web Audio Player)"]:::frontend
        AvatarUI["Animated AI Character<br/>(Emotion Engine & Canvas UI)"]:::frontend
        ClerkSDK["Clerk Auth SDK<br/>(Bearer Token & Session)"]:::frontend
    end

    subgraph Backend_Layer["⚡ FastAPI Backend Engine"]
        REST["REST API Endpoints<br/>(/files, /skills, /run, /extract-prompts)"]:::gateway
        WSGateway["WebSocket Gateway<br/>(ws:// Gateway Protocol)"]:::gateway
        SessionManager["Per-Session Turn Lock<br/>& Debounce Controller"]:::gateway
        JWKSServer["Clerk JWKS Validator"]:::gateway
    end

    subgraph AI_Voice_Layer["🧠 AI & Voice Orchestration Layer"]
        STTEngine["Groq Whisper STT<br/>(Speech-to-Text Transcription)"]:::ai
        LLMRouter["Multi-LLM Router"]:::ai
        GeminiLLM["Google Gemini<br/>(Primary Socratic Model)"]:::ai
        GroqLLM["Groq Llama<br/>(Speed & LLM Fallback)"]:::ai
        HeuristicFallback["Rule-Based AST Fallback"]:::ai
        TTSEngine["ElevenLabs TTS Engine<br/>(Streamed Audio Chunks)"]:::ai
    end

    subgraph Execution_Layer["🔒 Code Execution Sandbox"]
        PistonRunner["Piston Code Runner Engine"]:::exec
        IsolatedAPI["Piston Execution Sandbox<br/>(stdout / stderr / status)"]:::exec
    end

    subgraph Storage_Layer["💾 Database & Cache Infrastructure"]
        NeonDB[("Neon PostgreSQL<br/>(User Files, Skills, Arena Sessions)")]:::storage
        UpstashRedis[("Upstash Redis<br/>(Session Memory & Rate Limits)")]:::storage
    end

    %% Flow Connections
    ClerkSDK -- "JWT Auth Header" --> JWKSServer
    Monaco -- "HTTP REST (File CRUD)" --> REST
    Monaco -- "Debounced code_update" --> WSGateway
    VoiceSub -- "audio_in stream" --> WSGateway

    REST --> NeonDB
    WSGateway <--> SessionManager
    SessionManager --> STTEngine
    STTEngine --> LLMRouter

    SessionManager --> LLMRouter
    LLMRouter --> GeminiLLM
    GeminiLLM -- "Fallback" --> GroqLLM
    GroqLLM -- "Fallback" --> HeuristicFallback

    LLMRouter -- "Guidance Text Stream" --> TTSEngine
    TTSEngine -- "Audio Chunks (base64)" --> WSGateway
    WSGateway -- "tts_stream & avatar emotion" --> AvatarUI
    WSGateway -- "tts_stream" --> VoiceSub

    Monaco -- "Run Code (/run)" --> PistonRunner
    PistonRunner <--> IsolatedAPI
    PistonRunner -- "Execution Result" --> REST
    SessionManager -- "Write Skill Mastery per turn" --> NeonDB
    SessionManager <--> UpstashRedis

    linkStyle default stroke:#89b4fa,stroke-width:1.5px;
```

---

### 2. WebSocket & Voice Pipeline Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Learner / Developer
    participant UI as Next.js Client
    participant WS as FastAPI WS Gateway
    participant Lock as Session Turn Lock
    participant STT as Groq Whisper STT
    participant LLM as Gemini / Groq LLM
    participant TTS as ElevenLabs TTS
    participant DB as Neon Postgres DB

    alt Code Modification Flow
        User->>UI: Types code in Monaco Editor
        UI->>WS: ws.send({ type: "code_update", code: "..." })
        Note over WS: Debounce Timer (1.5s)
        WS->>Lock: Acquire Turn Lock
        WS->>LLM: Analyze AST & Code Structure
        LLM-->>WS: Socratic Response ("Check your loop termination condition...")
        WS->>TTS: Stream Text to Speech
        TTS-->>WS: Audio Chunks (base64)
        WS-->>UI: Send Audio + Text + Character Emotion
        UI->>User: Play Voice & Animate Character
        WS->>DB: Persist Skill Mastery Entry
        Lock-->>WS: Release Lock
    else Voice Question Flow
        User->>UI: Speaks Question into Microphone
        UI->>WS: ws.send({ type: "audio_in", audio: "base64" })
        WS->>STT: Transcribe Audio
        STT-->>WS: Transcript ("Why am I getting a RecursionError?")
        WS->>LLM: Prompt LLM with Code + Question
        LLM-->>WS: Socratic Explanation
        WS->>TTS: Generate Voice Response
        TTS-->>WS: Audio Stream Chunks
        WS-->>UI: ws.send({ type: "tts_stream", audio: "..." })
        UI->>User: Play Response
    end
```

---

### 3. Multi-LLM Fallback & Router Flow

```mermaid
graph LR
    A["User Code / Voice Event"] --> B{"Check Primary Provider"}
    B -- "Available" --> C["Google Gemini 2.5 / 3.6<br/>(Primary Socratic Reasoner)"]
    B -- "Rate Limit / Timeout" --> D["Groq Llama 3<br/>(High-Speed LLM Fallback)"]
    D -- "API Unavailable" --> E["Rule-Based AST Heuristic Engine<br/>(Offline Fallback)"]
    C --> F["Structured Socratic Feedback & Skill Graph Delta"]
    D --> F
    E --> F
```

---

## 🛠️ Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | [Next.js 16 (App Router)](https://nextjs.org/), [React 19](https://react.dev/) | Web application framework & client UI rendering |
| **Styling & Motion** | [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/) | UI design system, glassmorphism, fluid animations |
| **Code Editor** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) | Browser-based IDE with syntax highlighting & error markers |
| **Authentication** | [Clerk Auth](https://clerk.com/) | User authentication with JWKS backend token verification |
| **Backend API** | [FastAPI](https://fastapi.tiangolo.com/) | High-performance asynchronous Python REST & WebSocket engine |
| **STT & Speech AI** | [Groq Whisper](https://groq.com/) | Low-latency Speech-to-Text audio transcription |
| **Primary LLM** | [Google Gemini](https://deepmind.google/technologies/gemini/) | Socratic dialogue generation, code analysis, edge-case detection |
| **LLM Fallback** | [Groq Llama 3](https://groq.com/) | High-speed secondary reasoning engine |
| **TTS Neural Voice** | [ElevenLabs API](https://elevenlabs.io/) | Ultra-realistic voice synthesis & WebSocket audio streaming |
| **Code Execution** | Piston Execution API | Remote isolated code sandbox (Python, JS, C++, Java, Rust, Go) |
| **Database** | [Neon PostgreSQL](https://neon.tech/) | Cloud serverless Postgres via SQLAlchemy (asyncio) & asyncpg |
| **Caching & State** | [Upstash Redis](https://upstash.com/) | Session memory management & rate limiting |

---

## 💻 Running Locally

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js**: `18.x` or higher
- **Python**: `3.11` or higher
- **Neon PostgreSQL** database instance
- **Clerk Account** (Publishable Key & Secret Key)
- **Groq API Key** *(free)* — for Speech-to-Text (Whisper) and LLM fallback
- **ElevenLabs API Key** — for neural Text-to-Speech voice streaming
- **Gemini API Key** *(optional, Groq works without it)*

---

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the Uvicorn development server
uvicorn app.main:app --reload --port 8000
```

Create a `backend/.env` file with the following variables:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host/db?ssl=require
CLERK_ISSUER=https://your-clerk-issuer.clerk.accounts.dev
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=                   # optional
ANTHROPIC_API_KEY=                # optional
ELEVENLABS_API_KEY=sk_...
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...
BACKEND_CORS_ORIGINS=http://localhost:3000
KOGNIT_SSL_VERIFY=0               # set to 1 in production
```

The FastAPI server will start at `http://localhost:8000`. OpenAPI documentation is available at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

In a new terminal window at the project root directory:

```bash
# Install frontend dependencies
npm install

# Start Next.js dev server
npm run dev
```

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Visit `http://localhost:3000` in your web browser.

---

## 📡 WebSocket Protocol Specification

The WebSocket gateway endpoint is hosted at `ws://localhost:8000/ws/session/{session_id}?token={clerk_jwt_token}`.

### Inbound Events (Client ➔ Server)

| Message Type | Payload Structure | Action |
| :--- | :--- | :--- |
| `code_update` | `{ "type": "code_update", "code": "string", "language": "python" }` | Sends Monaco Editor code updates for debounced Socratic evaluation. |
| `audio_in` | `{ "type": "audio_in", "audio": "base64_pcm" }` | Sends microphone audio chunk for Groq Whisper transcription. |
| `barge_in` | `{ "type": "barge_in" }` | Interrupts current AI speech playback immediately and clears locks. |
| `run_code` | `{ "type": "run_code", "code": "string", "language": "python" }` | Executes code via Piston sandbox and streams compilation outputs. |

### Outbound Events (Server ➔ Client)

| Message Type | Payload Structure | Action |
| :--- | :--- | :--- |
| `ai_response` | `{ "type": "ai_response", "text": "string", "emotion": "encouraging" }` | Text response and character emotion state for UI rendering. |
| `tts_stream` | `{ "type": "tts_stream", "audio": "base64_mp3" }` | Audio stream chunk for Web Audio player playback. |
| `skill_update` | `{ "type": "skill_update", "skill": "indentation", "score": 90 }` | Updates knowledge graph mastery scores per turn. |
| `execution_result` | `{ "type": "execution_result", "stdout": "...", "stderr": "..." }` | Returns sandboxed execution output. |

---

## 📁 Directory Structure

```
kognit/
├── app/                        # Next.js App Router Pages
│   ├── arena/                  # Socratic Coding Arena & Workspace
│   ├── dashboard/              # Analytics & Skill Knowledge Graph
│   ├── login/                  # Sign-In Page (Clerk Auth)
│   ├── signup/                 # Sign-Up Page (Clerk Auth)
│   ├── skills/                 # Topic & Skill Mastery Tree
│   ├── globals.css             # Tailwind CSS & Shaders
│   ├── layout.tsx              # Root App Layout & Providers
│   └── page.tsx                # Hero Landing Page
├── backend/                    # FastAPI Backend Application
│   ├── app/
│   │   ├── main.py             # FastAPI App & REST Endpoints
│   │   ├── ws_gateway.py       # WebSocket Gateway & Concurrency Controller
│   │   ├── code_analyzer.py    # Socratic Code Analysis Engine
│   │   ├── code_runner.py      # Piston Sandbox Executor
│   │   ├── llm_router.py       # Multi-LLM Router (Gemini / Groq / Fallback)
│   │   ├── stt_service.py      # Groq Whisper STT Service
│   │   ├── tts_service.py      # ElevenLabs Neural Voice TTS Service
│   │   ├── auth.py             # Clerk JWT Verifier
│   │   ├── database.py         # Neon PostgreSQL Async Engine
│   │   ├── models.py           # SQLAlchemy Database Models
│   │   └── session_store.py    # Upstash Redis Session Cache
│   ├── DEPLOY.md               # Railway Deployment Guide
│   ├── nixpacks.toml           # Deployment Build Configuration
│   └── requirements.txt        # Backend Python Dependencies
├── components/                 # React UI Components & Visualizers
│   ├── act-synapse.tsx         # AI Synapse Neural Node Canvas
│   ├── act-clone-console.tsx   # Exec Terminal & Output Console
│   ├── student-character.tsx   # Emotion-Aware Animated AI Character Avatar
│   ├── office-scene.tsx        # 3D Cyber-Classroom Scene
│   └── ui/                     # Reusable Shadcn UI Elements
├── public/                     # Static Assets & Lottie Animations
├── .env                        # Backend Environment File
├── .env.local                  # Frontend Environment File
├── package.json                # Project Dependencies & Scripts
└── README.md                   # Project Documentation
```

---

## 🚀 Deploying the backend to Railway

For complete step-by-step instructions on deploying the FastAPI backend service to Railway, please refer to [DEPLOY.md](DEPLOY.md).

---

<div align="center">

**Built with ❤️ for learners, engineers, and interview candidates worldwide.**

[⭐ Star on GitHub](https://github.com/) • [💬 Report an Issue](https://github.com/)

</div>
