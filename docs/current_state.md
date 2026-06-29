# Current State

Memoria V2 consists of:

## Frontend
- React 19.2.4 (via Next.js 16.2.1, App Router)
- TypeScript (strict mode)
- Tailwind CSS v4 + shadcn/ui (Warm Editorial System)
- Framer Motion for animations
- Bottom-dock navigation (all screens)
- Main views: Home, Record, YouTube, Notes, Ask (AI chat & SSE Deep Research), Search, Flashcards, Quiz, Pricing, and Billing Settings.

## Backend
- FastAPI (structured with app/routers, app/services, app/models, app/middleware)
- Fully authenticated API endpoints with Supabase Auth verification
- Multi-user Workspace organization with role-based access control (RBAC)
- Subscription tiers synced with Stripe Checkout & Webhooks
- Telemetry & rate-limiting with Upstash Redis counter and DB fallback

## Database & Storage
- Supabase PostgreSQL (notes, flashcards, workspaces, workspace_members, usage_daily, subscription_plans, user_subscriptions, payment_history)
- Supabase Storage for media uploads

## AI
- Claude 3.5 Sonnet / Groq (LLM note synthesis & Q&A)
- Web Speech API (browser-side live transcription)
- SSE-driven Deep Research Multi-Agent orchestration simulation

## Not Yet Implemented (Future Phases)
- Whisper transcription (server-side fallback)
- Voyage AI embeddings
- FAISS vector indexing
- Semantic search (currently SQL ILIKE search)
- RAG with vector retrieval (currently sends recent notes as prompt context)

## Conventions
The codebase should be treated as the source of truth for existing functionality.
Agents must preserve existing functionality unless explicitly instructed otherwise.