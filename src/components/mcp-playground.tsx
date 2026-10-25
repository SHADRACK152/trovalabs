import { useEffect, useState } from "react";
import { Activity, CirclePlay, Clock3, Code2, Copy, Radio, Server, Sparkles, Terminal } from "lucide-react";
import { readApiError, TROVA_API_BASE_URL } from "@/lib/trova-api";

type Editor = "Cursor IDE" | "VS Code" | "Claude Code / Anthropic Desktop";
type Tool = "search_code_context" | "get_pr_diff_summary" | "get_architectural_risk";

const editorOptions: { name: Editor; file: string }[] = [
  { name: "Cursor IDE", file: ".cursor/mcp.json" },
  { name: "VS Code", file: ".vscode/mcp.json" },
  { name: "Claude Code / Anthropic Desktop", file: "claude_desktop_config.json" },
];
const tools: { id: Tool; label: string; description: string }[] = [
  { id: "search_code_context", label: "search_code_context", description: "Query workspace memory" },
  { id: "get_pr_diff_summary", label: "get_pr_diff_summary", description: "Fetch live PR context" },
  { id: "get_architectural_risk", label: "get_architectural_risk", description: "Run Trova Metric analysis" },
];
const endpoint = `${TROVA_API_BASE_URL}/v1/mcp/query`;

