# Security Guidelines

- Validate JWTs on every protected request.
- Use Supabase Auth.
- Implement RBAC.
- Encrypt sensitive data at rest when applicable.
- Use signed URLs for private uploads.
- Never expose service role keys.
- Sanitize file uploads.
- Validate MIME types.
- Enforce file size limits.
- Store secrets using environment variables.
- Enable HTTPS in production.
- Log security-related failures.

## External Content Policies

- Only process publicly accessible YouTube videos.
- Do not redistribute downloaded video files.
- Delete temporary audio files after processing.
- Store only derived educational artifacts (transcripts, notes, embeddings).
- Respect YouTube Terms of Service.