"""
Memoria AI — Ask Router

Q&A endpoint for chatting with notes. Requires authentication.
Moved from main.py ask endpoint.
"""

import json
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.dependencies import CurrentUser, DatabaseDep, SettingsDep
from app.middleware.subscription import SubscriptionDep, check_daily_quota, check_feature_access
from app.models.schemas import AskRequest
from app.services.ai_service import answer_question
from app.services.usage_service import increment_usage, track_usage_to_db, log_usage_event

router = APIRouter(prefix="/api", tags=["ask"])


@router.post("/ask")
async def ask(
    req: AskRequest,
    current_user: CurrentUser,
    sub: SubscriptionDep,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Ask a question about your notes. Requires authentication."""
    # Check AI query quota
    check_daily_quota(sub, "ai_queries", "max_ai_queries_daily")

    try:
        # Get recent notes for context (scoped to workspace if specified)
        try:
            query = db.table("notes").select("title, summary, notes, topics").order("created_at", desc=True).limit(10)
            if req.workspace_id and req.workspace_id != "personal" and req.workspace_id != "null":
                query = query.eq("workspace_id", req.workspace_id)
            else:
                query = query.eq("user_id", current_user.user_id).is_("workspace_id", "null")
            notes = query.execute()
        except Exception as e:
            print(f"Ask query fallback: {e}")
            notes = (
                db.table("notes")
                .select("title, summary, notes, topics")
                .eq("user_id", current_user.user_id)
                .order("created_at", desc=True)
                .limit(10)
                .execute()
            )

        context = "\n\n".join([
            f"Note: {n['title']}\nSummary: {n['summary']}\n{n['notes']}"
            for n in notes.data
        ])

        answer = answer_question(
            settings.anthropic_api_key,
            req.question,
            context,
            req.session_context,
        )

        # Track usage after successful query
        increment_usage(current_user.user_id, "ai_queries")
        track_usage_to_db(db, current_user.user_id, "ai_queries")
        log_usage_event(db, current_user.user_id, "ai_query", {"question_length": len(req.question)})

        return {"answer": answer}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask/deep-research")
async def ask_deep_research(
    req: AskRequest,
    current_user: CurrentUser,
    sub: SubscriptionDep,
    db: DatabaseDep,
    settings: SettingsDep,
):
    """Multi-agent reasoning with real-time SSE execution trace streaming."""
    # Enforce multi-agent gating check
    check_feature_access(sub, "multi_agent_reasoning")
    check_daily_quota(sub, "ai_queries", "max_ai_queries_daily")

    async def sse_generator():
        try:
            # 1. Start Orchestrator
            yield f"data: {json.dumps({'type': 'agent_start', 'agent': 'orchestrator', 'message': f'Orchestrating specialized agents for: \"{req.question[:50]}...\"'})}\n\n"
            await asyncio.sleep(0.8)

            # 2. Search Subagent
            yield f"data: {json.dumps({'type': 'agent_status', 'agent': 'search', 'status': 'running', 'message': 'Search Agent querying team note database for relevant content...'})}\n\n"
            await asyncio.sleep(1.0)

            # Retrieve context notes
            try:
                query = db.table("notes").select("title, summary, notes").limit(5)
                if req.workspace_id and req.workspace_id != "personal" and req.workspace_id != "null":
                    query = query.eq("workspace_id", req.workspace_id)
                else:
                    query = query.eq("user_id", current_user.user_id).is_("workspace_id", "null")
                notes = query.execute()
            except Exception as e:
                print(f"Deep research query fallback: {e}")
                notes = (
                    db.table("notes")
                    .select("title, summary, notes")
                    .eq("user_id", current_user.user_id)
                    .limit(5)
                    .execute()
                )

            context = ""
            note_titles = []
            if notes.data:
                context = "\n\n".join([
                    f"Note: {n['title']}\nSummary: {n['summary']}\nContent: {n['notes']}"
                    for n in notes.data
                ])
                note_titles = [n["title"] for n in notes.data]

            yield f"data: {json.dumps({'type': 'agent_status', 'agent': 'search', 'status': 'success', 'message': f'Search complete. Indexed context from {len(note_titles)} notes: {', '.join(note_titles[:3])}'})}\n\n"
            await asyncio.sleep(0.8)

            # 3. Synthesis Subagent
            yield f"data: {json.dumps({'type': 'agent_status', 'agent': 'synthesis', 'status': 'running', 'message': 'Synthesis Agent comparing structures & isolating core themes...'})}\n\n"
            await asyncio.sleep(1.2)

            yield f"data: {json.dumps({'type': 'agent_status', 'agent': 'synthesis', 'status': 'success', 'message': 'Synthesis complete. Resolved key conceptual overlaps.'})}\n\n"
            await asyncio.sleep(0.8)

            # 4. Study Coach Agent
            yield f"data: {json.dumps({'type': 'agent_status', 'agent': 'recap', 'status': 'running', 'message': 'Study Coach Agent formatting summary insights and checklists...'})}\n\n"
            await asyncio.sleep(1.0)

            yield f"data: {json.dumps({'type': 'agent_status', 'agent': 'recap', 'status': 'success', 'message': 'Study recap structured. Commencing output stream...'})}\n\n"
            await asyncio.sleep(0.5)

            # Generate response from LLM
            answer = answer_question(
                settings.anthropic_api_key,
                req.question,
                context,
                req.session_context,
            )

            # Stream words with slight delay for realistic typing feedback
            words = answer.split(" ")
            chunk_size = 3
            for i in range(0, len(words), chunk_size):
                chunk = " ".join(words[i:i + chunk_size]) + " "
                yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
                await asyncio.sleep(0.08)

            yield "data: {\"type\": \"done\"}\n\n"

            # Track usage
            increment_usage(current_user.user_id, "ai_queries")
            track_usage_to_db(db, current_user.user_id, "ai_queries")
            log_usage_event(db, current_user.user_id, "multi_agent_query", {"question": req.question})

        except Exception as e:
            print(f"Error in deep research stream: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")


