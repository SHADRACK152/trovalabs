# Deploying to Vercel (frontend + optional Python serverless endpoints)

This repo is prepared to deploy the static frontend to Vercel and to host small Python serverless functions under `api/`.

Summary
- Frontend: `frontend` folder (Vite). Vercel will run `npm run build` and serve `dist`.
- Backend (options):
  - Small Python serverless functions: place files in `api/` (we added `api/health.py` as an example).
  - Full FastAPI app: Vercel is not ideal for hosting a full FastAPI app as a single server; consider using Render/Fly/Render for the full backend and point the frontend `VITE_API_URL` at that service.

Required environment variables (set these in Vercel Dashboard → Project → Settings → Environment Variables):
- `DATABASE_URL` — Neon Postgres connection string (example in your local `.env`).
- `HF_API_KEY` — Hugging Face API key if you use hosted image generation.
- Any other keys: `GROQ_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`.

How to deploy
1. Push this branch to GitHub.
2. In Vercel dashboard, create a new project and import the GitHub repo `SHADRACK152/Lumino-ai`.
   - Set the root build to use `frontend/package.json` (Vercel detects this automatically for the static build entry in `vercel.json`).
3. In Vercel Project Settings → Environment Variables, add the required secrets: `DATABASE_URL`, `HF_API_KEY`, etc.
4. Deploy. Once deployed:
   - Frontend will be served from the Vercel URL.
   - The health endpoint will be available at `https://<vercel-app>/api/health` and will return JSON indicating whether `DATABASE_URL` is set.

Notes and limitations
- Vercel Python Serverless Functions are suitable for small endpoints and background tasks. They are not intended for long-running processes or full-featured ASGI apps with many routes and persistent connections.
- If your backend requires persistent connections, background workers, or significant CPU/memory, prefer a dedicated host (Fly, Render, DigitalOcean App Platform) and set `VITE_API_URL` in Vercel to that external URL.
