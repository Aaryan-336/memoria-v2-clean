"""
Memoria AI — Upload Router

Endpoints for uploading PDFs, PPTs, Images (handwritten notes), and Audio files
to extract content and generate structured notes.
"""

from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, status

from app.dependencies import CurrentUser, DatabaseDep, SettingsDep
from app.middleware.subscription import SubscriptionDep, check_memory_limit
from app.services.file_service import (
    extract_pdf_text,
    extract_pptx_text,
    extract_image_text,
    transcribe_audio,
)
from app.services.ai_service import process_transcript
from app.services.subscription_service import get_user_memories_count
from app.services.usage_service import increment_usage, track_usage_to_db, log_usage_event

router = APIRouter(prefix="/api", tags=["upload"])

# Maximum size constants (in bytes)
MAX_DOC_SIZE = 10 * 1024 * 1024       # 10MB for PDFs, PPTs, Images
MAX_AUDIO_SIZE = 25 * 1024 * 1024     # 25MB for Audio files


@router.post("/upload")
async def upload_file(
    current_user: CurrentUser,
    sub: SubscriptionDep,
    db: DatabaseDep,
    settings: SettingsDep,
    file: UploadFile = File(...),
    workspace_id: Optional[str] = Form(None),
):
    """
    Upload a file (PDF, PPTX, Image, Audio) and generate structured study notes.
    Requires authentication and checks plan limitations.
    """
    # 1. Verify file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    filename = file.filename or "unknown"
    ext = filename.split(".")[-1].lower()

    # Determine source type and check size limit
    if ext in ("pdf",):
        source_type = "pdf"
        max_size = MAX_DOC_SIZE
    elif ext in ("ppt", "pptx"):
        source_type = "ppt"
        max_size = MAX_DOC_SIZE
    elif ext in ("jpg", "jpeg", "png", "webp"):
        source_type = "image"
        max_size = MAX_DOC_SIZE
    elif ext in ("mp3", "wav", "m4a", "webm", "ogg"):
        source_type = "audio"
        max_size = MAX_AUDIO_SIZE
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format: .{ext}. Supported: PDF, PPTX, JPG/PNG, and MP3/WAV/M4A/WEBM."
        )

    if file_size > max_size:
        max_size_mb = max_size // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size limit of {max_size_mb}MB."
        )

    # 2. Check user memory (notes) limit
    memories_count = get_user_memories_count(db, current_user.user_id)
    check_memory_limit(sub, memories_count)

    # 3. Read file bytes
    file_bytes = await file.read()

    # 4. Extract text from the file
    extracted_text = ""
    try:
        if source_type == "pdf":
            extracted_text = extract_pdf_text(file_bytes)
        elif source_type == "ppt":
            extracted_text = extract_pptx_text(file_bytes)
        elif source_type == "image":
            # For OCR, we need Claude's API key
            extracted_text = extract_image_text(
                file_bytes=file_bytes,
                api_key=settings.anthropic_api_key,
                mime_type=file.content_type or "image/png"
            )
        elif source_type == "audio":
            extracted_text = transcribe_audio(
                file_bytes=file_bytes,
                filename=filename,
                groq_api_key=settings.groq_api_key
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error extracting content from file: {str(e)}"
        )

    if not extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No readable text content could be extracted from this file."
        )

    # 5. Generate structured notes from the extracted content
    try:
        result = process_transcript(
            settings.anthropic_api_key,
            extracted_text,
            note_format="bullet"
        )
        if not result:
            raise ValueError("AI generation returned empty results.")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI notes generation failed: {str(e)}"
        )

    # 6. Save the structured note to Supabase
    note_data = {
        "user_id": current_user.user_id,
        "title": result.get("title", f"Notes: {filename}"),
        "transcript": extracted_text,
        "summary": result.get("summary", ""),
        "notes": result.get("notes", ""),
        "key_points": result.get("key_points", []),
        "topics": result.get("topics", []),
        "action_items": result.get("action_items", []),
        "exam_questions": result.get("exam_questions", []),
        "reminders": result.get("reminders", []),
        "mermaid_diagram": result.get("mermaid_diagram", ""),
        "source_type": source_type,
    }

    if workspace_id and workspace_id != "personal" and workspace_id != "null":
        note_data["workspace_id"] = workspace_id

    try:
        note_resp = db.table("notes").insert(note_data).execute()
    except Exception as e:
        if "workspace_id" in str(e) or "PGRST204" in str(e):
            print(f"Warning: workspace_id column missing. Retrying insert without workspace scoping. Error: {e}")
            note_data.pop("workspace_id", None)
            note_resp = db.table("notes").insert(note_data).execute()
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save generated notes to database: {str(e)}"
            )

    # 7. Increment daily counters
    increment_usage(current_user.user_id, "notes_created")
    track_usage_to_db(db, current_user.user_id, "notes_created")
    log_usage_event(db, current_user.user_id, "note_created_via_upload", {"source": source_type, "filename": filename})

    return {"success": True, "note": note_resp.data[0], "ai": result}
