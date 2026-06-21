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


def _call_groq(
    prompt: str,
    is_json: bool = False,
    max_tokens: int = 4096,
    system_message: str = "",
) -> str:
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

    messages = []
    if system_message:
        messages.append({"role": "system", "content": system_message})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": settings.groq_model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": max_tokens,
    }

    if is_json:
        payload["response_format"] = {"type": "json_object"}

    url = "https://api.groq.com/openai/v1/chat/completions"

    with httpx.Client() as client:
        response = client.post(url, json=payload, headers=headers, timeout=120.0)
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


# System prompt used for note generation — sets the AI's role
_NOTES_SYSTEM = (
    "You are an expert university professor and professional note-taker. "
    "You create comprehensive, well-structured study notes that would help "
    "a student ace their exams. Your notes are thorough, detailed, and "
    "use rich markdown formatting."
)


def process_transcript(
    api_key: str,
    transcript: str,
    note_format: str = "bullet",
    topics: Optional[list[str]] = None,
) -> dict:
    """Process a transcript and generate structured notes using Claude or Groq."""
    settings = get_settings()

    prompt = f"""Analyze the following lecture transcript thoroughly and return ONLY valid JSON with these exact keys:

{{
  "title": "A descriptive, specific title for this lecture (not generic)",

  "summary": "A comprehensive 5-8 sentence summary covering the main thesis, key arguments, important conclusions, and practical implications of the lecture.",

  "key_points": [
    "8-15 key points. Each point should be a complete sentence (15-30 words) that captures a distinct insight, concept, or takeaway. Do NOT write vague placeholders like 'point 1'."
  ],

  "notes": "COMPREHENSIVE structured notes in {note_format} format using rich markdown. REQUIREMENTS: (1) Use ## headings to organize by topic/section, (2) Use **bold** for key terms and definitions, (3) Include bullet points with detailed explanations (not one-liners), (4) Add sub-bullets for examples, evidence, or clarifications, (5) Include relevant formulas, dates, names, or data mentioned, (6) Minimum 500 words — the notes should be proportional to the lecture length. A long transcript MUST produce long, detailed notes. (7) End with a brief '## Summary' section that ties everything together.",

  "exam_questions": [
    "Generate 5-10 exam-worthy questions at varying difficulty levels. Include factual recall, conceptual understanding, and application/analysis questions. Each question should be specific to the content, not generic."
  ],

  "action_items": [{{"task": "Specific actionable task mentioned or implied in the lecture", "due": null, "priority": "medium"}}],

  "topics": ["List 3-8 specific topics/concepts covered, not generic subjects"],

  "mermaid_diagram": "Create a meaningful mermaid diagram (flowchart, mind map, or sequence diagram) that visualizes the key relationships or process flow discussed in the lecture. Use descriptive node labels. Example: graph TD\\n  A[Main Concept] --> B[Sub Topic 1]\\n  A --> C[Sub Topic 2]\\n  B --> D[Detail]\\n  C --> E[Detail]",

  "reminders": [{{"text": "Any deadlines, assignments, or follow-up items mentioned", "when": null}}]
}}

IMPORTANT RULES:
- The "notes" field is the MOST important. Make it thorough, detailed, and well-organized.
- Do NOT produce shallow, one-liner notes. Each section should have real substance.
- Extract EVERY important concept, definition, example, and explanation from the transcript.
- If the transcript is long, the notes MUST be proportionally long and detailed.

Transcript:
{transcript}

Return ONLY the JSON, nothing else."""

    if settings.ai_provider == "groq" or (not api_key and settings.groq_api_key):
        response_text = _call_groq(
            prompt,
            is_json=True,
            max_tokens=6000,
            system_message=_NOTES_SYSTEM,
        )
    else:
        client = _create_client(api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=6000,
            system=_NOTES_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        response_text = response.content[0].text

    return parse_json(response_text)


def process_youtube(api_key: str, url: str, transcript: str) -> dict:
    """Process a YouTube video transcript and generate structured notes using Claude or Groq."""
    settings = get_settings()

    prompt = f"""Analyze this YouTube video transcript thoroughly and return ONLY valid JSON:
{{
  "title": "A descriptive, specific title for this video (not just the channel name)",

  "summary": "A comprehensive 5-8 sentence summary covering the main thesis, key arguments, important conclusions, and practical implications of the video.",

  "key_points": [
    "8-15 key points. Each point should be a complete sentence (15-30 words) that captures a distinct insight or takeaway."
  ],

  "notes": "COMPREHENSIVE structured notes using rich markdown. REQUIREMENTS: (1) Use ## headings to organize by topic/section, (2) Use **bold** for key terms and definitions, (3) Include bullet points with detailed explanations, (4) Add sub-bullets for examples and evidence, (5) Include relevant facts, data, quotes mentioned, (6) Minimum 500 words — proportional to video length. (7) End with a '## Key Takeaways' section.",

  "topics": ["List 3-8 specific topics/concepts covered"],

  "mermaid_diagram": "Create a meaningful mermaid diagram visualizing the key concepts or process flow. Use descriptive labels. Example: graph TD\\n  A[Main Topic] --> B[Concept 1]\\n  A --> C[Concept 2]",

  "exam_questions": [
    "Generate 5-10 exam-worthy questions at varying difficulty levels, specific to the content."
  ],

  "action_items": [{{"task": "Specific actionable task", "due": null, "priority": "medium"}}],

  "reminders": [{{"text": "Follow-up items", "when": null}}]
}}

IMPORTANT: The "notes" field must be thorough and detailed. Do NOT produce shallow one-liner notes.

URL: {url}
Transcript: {transcript[:8000]}

Return ONLY the JSON."""

    if settings.ai_provider == "groq" or (not api_key and settings.groq_api_key):
        response_text = _call_groq(
            prompt,
            is_json=True,
            max_tokens=6000,
            system_message=_NOTES_SYSTEM,
        )
    else:
        client = _create_client(api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=6000,
            system=_NOTES_SYSTEM,
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

    prompt = f"""You are an expert educator creating study flashcards for university students. Create 10-15 high-quality study flashcards from the following lecture content.

Each flashcard MUST have:
- "topic": A concise, specific topic heading (3-8 words) for the FRONT of the card
- "content": A thorough 4-6 sentence explanation for the BACK of the card that includes:
  * A clear **definition** or explanation of the concept
  * **Why it matters** — its significance or real-world relevance
  * A **concrete example** or analogy to aid understanding
  * How it **connects** to other topics in the lecture (if applicable)
- "difficulty": One of "easy", "medium", or "hard"

Title: {note_title}{topics_hint}

Content:
{transcript[:8000]}

Return ONLY a valid JSON object with this structure:
{{
  "flashcards": [
    {{"topic": "Topic Name", "content": "Detailed multi-sentence explanation with definition, example, and significance...", "difficulty": "medium"}},
    ...
  ]
}}

RULES:
- Generate 10-15 flashcards covering ALL major concepts from the content.
- Each card's content must be substantial (4-6 sentences minimum). NO one-liner backs.
- Vary difficulty: include easy recall, medium understanding, and hard application cards.
- Be specific — use real terms, names, and data from the lecture.

Return ONLY the JSON."""

    if settings.ai_provider == "groq" or (not api_key and settings.groq_api_key):
        response_text = _call_groq(
            prompt,
            is_json=True,
            max_tokens=5000,
            system_message="You are an expert educator who creates comprehensive, detailed study flashcards.",
        )
    else:
        client = _create_client(api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=5000,
            system="You are an expert educator who creates comprehensive, detailed study flashcards.",
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
