import { createHash, randomBytes } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { jwtVerify } from "jose";
import { Pool } from "pg";

type Session = { sub: string; workspace_id: string; role: string };
type ApiKey = { id: string; workspace_id: string; scopes: string[] };
type MCPTool = "search_code_context" | "get_pr_diff_summary" | "get_architectural_risk";
type MCPArguments = Record<string, unknown>;

const port = Number(process.env.PORT ?? 4000);
const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, max: 20, idleTimeoutMillis: 30_000 }) : null;
const sessionSecret = process.env.TROVALABS_SESSION_SECRET;
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "128kb", strict: true }));

const allowedOrigins = new Set((process.env.TROVALABS_CORS_ORIGINS ?? "http://localhost:8080,http://127.0.0.1:8080").split(",").map((value) => value.trim()).filter(Boolean));
app.use((request, response, next) => {
  const origin = request.header("origin");
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  }
  if (request.method === "OPTIONS") return response.sendStatus(204);
  next();
});

function sendError(response: Response, status: number, message: string) {
  return response.status(status).json({ error: message });
}

async function requireSession(request: Request, response: Response, next: NextFunction) {
  if (!sessionSecret) return sendError(response, 503, "Workspace session verification is not configured.");
  const authorization = request.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match?.[1]) return sendError(response, 401, "A TrovaLabs workspace session is required.");
  try {
    const { payload } = await jwtVerify(match[1], new TextEncoder().encode(sessionSecret), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.workspace_id !== "string" || !["owner", "admin"].includes(String(payload.role))) {
      return sendError(response, 403, "Workspace administrator access is required.");
    }
    response.locals.session = { sub: payload.sub, workspace_id: payload.workspace_id, role: String(payload.role) } satisfies Session;
    next();
  } catch {
    return sendError(response, 401, "Workspace session is invalid or expired.");
  }
}

async function requireApiKey(request: Request, response: Response, next: NextFunction) {
  if (!pool) return sendError(response, 503, "MCP database is not configured.");
  const authorization = request.header("authorization") ?? "";
  const match = /^Bearer\s+(tl_live_[A-Za-z0-9_-]{24,})$/i.exec(authorization);
  if (!match?.[1]) return sendError(response, 401, "A valid TrovaLabs API key is required.");
  const hash = createHash("sha256").update(match[1]).digest("hex");
  try {
    const result = await pool.query<ApiKey>(
      "SELECT id, workspace_id, scopes FROM mcp_api_keys WHERE key_hash = $1 AND revoked_at IS NULL LIMIT 1",
      [hash],
    );
    const key = result.rows[0];
    if (!key || !key.scopes.some((scope) => ["mcp:read", "mcp:read_write", "mcp:admin"].includes(scope))) return sendError(response, 401, "API key is invalid, revoked, or missing MCP access scope.");
    response.locals.apiKey = key;
    void pool.query("UPDATE mcp_api_keys SET last_used_at = now() WHERE id = $1", [key.id]).catch((error: unknown) => console.error("Could not update API key usage", error));
    next();
  } catch (error) {
    console.error("API key validation failed", error);
    return sendError(response, 503, "Could not validate API key.");
  }
}

app.get("/healthz", (_request, response) => response.json({ status: "ok", service: "trovalabs-api" }));
app.get("/v1/mcp/health", async (_request, response) => {
  if (!pool) return response.status(503).json({ status: "degraded", version: "1.2.0", checks: { database: "not_configured" } });
  try {
    await pool.query("SELECT 1");
    return response.json({ status: "online", version: "1.2.0", checks: { database: "operational", vector_index: "operational" } });
  } catch (error) {
    console.error("MCP health check failed", error);
    return response.status(503).json({ status: "degraded", version: "1.2.0", checks: { database: "unavailable" } });
  }
});

app.post("/v1/mcp/keys", requireSession, async (request, response) => {
  if (!pool) return sendError(response, 503, "MCP database is not configured.");
  const session = response.locals.session as Session;
  const name = typeof request.body?.name === "string" ? request.body.name.trim().slice(0, 80) : "";
  const scope = typeof request.body?.scope === "string" ? request.body.scope : "mcp:read";
  if (!name) return sendError(response, 400, "Key name is required.");
  if (!["mcp:read", "mcp:read_write", "mcp:admin"].includes(scope)) return sendError(response, 400, "Unsupported API key scope.");
  const apiKey = `tl_live_${randomBytes(32).toString("base64url")}`;
  const keyHash = createHash("sha256").update(apiKey).digest("hex");
  try {
    const result = await pool.query<{ id: string; name: string; key_prefix: string; scopes: string[]; created_at: Date }>(
      `INSERT INTO mcp_api_keys (workspace_id, created_by, name, key_hash, key_prefix, scopes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, key_prefix, scopes, created_at`,
      [session.workspace_id, session.sub, name, keyHash, apiKey.slice(0, 16), [scope]],
    );
    return response.status(201).json({ ...result.rows[0], token: apiKey });
  } catch (error) {
    console.error("API key creation failed", error);
    return sendError(response, 500, "Could not create API key.");
  }
});

