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
from app.middleware.subscription import SubscriptionDep, check_daily_quota, check_memory_limit
from app.models.schemas import YouTubeRequest
from app.services.ai_service import process_youtube
from app.services.subscription_service import get_user_memories_count
from app.services.usage_service import increment_usage, track_usage_to_db, log_usage_event

router = APIRouter(prefix="/api", tags=["youtube"])


async def _fetch_via_invidious(video_id: str):
    """Fetch transcript via public Invidious API instances as fallback."""
    import httpx

    instances = [
        "https://inv.nadeko.net",
        "https://invidious.fdn.fr",
        "https://vid.puffyan.us",
        "https://invidious.nerdvpn.de",
        "https://yewtu.be",
    ]

    for instance in instances:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Get available caption tracks
                caps_res = await client.get(
                    f"{instance}/api/v1/captions/{video_id}"
                )
                if caps_res.status_code != 200:
                    continue
                captions = caps_res.json().get("captions", [])
                if not captions:
                    continue

                # Prefer English caption
                caption = next(
                    (
                        c for c in captions
                        if c.get("language_code") == "en"
                        or "english" in c.get("label", "").lower()
                    ),
                    captions[0],
                )

                # Download subtitle content
                sub_url = caption.get("url", "")
                if not sub_url.startswith("http"):
                    sub_url = f"{instance}{sub_url}"
                sub_res = await client.get(sub_url)
                if sub_res.status_code != 200:
                    continue

                # Parse VTT/SRT content — keep only transcript text lines
                lines = [
                    line.strip()
                    for line in sub_res.text.split("\n")
                    if line.strip()
                    and "-->" not in line
                    and not line.strip().isdigit()
                    and not line.startswith("WEBVTT")
                    and not line.startswith("Kind:")
                    and not line.startswith("Language:")
                    and not line.startswith("NOTE")
                ]
                text = " ".join(lines).strip()
                if text:
                    print(f"[youtube] Invidious ({instance}) succeeded")
                    return text
        except Exception as e:
            print(f"[youtube] Invidious ({instance}) failed: {e}")
            continue

    return None


@router.post("/youtube")
async def youtube(
    req: YouTubeRequest,
    current_user: CurrentUser,
    sub: SubscriptionDep,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Process a YouTube video URL. Requires authentication."""
    # Check YouTube import quota
    check_daily_quota(sub, "youtube_imports", "max_youtube_daily")

    # Check memory limit before creating a new note
    memories_count = get_user_memories_count(db, current_user.user_id)
    check_memory_limit(sub, memories_count)

    try:
        match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', req.url)
        if not match:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")

        video_id = match.group(1)

        # Use pre-fetched transcript from frontend (Vercel) if available,
        # otherwise try fetching server-side with multiple fallback strategies
        if req.transcript and req.transcript.strip():
            transcript = req.transcript.strip()
        else:
            transcript = None

            # Strategy 1: youtube-transcript-api (may fail on cloud hosts)
            try:
                from youtube_transcript_api import YouTubeTranscriptApi
                from youtube_transcript_api.proxies import GenericProxyConfig

                proxy_config = None
                if settings.youtube_proxy_url:
                    proxy_config = GenericProxyConfig(
                        https_url=settings.youtube_proxy_url,
                        http_url=settings.youtube_proxy_url,
                    )

                ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)
                transcript_list = ytt_api.fetch(video_id)
                transcript_list = [{"text": t.text} for t in transcript_list]
                transcript = " ".join([t["text"] for t in transcript_list])
            except Exception as yt_err:
                print(f"[youtube] youtube-transcript-api failed: {yt_err}")

            # Strategy 2: Invidious public API fallback
            if not transcript:
                try:
                    transcript = await _fetch_via_invidious(video_id)
                except Exception as inv_err:
                    print(f"[youtube] Invidious fallback failed: {inv_err}")

            if not transcript:
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "Could not fetch transcript from any source. "
                        "Please paste the transcript manually using the option on the import page."
                    ),
                )

        result = process_youtube(settings.anthropic_api_key, req.url, transcript)
        if not result:
            raise HTTPException(status_code=500, detail="AI processing failed")

        note_data = {
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
        }
        if req.workspace_id:
            note_data["workspace_id"] = req.workspace_id

        try:
            note = db.table("notes").insert(note_data).execute()
        except Exception as e:
            if "workspace_id" in str(e) or "PGRST204" in str(e):
                print(f"Warning: workspace_id column is missing from notes table. Retrying note creation without workspace scoping. Error: {e}")
                note_data.pop("workspace_id", None)
                note = db.table("notes").insert(note_data).execute()
            else:
                raise

        # Track usage after successful import
        increment_usage(current_user.user_id, "youtube_imports")
        increment_usage(current_user.user_id, "notes_created")
        track_usage_to_db(db, current_user.user_id, "youtube_imports")
        track_usage_to_db(db, current_user.user_id, "notes_created")
        log_usage_event(db, current_user.user_id, "youtube_import", {"url": req.url})

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
        # Catch YouTube IP block errors and return a user-friendly message
        if "blocking" in err.lower() or "ip" in err.lower() or "too many requests" in err.lower():
            raise HTTPException(
                status_code=503,
                detail=(
                    "YouTube is temporarily blocking transcript requests from this server. "
                    "This is a known limitation when running on cloud hosting providers. "
                    "Please try again later, or use the audio recording or file upload features instead."
                ),
            )
        raise HTTPException(status_code=500, detail=err)

