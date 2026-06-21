# Deployment Strategy

## Current Stage

Goal:
Deploy prototype for recruiters and portfolio.

Frontend:
Vercel

Backend:
Render

Database:
Supabase PostgreSQL

Storage:
Supabase Storage

Redis:
Upstash Redis

## CI/CD

GitHub Actions:
- Run tests
- Build frontend
- Validate backend

## Future Scaling

100 Users:
Current architecture.

1,000 Users:
Dedicated Redis.

10,000+ Users:
Move FAISS into dedicated vector service.

100,000+ Users:
Microservices architecture.