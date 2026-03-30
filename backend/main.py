from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
import os

load_dotenv()

from database import supabase
from ai import process_transcript, process_youtube, answer_question

app = FastAPI(title="Memoria AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ────────────────────────────────────────────────────
class ProcessRequest(BaseModel):
    transcript: str
    session_id: str = "default"
    user_id: str = "user_demo"
    note_format: str = "bullet"
    source_type: str = "manual"

class YouTubeRequest(BaseModel):
    url: str
    user_id: str = "user_demo"

class AskRequest(BaseModel):
    question: str
    user_id: str = "user_demo"
    session_context: str = ""

# ── Health ────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "Memoria AI"}

# ── Generate Notes ────────────────────────────────────────────
@app.post("/api/generate-notes")
async def generate_notes(req: ProcessRequest):
    try:
        result = process_transcript(
            req.transcript,
            note_format=req.note_format
        )
        if not result:
            raise HTTPException(status_code=500, detail="AI processing failed")

        # Save to Supabase
        note = supabase.table("notes").insert({
            "user_id": req.user_id,
            "title": result.get("title", "Untitled"),
            "transcript": req.transcript,
            "summary": result.get("summary", ""),
            "notes": result.get("notes", ""),
            "key_points": result.get("key_points", []),
            "topics": result.get("topics", []),
            "action_items": result.get("action_items", []),
            "exam_questions": result.get("exam_questions", []),
            "reminders": result.get("reminders", []),
            "mermaid_diagram": result.get("mermaid_diagram", ""),
            "source_type": req.source_type,
        }).execute()

        return {"success": True, "note": note.data[0], "ai": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── YouTube ───────────────────────────────────────────────────
@app.post("/api/youtube")
async def youtube(req: YouTubeRequest):
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        import re

        match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', req.url)
        if not match:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")

        video_id = match.group(1)
        transcript_list = YouTubeTranscriptApi().fetch(video_id)
        transcript_list = [{"text": t.text} for t in transcript_list]
        transcript = " ".join([t["text"] for t in transcript_list])

        result = process_youtube(req.url, transcript)
        if not result:
            raise HTTPException(status_code=500, detail="AI processing failed")

        note = supabase.table("notes").insert({
            "user_id": req.user_id,
            "title": result.get("title", "YouTube Note"),
            "transcript": transcript,
            "summary": result.get("summary", ""),
            "notes": result.get("notes", ""),
            "key_points": result.get("key_points", []),
            "topics": result.get("topics", []),
            "action_items": result.get("action_items", []),
            "exam_questions": result.get("exam_questions", []),
            "reminders": result.get("reminders", []),
            "mermaid_diagram": result.get("mermaid_diagram", ""),
            "source_type": "youtube",
            "youtube_url": req.url,
        }).execute()

        return {"success": True, "note": note.data[0], "ai": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Get All Notes ─────────────────────────────────────────────
@app.get("/api/notes/{user_id}")
async def get_notes(user_id: str):
    try:
        notes = supabase.table("notes")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        return {"notes": notes.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Ask Memory ────────────────────────────────────────────────
@app.post("/api/ask")
async def ask(req: AskRequest):
    try:
        # Get all notes for context
        notes = supabase.table("notes")\
            .select("title, summary, notes, topics")\
            .eq("user_id", req.user_id)\
            .order("created_at", desc=True)\
            .limit(10)\
            .execute()

        context = "\n\n".join([
            f"Note: {n['title']}\nSummary: {n['summary']}\n{n['notes']}"
            for n in notes.data
        ])

        answer = answer_question(req.question, context, req.session_context)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Search Notes ──────────────────────────────────────────────
@app.get("/api/search")
async def search(q: str, user_id: str = "user_demo"):
    try:
        results = supabase.table("notes")\
            .select("*")\
            .eq("user_id", user_id)\
            .ilike("notes", f"%{q}%")\
            .execute()
        return {"results": results.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
