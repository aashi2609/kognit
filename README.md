# Kognit — AI Coding Tutor

Kognit is a real-time AI coding tutor that watches you write code, speaks to you through an animated character, and helps you learn by asking guiding questions — not giving away answers.

## What it does

- **Real-time code analysis** — detects errors and gives spoken, line-specific feedback as you type
- **Voice conversation** — speak to the tutor, it transcribes your question and responds out loud
- **Animated AI character** — emotion-aware avatar reacts to your progress (encouraging, concerned, celebratory)
- **Skill tracking** — maps detected error patterns (semicolons, indentation, null handling, etc.) to a visual knowledge graph per user
- **Code execution** — run code directly in the browser via Piston API, errors are piped back to the AI automatically
- **Mock exam arena** — timed coding challenges with the AI tutor watching in real time

## Tech stack

**Frontend** — Next.js (App Router), React, Tailwind CSS, Framer Motion, Clerk Auth

**Backend** — FastAPI, SQLAlchemy (async), asyncpg, Upstash Redis

**AI/Voice** — Groq (Whisper STT + Llama fallback), Gemini (primary LLM), ElevenLabs (TTS)

**Database** — PostgreSQL on Neon

**Auth** — Clerk (frontend SDK + JWKS verification on backend)

## Architecture

```
Browser
  │
  ├─ REST (fetch + Bearer token) ──► FastAPI
  │                                     ├─ /files, /skills, /run, /extract-prompts
  │                                     └─ JWT verified via Clerk JWKS
  │
  └─ WebSocket (ws:// + token) ────► WS Gateway
                                        ├─ audio_in → Groq Whisper STT → transcript
                                        ├─ code_update → debounced → LLM analysis
                                        ├─ Gemini → Groq fallback → heuristic fallback
                                        ├─ ElevenLabs TTS → streamed audio chunks
                                        └─ skill mastery written to Postgres per turn
```

## Running locally

### Prerequisites
- Node.js 18+
- Python 3.11+
- Neon Postgres database
- Clerk account
- Groq API key (free) — for STT and LLM fallback
- ElevenLabs API key — for TTS
- Gemini API key (optional, Groq works without it)

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Create `backend/.env`:
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

### 2. Frontend

```bash
npm install
npm run dev
```

Create `.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Visit `http://localhost:3000`

## Deploying the backend to Railway

See [DEPLOY.md](DEPLOY.md) for step-by-step Railway deployment instructions.
