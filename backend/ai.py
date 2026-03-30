import os
import json
import re
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def parse_json(text: str) -> dict:
    try:
        clean = re.sub(r'```json\s*', '', text)
        clean = re.sub(r'```\s*', '', clean).strip()
        return json.loads(clean)
    except:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass
    return {}

def process_transcript(transcript: str, note_format: str = "bullet", topics: list = []) -> dict:
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

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    return parse_json(response.content[0].text)

def process_youtube(url: str, transcript: str) -> dict:
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

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )
    return parse_json(response.content[0].text)

def answer_question(question: str, context: str, session_context: str = "") -> str:
    prompt = f"""You are Memoria AI. Answer based on the user's past notes.

Retrieved Notes:
{context}

Session Context:
{session_context}

Question: {question}

Give a helpful, specific answer based on the notes above."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