export function McpPlayground({ onCopy, copied, apiKey }: { onCopy: (value: string, label: string) => void; copied: string; apiKey: string }) {
  const [editor, setEditor] = useState<Editor>("Cursor IDE");
  const [tool, setTool] = useState<Tool>("search_code_context");
  const [query, setQuery] = useState("");
  const [repository, setRepository] = useState("trovalabs/core-api");
  const [prNumber, setPrNumber] = useState("142");
  const [targetPath, setTargetPath] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState(0);
  const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");
  const [healthLabel, setHealthLabel] = useState("Checking API health…");

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    const checkHealth = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(`${TROVA_API_BASE_URL}/v1/mcp/health`, { signal: controller.signal });
        if (!response.ok) throw new Error(await readApiError(response));
        const payload = await response.json() as { status?: string; version?: string };
        if (!active) return;
        if (payload.status !== "online") throw new Error("MCP API is degraded");
        setHealth("online"); setHealthLabel(`Server Online · v${payload.version ?? "1.2.0"}`);
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
        setHealth("offline"); setHealthLabel("API unavailable");
      }
    };
    void checkHealth();
    const timer = window.setInterval(() => void checkHealth(), 30_000);
    return () => { active = false; controller?.abort(); window.clearInterval(timer); };
  }, []);

  const executeTool = async () => {
    setRunning(true);
    setResult(null);
    if (!apiKey) {
      setResult({ error: "Generate an MCP API key in Workspace Settings before calling tools." });
      setRunning(false);
      return;
    }
    const args = tool === "search_code_context"
      ? { query: query.trim() || "authentication flow refactor", repository }
      : tool === "get_pr_diff_summary"
        ? { repository, pr_number: Number(prNumber) }
        : { repository, ...(targetPath.trim() ? { path: targetPath.trim() } : {}) };
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ tool, arguments: args }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const payload = await response.json() as { result?: unknown };
      setResult(payload.result ?? payload);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "MCP request failed", endpoint });
    } finally {
      setRunId((id) => id + 1);
      setRunning(false);
    }
  };

  const config = JSON.stringify({ mcpServers: { trovalabs: { command: "npx", args: ["-y", "@trovalabs/mcp-server"], env: { TROVALABS_API_KEY: apiKey || "YOUR_TROVALABS_API_KEY" } } } }, null, 2);

  return <div className="space-y-4">
    <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-orange-600">Developer tools</p><h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Model Context Protocol (MCP) Hub</h2><p className="mt-1 text-xs text-slate-500">Manage editor connections and test your context tools.</p></div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-bold ${health === "online" ? "bg-emerald-50 text-emerald-700" : health === "offline" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}><i className={`h-2 w-2 rounded-full ${health === "online" ? "animate-pulse bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,.65)]" : health === "offline" ? "bg-rose-500" : "animate-pulse bg-slate-400"}`} />{healthLabel}</span>
      </div>
      <div className="mt-5 grid gap-3 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-orange-600 shadow-sm"><Radio className="h-4 w-4" /></span><div><b className="block text-xs">Central API endpoint</b><span className="text-[10px] text-slate-400">HTTPS · Bearer key · JSON</span></div></div><button onClick={() => onCopy(endpoint, "MCP endpoint")} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-orange-300 hover:text-orange-700"><Copy className="h-3 w-3" />{copied === "MCP endpoint" ? "Copied" : "Copy endpoint"}</button></div><code className="mt-4 block overflow-x-auto rounded-xl bg-white px-3.5 py-3 text-xs font-semibold text-slate-700">{endpoint}</code><p className="mt-2 text-[10px] text-slate-400">Local IDE transport: <code className="text-slate-600">npx -y @trovalabs/mcp-server</code></p></div>
        <div className="rounded-[24px] border border-slate-100 p-4 sm:p-5"><div className="flex items-center justify-between"><div><b className="text-xs">Active sessions</b><p className="mt-1 text-[10px] text-slate-400">Editor connections</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">2 online</span></div><div className="mt-3 space-y-2"><SessionRow editor="Cursor IDE" status="Connected" /><SessionRow editor="Claude Code CLI" status="Connected" /><SessionRow editor="VS Code" status="Idle" /></div></div>
      </div>
    </section>

    <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">01 / Configure</p><h2 className="mt-1 text-base font-extrabold">IDE configuration generator</h2></div><span className="flex items-center gap-1.5 text-[10px] text-slate-400"><Code2 className="h-3.5 w-3.5" />Copy-paste ready</span></div>
      <div role="tablist" aria-label="IDE configuration" className="mt-4 flex gap-1 overflow-x-auto rounded-2xl bg-slate-50 p-1">{editorOptions.map((option) => <button key={option.name} role="tab" aria-selected={editor === option.name} onClick={() => setEditor(option.name)} className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-[10px] font-bold transition sm:text-xs ${editor === option.name ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{option.name}</button>)}</div>
      <div className="mt-3 overflow-hidden rounded-[24px] bg-slate-900">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="flex items-center gap-2 font-mono text-[10px] text-slate-400"><Terminal className="h-3.5 w-3.5" />{editorOptions.find((option) => option.name === editor)?.file}</span><span className="flex gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-400" /><i className="h-2 w-2 rounded-full bg-amber-300" /><i className="h-2 w-2 rounded-full bg-emerald-400" /></span></div>
        <pre className="overflow-x-auto p-4 text-[11px] leading-6 sm:p-5 sm:text-xs"><code><ConfigCode apiKey={apiKey || "YOUR_TROVALABS_API_KEY"} /></code></pre>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] text-slate-400">Replace the sample key with your workspace API key.</p><button onClick={() => onCopy(config, "MCP configuration")} className="inline-flex items-center gap-2 rounded-full bg-[#f97316] px-5 py-3 text-[10px] font-extrabold tracking-wide text-white transition hover:bg-[#ea580c]"><Copy className="h-3.5 w-3.5" />{copied === "MCP configuration" ? "COPIED" : "COPY CONFIGURATION"}</button></div>
    </section>

    <section className="rounded-[32px] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">02 / Playground</p><h2 className="mt-1 text-base font-extrabold">Test an MCP tool</h2><p className="mt-1 text-xs text-slate-500">Try a sample query against the workspace context tools.</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-bold text-orange-700"><Sparkles className="h-3 w-3" />Interactive preview</span></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-3">
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">MCP tool<select value={tool} onChange={(event) => setTool(event.target.value as Tool)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400">{tools.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <p className="-mt-1 text-[10px] leading-5 text-slate-400">{tools.find((item) => item.id === tool)?.description}</p>
          {tool === "search_code_context" && <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Query<input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void executeTool(); }} placeholder="authentication flow refactor" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-medium normal-case tracking-normal text-slate-700 outline-none placeholder:text-slate-300 focus:border-orange-400" /></label>}
          {tool !== "search_code_context" && <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Repository<input value={repository} onChange={(event) => setRepository(event.target.value)} placeholder="organization/repository" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-orange-400" /></label>}
          {tool === "get_pr_diff_summary" && <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Pull request number<input type="number" min="1" value={prNumber} onChange={(event) => setPrNumber(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-orange-400" /></label>}
          {tool === "get_architectural_risk" && <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Target path (optional)<input value={targetPath} onChange={(event) => setTargetPath(event.target.value)} placeholder="src/auth/controller.ts" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-orange-400" /></label>}
          <button disabled={running} onClick={executeTool} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f97316] px-5 py-3.5 text-xs font-extrabold text-white transition hover:bg-[#ea580c] disabled:cursor-wait disabled:opacity-70"><CirclePlay className="h-4 w-4" />{running ? "RUNNING TOOL..." : "EXECUTE MCP TOOL"}</button>
          <p className="flex items-center gap-1.5 text-[10px] text-slate-400"><Clock3 className="h-3 w-3" />{apiKey ? "Calls the TrovaLabs MCP API." : "Generate a key in Workspace Settings to run a query."}</p>
        </div>
        <div className="min-h-56 overflow-hidden rounded-[24px] bg-slate-950">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="flex items-center gap-2 text-[10px] font-bold text-slate-300"><Activity className="h-3.5 w-3.5 text-emerald-400" />Response viewer</span><span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-semibold text-slate-400">JSON</span></div>
          {result ? <pre key={runId} className="max-h-80 overflow-auto p-4 text-[10px] leading-5 text-emerald-200 sm:text-xs"><code>{JSON.stringify(result, null, 2)}</code></pre> : <div className="grid min-h-48 place-items-center p-6 text-center"><div><span className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-white/5 text-slate-500"><Server className="h-4 w-4" /></span><p className="mt-3 text-xs font-semibold text-slate-300">{running ? "Calling tool…" : "Your tool response will appear here"}</p><p className="mt-1 text-[10px] text-slate-500">Select a tool and execute a sample query.</p></div></div>}
        </div>
      </div>
    </section>
  </div>;
}

function SessionRow({ editor, status }: { editor: string; status: "Connected" | "Idle" }) { return <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"><span className={`h-1.5 w-1.5 rounded-full ${status === "Connected" ? "bg-emerald-500" : "bg-slate-300"}`} /><span className="flex-1 text-[10px] font-semibold text-slate-600">{editor}</span><span className={`text-[9px] font-bold ${status === "Connected" ? "text-emerald-700" : "text-slate-400"}`}>{status}</span></div>; }

function ConfigCode({ apiKey }: { apiKey: string }) {
  return <span className="text-slate-300">
    <span className="block">{"{"}</span>
    <span className="block">  <span className="text-sky-300">&quot;mcpServers&quot;</span>: {"{"}</span>
    <span className="block">    <span className="text-sky-300">&quot;trovalabs&quot;</span>: {"{"}</span>
    <span className="block">      <span className="text-sky-300">&quot;command&quot;</span>: <span className="text-emerald-300">&quot;npx&quot;</span>,</span>
    <span className="block">      <span className="text-sky-300">&quot;args&quot;</span>: [<span className="text-emerald-300">&quot;-y&quot;</span>, <span className="text-emerald-300">&quot;@trovalabs/mcp-server&quot;</span>],</span>
    <span className="block">      <span className="text-sky-300">&quot;env&quot;</span>: {"{"}</span>
    <span className="block">        <span className="text-sky-300">&quot;TROVALABS_API_KEY&quot;</span>: <span className="text-amber-300">&quot;{apiKey}&quot;</span></span>
    <span className="block">      {"}"}</span>
    <span className="block">    {"}"}</span>
    <span className="block">  {"}"}</span>
    <span className="block">{"}"}</span>
  </span>;
}
