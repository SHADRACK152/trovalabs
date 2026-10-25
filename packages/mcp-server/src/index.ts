#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";

const API_URL = (process.env.TROVALABS_API_URL ?? "https://api.trovalabs.com/v1/mcp/query").replace(/\/$/, "");
const API_KEY = process.env.TROVALABS_API_KEY;

type ToolName = "search_code_context" | "get_pr_diff_summary" | "get_architectural_risk";

function requireApiKey(): string {
  if (!API_KEY || !API_KEY.startsWith("tl_live_")) {
    throw new Error("TROVALABS_API_KEY is missing or invalid. Add a live key from your TrovaLabs workspace settings.");
  }
  return API_KEY;
}

async function queryApi(tool: ToolName, args: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireApiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ tool, arguments: args }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new Error(`Could not reach TrovaLabs API: ${message}`);
  }

  const payload = await response.json().catch(() => null) as { error?: string; result?: unknown } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? `TrovaLabs API returned HTTP ${response.status}`);
  }
  return payload?.result ?? payload;
}

function resultToMcpContent(result: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    structuredContent: result && typeof result === "object" && !Array.isArray(result)
      ? result as Record<string, unknown>
      : { result },
  };
}

const server = new McpServer({ name: "trovalabs-context", version: "1.0.0" });

server.registerTool("search_code_context", {
  description: "Search indexed code and engineering context in the connected TrovaLabs workspace.",
  inputSchema: {
    query: z.string().min(1).max(1000),
    repository: z.string().max(256).optional(),
    limit: z.number().int().min(1).max(20).optional(),
  },
}, async (args) => resultToMcpContent(await queryApi("search_code_context", args)));

server.registerTool("get_pr_diff_summary", {
  description: "Retrieve an indexed pull request summary and changed-file context.",
  inputSchema: {
    repository: z.string().min(1).max(256),
    pr_number: z.number().int().positive(),
  },
}, async (args) => resultToMcpContent(await queryApi("get_pr_diff_summary", args)));

server.registerTool("get_architectural_risk", {
  description: "Retrieve TrovaLabs architectural risk analysis for a repository or code path.",
  inputSchema: {
    repository: z.string().max(256).optional(),
    path: z.string().max(1024).optional(),
  },
}, async (args) => resultToMcpContent(await queryApi("get_architectural_risk", args)));

const transport = new StdioServerTransport();
await server.connect(transport);
