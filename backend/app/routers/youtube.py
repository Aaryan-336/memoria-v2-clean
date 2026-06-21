"""
Memoria AI — YouTube Router

YouTube URL processing endpoint. Requires authentication.
Moved from main.py youtube endpoint.
"""

import re

from fastapi import APIRouter, HTTPException

try:
    from anthropic import AuthenticationError as AnthropicAuthError
except ImportError:
    AnthropicAuthError = None

from app.dependencies import CurrentUser, DatabaseDep, SettingsDep
from app.models.schemas import YouTubeRequest
from app.services.ai_service import process_youtube

router = APIRouter(prefix="/api", tags=["youtube"])


@router.post("/youtube")
async def youtube(
    req: YouTubeRequest,
    current_user: CurrentUser,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Process a YouTube video URL. Requires authentication."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi

        match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', req.url)
        if not match:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")

        video_id = match.group(1)
        transcript_list = YouTubeTranscriptApi().fetch(video_id)
        transcript_list = [{"text": t.text} for t in transcript_list]
        transcript = " ".join([t["text"] for t in transcript_list])

        result = process_youtube(settings.anthropic_api_key, req.url, transcript)
        if not result:
            raise HTTPException(status_code=500, detail="AI processing failed")

        note = db.table("notes").insert({
            "user_id": current_user.user_id,
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
    except HTTPException:
        raise
    except Exception as e:
        err = str(e)
        if AnthropicAuthError and isinstance(e, AnthropicAuthError):
            raise HTTPException(
                status_code=500,
                detail="Invalid Anthropic API key. Please update ANTHROPIC_API_KEY in backend/.env",
            )
        if "authentication_error" in err or "invalid x-api-key" in err or "401" in err:
            raise HTTPException(
                status_code=500,
                detail="Invalid Anthropic API key. Please update ANTHROPIC_API_KEY in backend/.env",
            )
        raise HTTPException(status_code=500, detail=err)
