# @trovalabs/mcp-server

Local stdio MCP adapter for Cursor, VS Code, Claude Code, and other MCP clients. It forwards the three TrovaLabs tools to the central API over HTTPS. It writes protocol messages only to stdout; diagnostics belong on stderr.

## Configure

Set `TROVALABS_API_KEY` to a workspace key created by TrovaLabs. Optionally set `TROVALABS_API_URL` to point at a non-production API environment. The default is `https://api.trovalabs.com/v1/mcp/query`.

```json
{
  "mcpServers": {
    "trovalabs": {
      "command": "npx",
      "args": ["-y", "@trovalabs/mcp-server"],
      "env": { "TROVALABS_API_KEY": "tl_live_replace_with_your_key" }
    }
  }
}
```

Never commit a live key to source control. Revoke a key from workspace settings if it is exposed.

## Develop locally

From this folder run `npm install`, `npm run build`, then configure the MCP client to run `node` with `packages/mcp-server/dist/index.js` as its argument. Set `TROVALABS_API_URL=http://localhost:4000/v1/mcp/query` when using the local API service.
