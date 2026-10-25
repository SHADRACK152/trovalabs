CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS mcp_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  created_by text NOT NULL,
  name text NOT NULL,
  key_hash char(64) NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['mcp:read'],
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS mcp_api_keys_workspace_idx ON mcp_api_keys(workspace_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS context_chunks (
  id bigserial PRIMARY KEY,
  workspace_id uuid NOT NULL,
  repository text NOT NULL,
  path text NOT NULL,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  indexed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS context_chunks_workspace_repo_idx ON context_chunks(workspace_id, repository);
CREATE INDEX IF NOT EXISTS context_chunks_embedding_idx ON context_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS pull_request_context (
  id bigserial PRIMARY KEY,
  workspace_id uuid NOT NULL,
  repository text NOT NULL,
  pr_number integer NOT NULL,
  title text NOT NULL,
  state text NOT NULL,
  summary text NOT NULL,
  changed_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  merged_at timestamptz,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, repository, pr_number)
);

CREATE TABLE IF NOT EXISTS architecture_risk_reports (
  id bigserial PRIMARY KEY,
  workspace_id uuid NOT NULL,
  repository text NOT NULL,
  target_path text,
  risk_level text NOT NULL,
  score numeric(5,4) NOT NULL,
  report jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS architecture_risk_latest_idx ON architecture_risk_reports(workspace_id, repository, generated_at DESC);

CREATE TABLE IF NOT EXISTS blog_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content_text text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author text NOT NULL,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS blog_articles_public_idx ON blog_articles(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS blog_articles_embedding_idx ON blog_articles USING hnsw (embedding vector_cosine_ops) WHERE embedding IS NOT NULL AND status = 'published';
