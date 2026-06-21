"""
Memoria AI — AI Service (Claude & Groq Integration)

Configurable AI note generation and Q&A service.
Supports Anthropic Claude and Groq Cloud.
"""

import json
import re
from typing import Optional

import httpx
from anthropic import Anthropic
from app.config import get_settings


def _create_client(api_key: str) -> Anthropic:
    """Create an Anthropic client with the given API key."""
    if not api_key or api_key.strip().lower() in ("", "your_key", "your-key", "sk-ant-your-key-here"):
        raise RuntimeError(
            "ANTHROPIC_API_KEY is missing or still set to a placeholder. "
            "Please set a real key in backend/.env. "
            "Get your key at: https://console.anthropic.com/settings/keys"
        )
    return Anthropic(api_key=api_key)


def _call_groq(prompt: str, is_json: bool = False) -> str:
    """Make a synchronous request to Groq Cloud API."""
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is missing or still set to a placeholder. "
            "Please set a real key in backend/.env. "
            "Get your key at: https://console.groq.com"
        )

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.groq_model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }

    if is_json:
        payload["response_format"] = {"type": "json_object"}

    url = "https://api.groq.com/openai/v1/chat/completions"

    with httpx.Client() as client:
        response = client.post(url, json=payload, headers=headers, timeout=60.0)
        if response.status_code != 200:
            raise RuntimeError(f"Groq API Error: {response.status_code} - {response.text}")
        data = response.json()
        return data["choices"][0]["message"]["content"]


def parse_json(text: str) -> dict:
    """Extract JSON object from response text."""
    try:
        clean = re.sub(r'```json\s*', '', text)
        clean = re.sub(r'```\s*', '', clean).strip()
        return json.loads(clean)
    except (json.JSONDecodeError, ValueError):
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except (json.JSONDecodeError, ValueError):
                pass
    return {}


def parse_json_any(text: str):
    """Extract JSON (object or array) from response text."""
    try:
        clean = re.sub(r'```json\s*', '', text)
        clean = re.sub(r'```\s*', '', clean).strip()
        return json.loads(clean)
    except (json.JSONDecodeError, ValueError):
        # Try to find an array
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except (json.JSONDecodeError, ValueError):
                pass
        # Try to find an object with an array value
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
                # If the object has a single key whose value is a list, return that list
                if isinstance(result, dict) and len(result) == 1:
                    val = next(iter(result.values()))
                    if isinstance(val, list):
                        return val
                return result
            except (json.JSONDecodeError, ValueError):
                pass
    return []


