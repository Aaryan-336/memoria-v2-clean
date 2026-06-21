# Architecture

## Five-Layer Intelligence Architecture

### Layer 1: Capture

Input Sources:
- Audio
- PDFs
- PPTs
- Images
- Typed notes
- YouTube URLs

Output:
Raw educational assets.

---

### Layer 2: Understanding

Processes:
- Whisper transcription
- OCR extraction
- PDF parsing
- YouTube metadata extraction
- Transcript retrieval
- Audio download (fallback)
- Whisper transcription if transcripts are unavailable
Output:
Unified textual representation.

---

### Layer 3: Knowledge Structuring

Processes:
- Topic segmentation
- Summary generation
- Flashcard creation
- Quiz generation

Output:
Structured learning objects.

---

### Layer 4: Memory Indexing

Processes:
- Embedding generation
- Vector indexing using FAISS

Output:
Semantic memory layer.

---

### Layer 5: Retrieval & Reasoning

Processes:
- RAG
- Claude responses

Output:
Personalized learning assistance.

## YouTube Integration Flow

User pastes YouTube URL
        ↓
Extract Video Metadata
        ↓
Transcript Available?
      /       \
    Yes        No
     ↓          ↓
Use Transcript Download Audio
                ↓
          Whisper Local
                ↓
          Clean Transcript
                ↓
Generate Notes
                ↓
Create Flashcards
                ↓
Generate Embeddings
                ↓
Store in FAISS
                ↓
Chat with Lecture