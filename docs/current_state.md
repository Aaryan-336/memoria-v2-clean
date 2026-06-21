# Current State

Memoria currently consists of:

## Frontend
- React 19.2.4 (via Next.js 16.2.1, App Router)
- TypeScript (strict mode)
- Tailwind CSS v4 + shadcn/ui (Radix Nova style)
- Framer Motion for animations
- 5 page routes: Home, Record, YouTube, Notes, Ask, Search
- 9 reusable UI components (shadcn) + 1 custom Dock navigation
- Dark theme with oklch color system

## Backend
- FastAPI (flat file structure)
- 5 API endpoints: health, generate-notes, youtube, notes, ask, search
- Pydantic request/response models

## Database
- Supabase PostgreSQL
- Single `notes` table

## Storage
- Supabase Storage

## AI
- Claude Sonnet (reasoning, note generation, Q&A)
- Web Speech API (browser-side live transcription)

## Not Yet Implemented
- Authentication (all requests use hardcoded user_id)
- Whisper transcription (server-side)
- Voyage AI embeddings
- FAISS vector indexing
- Semantic search (currently SQL ILIKE)
- RAG with vector retrieval (currently sends raw notes to Claude)
- Flashcards
- Quiz generation
- Redis caching
- Rate limiting

## Conventions
The codebase should be treated as the source of truth for existing functionality.

Agents must preserve existing functionality unless explicitly instructed otherwise.