def process_transcript(
    api_key: str,
    transcript: str,
    note_format: str = "bullet",
    topics: Optional[list[str]] = None,
) -> dict:
    """Process a transcript and generate structured notes using Claude or Groq."""
    settings = get_settings()

    prompt = f"""Process this transcript and return ONLY valid JSON with these exact keys:
{{
  "title": "auto generated title",
  "summary": "2-3 sentence summary",
  "key_points": ["point 1", "point 2"],
  "notes": "structured notes in {note_format} format",
  "exam_questions": ["question 1", "question 2"],
  "action_items": [{{"task": "task", "due": null, "priority": "medium"}}],
  "topics": ["topic1", "topic2"],
  "mermaid_diagram": "graph TD\\n  A[Start] --> B[End]",
  "reminders": [{{"text": "reminder", "when": null}}]
}}

Transcript:
{transcript}

Return ONLY the JSON, nothing else."""

    if settings.ai_provider == "groq" or (not api_key and settings.groq_api_key):
        response_text = _call_groq(prompt, is_json=True)
    else:
        client = _create_client(api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = response.content[0].text

    return parse_json(response_text)


def process_youtube(api_key: str, url: str, transcript: str) -> dict:
    """Process a YouTube video transcript and generate structured notes using Claude or Groq."""
    settings = get_settings()

    prompt = f"""Process this YouTube video transcript and return ONLY valid JSON:
{{
  "title": "video title",
  "summary": "comprehensive summary",
  "key_points": ["point 1", "point 2"],
  "notes": "structured notes",
  "topics": ["topic1"],
  "mermaid_diagram": "graph TD\\n  A[Start] --> B[End]",
  "exam_questions": ["question 1"],
  "action_items": [],
  "reminders": []
}}

URL: {url}
Transcript: {transcript[:4000]}

Return ONLY the JSON."""

    if settings.ai_provider == "groq" or (not api_key and settings.groq_api_key):
        response_text = _call_groq(prompt, is_json=True)
    else:
        client = _create_client(api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = response.content[0].text

    return parse_json(response_text)


def answer_question(
    api_key: str, question: str, context: str, session_context: str = ""
) -> str:
    """Answer a question about the user's notes using Claude or Groq."""
    settings = get_settings()

    prompt = f"""You are Memoria AI. Answer based on the user's past notes.

Retrieved Notes:
{context}

Session Context:
{session_context}

Question: {question}

Give a helpful, specific answer based on the notes above."""

    if settings.ai_provider == "groq" or (not api_key and settings.groq_api_key):
        return _call_groq(prompt, is_json=False)
    else:
        client = _create_client(api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text


def generate_flashcards(
    api_key: str,
    transcript: str,
    note_title: str = "",
    topics: Optional[list[str]] = None,
) -> list[dict]:
    """Generate flashcards from note content using Claude or Groq.

    Returns a list of {topic, content, difficulty} objects.
    """
    settings = get_settings()

    topics_hint = ""
    if topics:
        topics_hint = f"\nKnown topics: {', '.join(topics)}"

    prompt = f"""You are an expert educator. Create 8-12 study flashcards from the following lecture content.

Each flashcard should have:
- "topic": A concise generalized topic heading (3-8 words) for the FRONT of the card
- "content": A clear, detailed 2-4 sentence explanation for the BACK of the card that dives deep into the topic
- "difficulty": One of "easy", "medium", or "hard"

Title: {note_title}{topics_hint}

Content:
{transcript[:6000]}

Return ONLY a valid JSON object with this structure:
{{
  "flashcards": [
    {{"topic": "Topic Name", "content": "Detailed explanation...", "difficulty": "medium"}},
    ...
  ]
}}

Generate diverse flashcards covering ALL major concepts. Return ONLY the JSON."""

    if settings.ai_provider == "groq" or (not api_key and settings.groq_api_key):
        response_text = _call_groq(prompt, is_json=True)
    else:
        client = _create_client(api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = response.content[0].text

    result = parse_json_any(response_text)
    if isinstance(result, dict):
        return result.get("flashcards", [])
    if isinstance(result, list):
        return result
    return []


def generate_quiz(
    api_key: str,
    transcript: str,
    note_title: str = "",
    topics: Optional[list[str]] = None,
    num_questions: int = 10,
) -> list[dict]:
    """Generate multiple-choice quiz questions from note content using Claude or Groq.

    Returns a list of {question, options, correct_answer, explanation} objects.
    """
    settings = get_settings()

    topics_hint = ""
    if topics:
        topics_hint = f"\nKnown topics: {', '.join(topics)}"

    prompt = f"""You are an expert educator creating a multiple-choice quiz. Generate exactly {num_questions} questions from the following lecture content.

Each question must have:
- "question": The question text
- "options": An array of exactly 4 answer choices (strings)
- "correct_answer": The exact text of the correct option (must match one of the options exactly)
- "explanation": A brief 1-2 sentence explanation of why the answer is correct

Title: {note_title}{topics_hint}

Content:
{transcript[:6000]}

Return ONLY a valid JSON object with this structure:
{{
  "questions": [
    {{
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Because..."
    }},
    ...
  ]
}}

Make questions progressively harder. Cover ALL major topics. Return ONLY the JSON."""

    if settings.ai_provider == "groq" or (not api_key and settings.groq_api_key):
        response_text = _call_groq(prompt, is_json=True)
    else:
        client = _create_client(api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = response.content[0].text

    result = parse_json_any(response_text)
    if isinstance(result, dict):
        return result.get("questions", [])
    if isinstance(result, list):
        return result
    return []