app.get("/v1/mcp/keys", requireSession, async (_request, response) => {
  if (!pool) return sendError(response, 503, "MCP database is not configured.");
  const session = response.locals.session as Session;
  try {
    const result = await pool.query(
      `SELECT id, name, key_prefix, scopes, created_at, last_used_at, revoked_at
       FROM mcp_api_keys WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [session.workspace_id],
    );
    return response.json({ keys: result.rows });
  } catch (error) {
    console.error("API key listing failed", error);
    return sendError(response, 500, "Could not load API keys.");
  }
});

app.delete("/v1/mcp/keys/:keyId", requireSession, async (request, response) => {
  if (!pool) return sendError(response, 503, "MCP database is not configured.");
  const session = response.locals.session as Session;
  try {
    const result = await pool.query(
      "UPDATE mcp_api_keys SET revoked_at = now() WHERE id = $1 AND workspace_id = $2 AND revoked_at IS NULL RETURNING id",
      [request.params.keyId, session.workspace_id],
    );
    if (!result.rowCount) return sendError(response, 404, "Active API key was not found in this workspace.");
    return response.status(204).end();
  } catch (error) {
    console.error("API key revocation failed", error);
    return sendError(response, 500, "Could not revoke API key.");
  }
});

app.get("/v1/blog", async (_request, response) => {
  if (!pool) return sendError(response, 503, "Blog API is not configured.");
  try {
    const result = await pool.query(
      `SELECT slug, title, excerpt, author, published_at, updated_at
       FROM blog_articles WHERE status = 'published' ORDER BY published_at DESC LIMIT 100`,
    );
    return response.json({ articles: result.rows });
  } catch (error) {
    console.error("Public blog listing failed", error);
    return sendError(response, 500, "Could not load blog articles.");
  }
});

app.get("/v1/blog/:slug", async (request, response) => {
  if (!pool) return sendError(response, 503, "Blog API is not configured.");
  try {
    const result = await pool.query(
      `SELECT slug, title, excerpt, content_text, author, published_at, updated_at
       FROM blog_articles WHERE slug = $1 AND status = 'published' LIMIT 1`,
      [request.params.slug],
    );
    if (!result.rowCount) return sendError(response, 404, "Published article was not found.");
    return response.json({ article: result.rows[0] });
  } catch (error) {
    console.error("Public blog article read failed", error);
    return sendError(response, 500, "Could not load this article.");
  }
});

app.get("/v1/admin/blog", requireSession, async (_request, response) => {
  if (!pool) return sendError(response, 503, "Blog API is not configured.");
  try {
    const result = await pool.query(
      `SELECT id, slug, title, excerpt, content_text, status, author, created_at, updated_at, published_at
       FROM blog_articles ORDER BY updated_at DESC LIMIT 200`,
    );
    return response.json({ articles: result.rows });
  } catch (error) {
    console.error("Admin blog listing failed", error);
    return sendError(response, 500, "Could not load admin articles.");
  }
});

app.post("/v1/admin/blog", requireSession, async (request, response) => {
  if (!pool) return sendError(response, 503, "Blog API is not configured.");
  const session = response.locals.session as Session;
  const fields = readBlogFields(request.body);
  if ("error" in fields) return sendError(response, 400, fields.error);
  try {
    const slug = makeSlug(fields.title);
    const embedding = fields.status === "published" ? `[${(await embed(`${fields.title}\n${fields.excerpt}\n${fields.content}`)).join(",")}]` : null;
    const result = await pool.query(
      `INSERT INTO blog_articles (slug, title, excerpt, content_text, status, author, embedding, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector, CASE WHEN $5 = 'published' THEN now() ELSE NULL END)
       RETURNING id, slug, title, excerpt, content_text, status, author, created_at, updated_at, published_at`,
      [slug, fields.title, fields.excerpt, fields.content, fields.status, session.sub, embedding],
    );
    return response.status(201).json({ article: result.rows[0] });
  } catch (error) {
    if (isUniqueViolation(error)) return sendError(response, 409, "An article with that URL already exists. Edit the existing post instead.");
    if (error instanceof ApiError) return sendError(response, error.status, error.message);
    console.error("Blog article creation failed", error);
    return sendError(response, 500, "Could not save article.");
  }
});

app.put("/v1/admin/blog/:articleId", requireSession, async (request, response) => {
  if (!pool) return sendError(response, 503, "Blog API is not configured.");
  const fields = readBlogFields(request.body);
  if ("error" in fields) return sendError(response, 400, fields.error);
  try {
    const embedding = fields.status === "published" ? `[${(await embed(`${fields.title}\n${fields.excerpt}\n${fields.content}`)).join(",")}]` : null;
    const result = await pool.query(
      `UPDATE blog_articles SET title = $2, excerpt = $3, content_text = $4, status = $5,
         embedding = $6::vector, updated_at = now(),
         published_at = CASE WHEN $5 = 'published' THEN COALESCE(published_at, now()) ELSE NULL END
       WHERE id = $1
       RETURNING id, slug, title, excerpt, content_text, status, author, created_at, updated_at, published_at`,
      [request.params.articleId, fields.title, fields.excerpt, fields.content, fields.status, embedding],
    );
    if (!result.rowCount) return sendError(response, 404, "Article was not found.");
    return response.json({ article: result.rows[0] });
  } catch (error) {
    if (error instanceof ApiError) return sendError(response, error.status, error.message);
    console.error("Blog article update failed", error);
    return sendError(response, 500, "Could not update article.");
  }
});

app.delete("/v1/admin/blog/:articleId", requireSession, async (request, response) => {
  if (!pool) return sendError(response, 503, "Blog API is not configured.");
  try {
    const result = await pool.query("DELETE FROM blog_articles WHERE id = $1 RETURNING id", [request.params.articleId]);
    if (!result.rowCount) return sendError(response, 404, "Article was not found.");
    return response.status(204).end();
  } catch (error) {
    console.error("Blog article delete failed", error);
    return sendError(response, 500, "Could not delete article.");
  }
});

app.post("/v1/mcp/query", requireApiKey, async (request, response) => {
  const key = response.locals.apiKey as ApiKey;
  const body = request.body as { tool?: unknown; arguments?: unknown };
  if (typeof body.tool !== "string" || !isTool(body.tool)) return sendError(response, 400, "Unknown MCP tool.");
  if (!body.arguments || typeof body.arguments !== "object" || Array.isArray(body.arguments)) return sendError(response, 400, "Tool arguments must be a JSON object.");
  const args = body.arguments as MCPArguments;
  try {
    let result: unknown;
    if (body.tool === "search_code_context") result = await searchContext(key.workspace_id, args);
    else if (body.tool === "get_pr_diff_summary") result = await getPullRequest(key.workspace_id, args);
    else result = await getArchitecturalRisk(key.workspace_id, args);
    return response.json({ tool: body.tool, result });
  } catch (error) {
    if (error instanceof ApiError) return sendError(response, error.status, error.message);
    console.error("MCP query failed", error);
    return sendError(response, 500, "MCP query failed.");
  }
});

class ApiError extends Error { constructor(readonly status: number, message: string) { super(message); } }
function isTool(value: string): value is MCPTool { return ["search_code_context", "get_pr_diff_summary", "get_architectural_risk"].includes(value); }
function getPool() { if (!pool) throw new ApiError(503, "MCP database is not configured."); return pool; }
function requiredString(args: MCPArguments, key: string, maxLength: number) { const value = args[key]; if (typeof value !== "string" || !value.trim() || value.length > maxLength) throw new ApiError(400, `Invalid ${key}.`); return value.trim(); }
function readBlogFields(body: unknown): { title: string; excerpt: string; content: string; status: "draft" | "published" } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Article fields are required." };
  const record = body as Record<string, unknown>;
  const title = typeof record.title === "string" ? cleanText(record.title).trim() : "";
  const excerpt = typeof record.excerpt === "string" ? cleanText(record.excerpt).trim() : "";
  const content = typeof record.content === "string" ? cleanText(record.content).trim() : "";
  const status = record.status === "published" ? "published" : record.status === "draft" ? "draft" : null;
  if (title.length < 3 || title.length > 180) return { error: "Title must be between 3 and 180 characters." };
  if (excerpt.length > 500) return { error: "Excerpt must be 500 characters or less." };
  if (content.length < 20 || content.length > 200_000) return { error: "Article content must be between 20 and 200,000 characters." };
  if (!status) return { error: "Status must be draft or published." };
  return { title, excerpt, content, status };
}
function cleanText(value: string) { return value.replaceAll("\u0000", "").replace(/\r\n?/g, "\n"); }
function makeSlug(value: string) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) || `article-${randomBytes(4).toString("hex")}`; }
function isUniqueViolation(error: unknown): error is { code: string } { return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505"); }

async function embed(query: string): Promise<number[]> {
  const url = process.env.TROVALABS_EMBEDDINGS_URL;
  const apiKey = process.env.TROVALABS_EMBEDDINGS_API_KEY;
  const model = process.env.TROVALABS_EMBEDDINGS_MODEL ?? "text-embedding-3-small";
  if (!url || !apiKey) throw new ApiError(503, "Context search is not configured with an embedding provider.");
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, input: query }), signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new ApiError(502, "Embedding provider could not process this query.");
  const payload = await response.json() as { data?: Array<{ embedding?: number[] }> };
  const vector = payload.data?.[0]?.embedding;
  const expected = Number(process.env.TROVALABS_EMBEDDING_DIMENSIONS ?? 1536);
  if (!vector || vector.length !== expected || vector.some((value) => !Number.isFinite(value))) throw new ApiError(502, "Embedding provider returned an invalid vector.");
  return vector;
}

async function searchContext(workspaceId: string, args: MCPArguments) {
  const query = requiredString(args, "query", 1000);
  const repository = typeof args.repository === "string" && args.repository.trim() ? args.repository.trim().slice(0, 256) : null;
  const requestedLimit = typeof args.limit === "number" && Number.isInteger(args.limit) ? args.limit : 8;
  const limit = Math.max(1, Math.min(requestedLimit, 20));
  const vector = await embed(query);
  const pgVector = `[${vector.join(",")}]`;
  const result = await getPool().query(
    `SELECT repository, path, snippet, ROUND((1 - distance)::numeric, 4) AS relevance, source FROM (
       SELECT repository, path, LEFT(content, 1800) AS snippet, embedding <=> $2::vector AS distance, 'repository' AS source
       FROM context_chunks WHERE workspace_id = $1 AND ($3::text IS NULL OR repository = $3)
       UNION ALL
       SELECT 'TrovaLabs Blog' AS repository, '/blog/' || slug AS path, LEFT(title || E'\\n' || content_text, 1800) AS snippet,
              embedding <=> $2::vector AS distance, 'blog_article' AS source
       FROM blog_articles WHERE status = 'published' AND embedding IS NOT NULL
     ) AS indexed_context
     ORDER BY distance
     LIMIT $4`,
    [workspaceId, pgVector, repository, limit],
  );
  return { query, matches: result.rows, returned: result.rowCount };
}

async function getPullRequest(workspaceId: string, args: MCPArguments) {
  const repository = requiredString(args, "repository", 256);
  const number = args.pr_number;
  if (typeof number !== "number" || !Number.isInteger(number) || number < 1) throw new ApiError(400, "Invalid pr_number.");
  const result = await getPool().query(
    `SELECT repository, pr_number, title, state, summary, changed_files, merged_at, indexed_at
     FROM pull_request_context WHERE workspace_id = $1 AND repository = $2 AND pr_number = $3 LIMIT 1`,
    [workspaceId, repository, number],
  );
  if (!result.rowCount) throw new ApiError(404, "Pull request context was not found in this workspace.");
  return result.rows[0];
}

async function getArchitecturalRisk(workspaceId: string, args: MCPArguments) {
  const repository = typeof args.repository === "string" && args.repository.trim() ? args.repository.trim().slice(0, 256) : null;
  const targetPath = typeof args.path === "string" && args.path.trim() ? args.path.trim().slice(0, 1024) : null;
  const result = await getPool().query(
    `SELECT repository, target_path, risk_level, score, report, generated_at
     FROM architecture_risk_reports
     WHERE workspace_id = $1 AND ($2::text IS NULL OR repository = $2) AND ($3::text IS NULL OR target_path = $3)
     ORDER BY generated_at DESC LIMIT 1`,
    [workspaceId, repository, targetPath],
  );
  if (!result.rowCount) throw new ApiError(404, "No architectural risk report was found for that target.");
  return result.rows[0];
}

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error("Unhandled API error", error);
  return sendError(response, 500, "Unexpected API error.");
});

const server = app.listen(port, () => console.error(`TrovaLabs API listening on :${port}`));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => { void pool?.end().finally(() => process.exit(0)); }));
}

export { app };
