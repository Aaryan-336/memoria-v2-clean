# Memoria V2

**AI-Powered Lecture Intelligence Platform**

Transform lectures and educational content from any source into personalized learning experiences. Memoria helps students convert lecture recordings, YouTube videos, slides, PDFs, and notes into structured knowledge that is easier to understand, revise, and retain.

## 🚀 Features

### Currently Implemented
- 🎙️ **Live Audio Recording** — Real-time browser transcription via Web Speech API
- 📺 **YouTube Import** — Paste a URL, extract transcript, generate AI notes
- 📝 **AI Note Generation** — Claude Sonnet-powered structured notes, summaries, key points
- 💬 **Ask AI** — Chat Q&A against your saved notes
- 🔍 **Search** — Full-text search across all notes
- 📚 **Notes Library** — Browse, organize, and view saved notes

### Planned (v2 Roadmap)
- 🔐 Authentication (Supabase Auth)
- 🧠 Semantic search (Voyage AI + FAISS)
- 🗂️ RAG-powered chat with source citations
- 📇 Flashcard generation
- ❓ Quiz generation
- ⚡ Redis caching

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui |
| Backend | FastAPI · Pydantic · Python |
| Database | Supabase PostgreSQL |
| AI | Claude Sonnet · Web Speech API |
| Deployment | Vercel (frontend) · Render (backend) |

## 📂 Project Structure

```
memoria-v2-clean/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (dark theme, dock nav)
│   │   ├── page.tsx            # Dashboard
│   │   ├── record/page.tsx     # Live audio recording
│   │   ├── youtube/page.tsx    # YouTube import
│   │   ├── notes/
│   │   │   ├── page.tsx        # Notes library
│   │   │   └── [id]/page.tsx   # Individual note view
│   │   ├── ask/page.tsx        # AI chat
│   │   └── search/page.tsx     # Search
│   ├── components/ui/          # shadcn + custom components
│   ├── lib/
│   │   ├── api.ts              # API client config
│   │   ├── types.ts            # Shared TypeScript types
│   │   └── utils.ts            # Utilities
│   └── package.json
├── backend/
│   ├── main.py                 # FastAPI app + routes
│   ├── ai.py                   # Claude AI integration
│   ├── database.py             # Supabase client
│   ├── requirements.txt
│   ├── .env                    # Secrets (not committed)
│   └── .env.example            # Template for env vars
├── docs/                       # Architecture & design docs
└── README.md
```

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- Anthropic API key ([get one here](https://console.anthropic.com/settings/keys))
- Supabase project ([create one here](https://supabase.com))

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your real API keys
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📸 Screenshots

> Coming soon

## 🤝 Contributing

Contributions are welcome. See `docs/rules.md` for development guidelines.

## 📄 License

This project is open-source and available under the MIT License.

## 👨‍💻 Author

**Aaryan Khanna** — [GitHub](https://github.com/Aaryan-336)
