# Deploying Lumino AI Backend to DigitalOcean

This document explains two straightforward ways to run the `backend/` FastAPI app on DigitalOcean:

- App Platform (managed, easiest to operate)
- Droplet with Docker (more control, generally cheaper for small always-on workloads)

Both options support running your app 24/7. App Platform runs at least one instance of a web service (it does not scale to zero for web services by default). Droplets are full VMs you control and are always-on unless you stop them.

## Quick summary

- Use App Platform if you want managed builds, rolling deploys, auto HTTPS, and a UI for environment variables.
- Use a Droplet (with Docker) if you want the cheapest always-on option and full control.

## Prerequisites

- `doctl` (DigitalOcean CLI) or an account with App Platform access
- Docker installed (for building images locally)
- A DigitalOcean account and (optionally) a Container Registry

## 1) App Platform (recommended for simplicity)

1. Push your repository to GitHub (or have it in a repo accessible by App Platform).
2. In the DigitalOcean Control Panel, create a new App and connect your GitHub repo.
   - Point the service to the `backend/` directory.
   - Choose `Dockerfile` build (the project includes `backend/Dockerfile`).
3. Set environment variables (from `backend/.env.example` and `backend/config.py`) in the App Platform Secrets/Environment section. Important values:
   - `DATABASE_URL`
   - `GROQ_API_KEY` or `OPENAI_API_KEY`
   - `GOOGLE_API_KEY`, `ELEVENLABS_API_KEY` (optional)
4. Configure an HTTP service with `PORT` set to `8080` if required (the Dockerfile listens on `8080`).
5. Deploy. App Platform will build and run your container. The service will be always-on (one or more containers running).

CLI alternative (build & push to DigitalOcean Container Registry, then create an app from image):

```cmd
doctl auth init
doctl registry login

# Build image locally
docker build -t registry.digitalocean.com/<registry-name>/lumino-backend:latest -f backend/Dockerfile .
docker push registry.digitalocean.com/<registry-name>/lumino-backend:latest

# Create an App Platform app from an image via UI or `doctl apps create --spec app-spec.yaml`
```

## 2) Droplet with Docker (cheaper + always-on)

1. Create a small Droplet (e.g., 1 vCPU / 1GB RAM) in the DigitalOcean UI.
2. SSH into the Droplet and install Docker.
3. Build and run the image on the Droplet, or pull from the DO Container Registry:

```cmd
# Build locally and push to registry, or build on the Droplet.
docker build -t lumino-backend -f backend/Dockerfile .
docker run -d --restart unless-stopped -p 80:8080 \
  -e DATABASE_URL="<your db url>" \
  -e GROQ_API_KEY="<key>" \
  lumino-backend
```

4. If you want HTTPS, put an nginx reverse proxy in front and use Certbot, or use a Load Balancer in front of your Droplet.

## Environment variables

Set required environment variables from `backend/.env.example` and `backend/config.py`. At minimum you'll need one of the LLM provider keys and `DATABASE_URL` if your app uses a DB.

## Frontend & Database (Neon) configuration

- The frontend uses `VITE_API_URL` (see `frontend/.env.example`). When deploying the frontend on DigitalOcean App Platform, set `VITE_API_URL` to the backend's public URL (for example `https://lumino-backend.ondigitalocean.app`) in the App Platform env settings for the static site.
- Database: you indicated the project will use Neon for the database. Neon provides a Postgres-compatible connection string — set that value into the `DATABASE_URL` secret used by the backend service. Example Neon URL:

```
postgresql://<user>:<password>@<host>/<database>
```

Use Neon console to create a database, then copy the connection URI into the `DATABASE_URL` secret for the backend in the App Platform UI or via `doctl secrets`.

## Deploying both frontend and backend on DigitalOcean App Platform

Use the included `digitalocean/app-spec.yaml` to deploy both services together (static frontend + backend Docker service). Replace placeholders in `digitalocean/app-spec.yaml` with your GitHub repo and Neon `DATABASE_URL`, then run:

```cmd
doctl auth init
doctl apps create --spec digitalocean/app-spec.yaml
```

After creation, App Platform provides the public URLs for both the frontend and backend. Confirm the frontend `VITE_API_URL` points to the backend URL.

### Setting secrets with `doctl` or the DigitalOcean UI

You can set secrets either in the App Platform UI after creating the app, or via `doctl`. The cleanest flow is to create the app (the spec references secret keys) and then set their values in the UI. If you prefer CLI, here are helpful commands:

```cmd
# Authenticate
doctl auth init

# (Optional) Create a container registry and push image if you prefer using images
doctl registry create my-registry
doctl registry login

# Build and push backend image (optional path)
docker build -t registry.digitalocean.com/my-registry/lumino-backend:latest -f backend/Dockerfile .
docker push registry.digitalocean.com/my-registry/lumino-backend:latest

# After `doctl apps create`, open the App in the UI and set the following secrets (recommended):
# DATABASE_URL (set to Neon connection string)
# GROQ_API_KEY or OPENAI_API_KEY
# Any other API keys (GOOGLE_API_KEY, ELEVENLABS_API_KEY)
```

Note: App Platform's CLI support for injecting secret values directly into an app spec is limited — the UI is usually the simplest and most reliable place to paste secret connection strings.


## Notes on 24/7 running and autoscaling

- App Platform: runs at least one container for web services; you can enable autoscaling to increase instances under load. It does not generally scale to zero for web services—expect at least 1 instance running (billed accordingly).
- Droplets: are VMs, always-on until stopped. You control resource usage and can stop/start any time.

## Next steps I can do for you

- Add a `doctl` app spec file (I can scaffold `digitalocean/app-spec.yaml`).
- Add a GitHub Actions workflow to build and push the backend image to the DigitalOcean Container Registry automatically.
- Help you configure a Managed Postgres and wire `DATABASE_URL` into the app.

Tell me which of the next steps you'd like me to implement and I'll scaffold the files.
