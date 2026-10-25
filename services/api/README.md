# TrovaLabs API service

This Express service implements the central MCP API expected by `@trovalabs/mcp-server` and the dashboard. It stores only SHA-256 hashes of generated `tl_live_` API keys. MCP queries are workspace-scoped using the key record; key management uses a signed workspace-owner/admin JWT.

## Requirements

- Node.js 20+
- PostgreSQL with the pgvector extension available
- An OpenAI-compatible embeddings endpoint and API key for semantic search
- `TROVALABS_SESSION_SECRET` shared with the service that issues TrovaLabs workspace JWTs (`HS256`, claims `sub`, `workspace_id`, and `role`)

Copy `.env.example` to `.env`, configure secrets, then run `npm install`, `npm run db:migrate`, and `npm run dev`. The migration creates key, context chunk, pull request, and architectural risk tables. Repository ingestion must populate the context tables for queries to return content.

## Endpoints

- `GET /v1/mcp/health` — API, PostgreSQL, and vector-index readiness.
- `POST /v1/mcp/query` — Bearer `tl_live_...` key; body `{ "tool": "search_code_context", "arguments": { "query": "..." } }`.
- `GET /v1/mcp/keys` — signed workspace admin session; lists keys without returning secrets.
- `POST /v1/mcp/keys` — signed workspace admin session; creates and returns a key once.
- `DELETE /v1/mcp/keys/:keyId` — signed workspace admin session; revokes a key in the current workspace.
- `GET /v1/blog` and `GET /v1/blog/:slug` — public published blog listing and article content.
- `GET /v1/admin/blog`, `POST /v1/admin/blog`, `PUT /v1/admin/blog/:articleId`, `DELETE /v1/admin/blog/:articleId` — workspace admin session; create, edit, publish, and delete articles. Publishing embeds article text for MCP context search.

Set `TROVALABS_CORS_ORIGINS` to the exact dashboard origins. Do not expose database or embedding credentials to the browser. Publish this service behind HTTPS at `api.trovalabs.com` before configuring production MCP clients.
