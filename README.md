# TrovaLabs

TrovaLabs brings code, pull requests, and engineering knowledge into one searchable context hub. Developers can explore the workspace in the web dashboard or connect an MCP server to their AI editor.

## What’s in the repository

- **Product site** — landing page, pricing, documentation, API examples, and company information.
- **Workspace dashboard** — context search, repository and MCP configuration views, and workspace settings.
- **Admin dashboard** — platform overview, user and infrastructure views, audit activity, and blog publishing.
- **Blog** — publish articles from the admin area; published content appears on the public blog and can be embedded for MCP context search.
- **MCP client** — a local stdio adapter for Cursor, VS Code, Claude Code, and other MCP-compatible clients.
- **API service** — Express endpoints for MCP queries, API key management, and blog publishing, backed by PostgreSQL and pgvector.

## Tech stack

- React 19, TypeScript, and TanStack Start/Router
- Tailwind CSS 4 and Vite
- Express 5, PostgreSQL, and pgvector for the API service
- Model Context Protocol SDK for the local MCP adapter

## Run the web app

Requirements: Node.js 20 or later and npm.

```bash
git clone https://github.com/SHADRACK152/trovalabs.git
cd trovalabs
npm install
npm run dev
```

Open the local URL printed by Vite.

### Available web commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the web app in development mode. |
| `npm run build` | Build the web app for deployment. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the Vitest suite. |
| `npm run dev:api` | Start the API service. |
| `npm run build:mcp` | Build the MCP client adapter. |

## Run the API service

The API requires PostgreSQL with the `pgvector` extension and an OpenAI-compatible embeddings endpoint.

1. Create a database and enable `pgvector`.
2. Copy `services/api/.env.example` to `services/api/.env` and set the database URL, session secret, and embedding provider credentials.
3. Install the API dependencies and apply the schema:

   ```bash
   npm --prefix services/api install
   npm --prefix services/api run db:migrate
   ```

4. Start the service from the repository root:

   ```bash
   npm run dev:api
   ```

The API listens on port `4000` by default. Set `VITE_TROVALABS_API_URL=http://localhost:4000` in the web app’s root `.env` file to point the dashboard at a local API.

### Configuration reference

| Variable | Purpose |
| --- | --- |
| `PORT` | API listen port; defaults to `4000`. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `TROVALABS_SESSION_SECRET` | Secret used to verify workspace admin JWTs. |
| `TROVALABS_EMBEDDINGS_URL` | OpenAI-compatible embeddings endpoint. |
| `TROVALABS_EMBEDDINGS_API_KEY` | Embeddings provider key. |
| `TROVALABS_EMBEDDINGS_MODEL` | Embeddings model name. |
| `TROVALABS_EMBEDDING_DIMENSIONS` | Vector size; must match the database schema. |
| `TROVALABS_CORS_ORIGINS` | Comma-separated allowed dashboard origins. |
| `VITE_TROVALABS_API_URL` | API base URL used by the web app. |

Keep real secrets in local environment files or your deployment secret manager. Do not commit them.

## Connect an MCP client

Build the adapter:

```bash
npm --prefix packages/mcp-server install
npm run build:mcp
```

Configure an MCP-compatible editor with the server command and a workspace API key:

```json
{
  "mcpServers": {
    "trovalabs": {
      "command": "npx",
      "args": ["-y", "@trovalabs/mcp-server"],
      "env": {
        "TROVALABS_API_KEY": "tl_live_your_workspace_key"
      }
    }
  }
}
```

For a locally running API, also set `TROVALABS_API_URL` to `http://localhost:4000/v1/mcp/query`. Never commit a live API key.

The adapter exposes these tools:

- `search_code_context` — find relevant indexed code and engineering context.
- `get_pr_diff_summary` — retrieve a pull request’s indexed summary.
- `get_architectural_risk` — retrieve the latest available risk analysis.

## API endpoints

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/healthz` | Public service health check. |
| `GET` | `/v1/mcp/health` | Public API and database readiness. |
| `POST` | `/v1/mcp/query` | Bearer TrovaLabs API key. |
| `GET` / `POST` | `/v1/mcp/keys` | Workspace administrator session. |
| `DELETE` | `/v1/mcp/keys/:keyId` | Workspace administrator session. |
| `GET` | `/v1/blog` | Public published article list. |
| `GET` | `/v1/blog/:slug` | Public published article. |
| `GET` / `POST` | `/v1/admin/blog` | Workspace administrator session. |
| `PUT` / `DELETE` | `/v1/admin/blog/:articleId` | Workspace administrator session. |

The MCP query endpoint accepts a tool name and an `arguments` object, for example:

```json
{
  "tool": "search_code_context",
  "arguments": {
    "query": "authentication flow"
  }
}
```

## Routes

| Path | Page |
| --- | --- |
| `/` | TrovaLabs product site. |
| `/dashboard` | Developer workspace. |
| `/admin` | Administration dashboard. |
| `/info/docs` | Documentation. |
| `/info/api` | Interactive API examples. |
| `/info/blog` | Public article list. |
| `/blog/:slug` | Published article. |

## Production notes

The API verifies workspace JWTs but does not issue login sessions. Production authentication therefore needs a trusted OAuth/session issuer that signs HS256 tokens with `sub`, `workspace_id`, and `role` claims using the same `TROVALABS_SESSION_SECRET`. Configure OAuth credentials and callback routes in that issuer.

Production MCP connections also require an HTTPS API deployment, a migrated PostgreSQL/pgvector database, embedding credentials, and repository ingestion that populates the context tables. Blog posts saved without a configured API are kept only in the current browser as a local preview; they are not shared or MCP-indexed.

## Project layout

```text
packages/mcp-server/   Local stdio MCP adapter
services/api/          Express API, database migration, and service docs
src/components/        Shared dashboard, onboarding, and publishing UI
src/routes/            Product site, dashboards, blog, and information pages
```
