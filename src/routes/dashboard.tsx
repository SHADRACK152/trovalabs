import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity, Bell, BookOpen, ChevronDown, CircleCheck, Command, GitBranch,
  Github, LayoutDashboard, LogOut, Search, Server, Settings, ShieldCheck,
  Sparkles, Users, X, Zap, type LucideIcon,
} from "lucide-react";
import { DashboardDialog, type CreateKeyRequest, type DialogMode } from "@/components/dashboard-dialogs";
import { AuthGate } from "@/components/auth-onboarding";
import { McpPlayground } from "@/components/mcp-playground";
import { getTrovaSessionToken, readApiError, TROVA_API_BASE_URL } from "@/lib/trova-api";
import {
  initialRepos, Overview, PRDrawer, PullRequests, SearchPanel,
  SettingsPanel, type ApiKey, type PR, type Repo,
} from "@/components/dashboard-panels";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "TrovaLabs | Developer Workspace" },
      { name: "description", content: "Developer context, repository activity, and MCP connections in one workspace." },
    ],
  }),
  component: Dashboard,
});

type Tab = "overview" | "pull-requests" | "mcp" | "search" | "settings";
const nav: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "pull-requests", label: "Pull Requests & Ingestion", icon: GitBranch },
  { id: "mcp", label: "MCP Hub & Protocol Playground", icon: Server },
  { id: "search", label: "Context Graph Search", icon: Search },
  { id: "settings", label: "Workspace Settings & Keys", icon: Settings },
];

export function Dashboard() {
  return <AuthGate><WorkspaceDashboard onSignOut={() => { localStorage.removeItem("trova_access_token"); localStorage.removeItem("trova_onboarding_complete"); window.location.assign("/"); }} /></AuthGate>;
}

function WorkspaceDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [repos, setRepos] = useState<Repo[]>(initialRepos);
  const [repo, setRepo] = useState(initialRepos[0]?.name ?? "trovalabs/core-api");
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("All sources");
  const [copied, setCopied] = useState("");
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("All");
  const [keys, setKeys] = useState<ApiKey[]>([
    { id: "preview-1", name: "Local MCP Server", token: "tl_live_••••••••7f42", scope: "Read / Write", created: "Preview", preview: true },
    { id: "preview-2", name: "CI Context Sync", token: "tl_live_••••••••a91c", scope: "Read", created: "Preview", preview: true },
  ]);
  const [mcpApiKey, setMcpApiKey] = useState("");
  const [mcpApiKeyId, setMcpApiKeyId] = useState<string | number | null>(null);
  const [secret, setSecret] = useState("whsec_trova_1234567890");
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDialog("search");
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  useEffect(() => {
    const sessionToken = getTrovaSessionToken();
    if (!sessionToken || sessionToken.startsWith("dev_preview_")) return;
    void fetch(`${TROVA_API_BASE_URL}/v1/mcp/keys`, { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readApiError(response));
        return response.json() as Promise<{ keys: Array<{ id: string; name: string; key_prefix: string; scopes: string[]; created_at: string; revoked_at: string | null }> }>;
      })
      .then(({ keys: serverKeys }) => setKeys(serverKeys.filter((key) => !key.revoked_at).map((key) => ({ id: key.id, name: key.name, token: `${key.key_prefix}••••••••`, scope: key.scopes.join(" / "), created: new Date(key.created_at).toLocaleDateString() }))))
      .catch((error: unknown) => setToast(error instanceof Error ? `Could not load API keys: ${error.message}` : "Could not load API keys."));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setToast(label + " copied to clipboard");
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setToast("Clipboard access is unavailable in this browser");
    }
  };

  const connectRepo = (newRepo: Repo) => {
    setRepos((current) => [...current, newRepo]);
    setRepo(newRepo.name);
    setToast("Repository connected and indexing started");
  };

  const addKey = async ({ name, scope }: CreateKeyRequest) => {
    const sessionToken = getTrovaSessionToken();
    const apiScope = scope === "Read / Write" ? "mcp:read_write" : scope === "Admin" ? "mcp:admin" : "mcp:read";
    try {
      if (!sessionToken || sessionToken.startsWith("dev_preview_")) throw new Error("Workspace admin session is not connected to the API.");
      const response = await fetch(`${TROVA_API_BASE_URL}/v1/mcp/keys`, { method: "POST", headers: { Authorization: `Bearer ${sessionToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ name, scope: apiScope }) });
      if (!response.ok) throw new Error(await readApiError(response));
      const result = await response.json() as { id: string; name: string; key_prefix: string; scopes: string[]; created_at: string; token: string };
      setMcpApiKey(result.token);
      setMcpApiKeyId(result.id);
      setKeys((current) => [{ id: result.id, name: result.name, token: `${result.key_prefix}••••••••`, scope: result.scopes.join(" / "), created: "Just now" }, ...current.filter((key) => !key.preview)]);
      return { id: result.id, token: result.token, name: result.name, scope, created: result.created_at };
    } catch (error) {
      if (!import.meta.env.DEV) throw error;
      const previewToken = `tl_live_${crypto.randomUUID().replaceAll("-", "")}`;
      const previewId = `preview-${Date.now()}`;
      setMcpApiKey(previewToken);
      setMcpApiKeyId(previewId);
      setKeys((current) => [{ id: previewId, name, token: `${previewToken.slice(0, 12)}••••••••`, scope, created: "Preview", preview: true }, ...current]);
      setToast("Preview key created locally. Connect the API service for live MCP queries.");
      return { id: previewId, token: previewToken, name, scope, created: "Preview", preview: true };
    }
  };

  const revokeKey = async (id: string | number) => {
    const key = keys.find((item) => item.id === id);
    if (!key) return;
    if (key.preview) {
      setKeys((current) => current.filter((item) => item.id !== id));
      if (mcpApiKeyId === id) { setMcpApiKey(""); setMcpApiKeyId(null); }
      setToast("Preview key removed from this page.");
      return;
    }
    try {
      const sessionToken = getTrovaSessionToken();
      const response = await fetch(`${TROVA_API_BASE_URL}/v1/mcp/keys/${encodeURIComponent(String(id))}`, { method: "DELETE", headers: { Authorization: `Bearer ${sessionToken}` } });
      if (!response.ok) throw new Error(await readApiError(response));
      setKeys((current) => current.filter((item) => item.id !== id));
      if (mcpApiKeyId === id) { setMcpApiKey(""); setMcpApiKeyId(null); }
      setToast("API key revoked.");
    } catch (error) {
      setToast(error instanceof Error ? `Could not revoke key: ${error.message}` : "Could not revoke API key.");
    }
  };

  const title = nav.find((item) => item.id === tab)?.label ?? "Overview";

  return (
    <div className="min-h-screen bg-[#e9ecef] px-3 py-4 text-[#0f172a] sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[255px_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:min-h-[calc(100vh-3rem)]">
          <div className="flex items-center gap-3 px-2 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900"><BrandMark /></span>
            <span><b className="block text-sm font-extrabold">TrovaLabs</b><small className="text-xs text-slate-400">Developer workspace</small></span>
          </div>
          <p className="mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
          <nav className="mt-2 space-y-1">
            {nav.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={"flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-semibold transition " + (tab === id ? "bg-orange-50 text-orange-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800")}>
                <Icon className={"h-[18px] w-[18px] shrink-0 " + (tab === id ? "text-orange-600" : "text-slate-400")} />
                <span className="flex-1">{label}</span>
                {id === "pull-requests" && <small className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px]">8</small>}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-8">
            <div className="rounded-[22px] bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-white shadow-sm">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-orange-100"><span>Subscription</span><Sparkles className="h-4 w-4" /></div>
              <b className="mt-2 block text-sm">Pro Plan Active</b><p className="mt-1 text-xs text-orange-50">12 of 20 seats in use</p>
              <button onClick={() => setTab("settings")} className="mt-4 w-full rounded-full bg-white/15 px-3 py-2 text-xs font-bold hover:bg-white/25">Manage subscription</button>
            </div>
            <p className="mt-4 flex items-center gap-2 px-2 text-[10px] text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />Workspace protected</p>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="relative z-30 flex flex-wrap items-center gap-3 rounded-[28px] border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
            <label className="flex min-w-[210px] flex-1 items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 sm:max-w-[270px]">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-orange-500 shadow-sm"><GitBranch className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><small className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">TrovaLabs Main</small><select value={repo} onChange={(e) => setRepo(e.target.value)} className="w-full truncate bg-transparent text-xs font-bold outline-none">{repos.map((r) => <option key={r.name}>{r.name}</option>)}</select></span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </label>
            <button onClick={() => setDialog("search")} className="flex min-w-[220px] flex-1 items-center gap-2 rounded-2xl border border-slate-100 px-3.5 py-3 text-left text-xs text-slate-400 hover:border-orange-200"><Search className="h-4 w-4 text-slate-400" /><span className="flex-1 truncate">Search commits, PRs, docs, or MCP memory...</span><kbd className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-1 text-[9px] sm:flex"><Command className="h-3 w-3" /> K</kbd></button>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 xl:flex"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />MCP Engine Online</span>
              <div className="relative"><button aria-label="Notifications" onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }} className="relative grid h-10 w-10 place-items-center rounded-2xl text-slate-500 hover:bg-slate-50"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-orange-500" /></button>{notificationsOpen && <Popover title="Notifications" onClose={() => setNotificationsOpen(false)}><p><b>PR #142 indexed</b><br />Context is ready for MCP queries.</p><p><b>Repository sync complete</b><br />14 commits added from main.</p></Popover>}</div>
              <div className="relative"><button onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }} className="flex items-center gap-2 rounded-2xl px-1.5 py-1 hover:bg-slate-50"><span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-extrabold text-white">SM</span><span className="hidden text-left sm:block"><b className="block text-xs">Shadrack Mark</b><small className="text-[10px] text-slate-400">Workspace owner</small></span><ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" /></button>{profileOpen && <Popover title="Shadrack Mark" onClose={() => setProfileOpen(false)}><button onClick={() => { setTab("overview"); setProfileOpen(false); window.location.assign("/dashboard"); }} className="flex w-full items-center gap-2 py-1 text-left"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</button><button onClick={() => { setTab("settings"); setProfileOpen(false); }} className="flex w-full items-center gap-2 py-1 text-left"><Settings className="h-3.5 w-3.5" />Workspace settings</button><button onClick={() => { setProfileOpen(false); onSignOut(); }} className="flex w-full items-center gap-2 py-1 text-left"><LogOut className="h-3.5 w-3.5" />Sign out</button></Popover>}</div>
            </div>
          </header>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3 px-1"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Workspace / {repo}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1></div>{tab === "overview" && <button onClick={() => setDialog("connect")} className="inline-flex items-center gap-2 rounded-full bg-[#f97316] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#ea580c]">+ Connect repository</button>}{tab === "pull-requests" && <button onClick={() => setFilter(filter === "All" ? "Pending" : "All")} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600">{filter === "All" ? "Filter pending" : "Show all"}</button>}</div>
          <section className="mt-4">
            {tab === "overview" && <Overview repos={repos} onConnect={() => setDialog("connect")} onPR={setSelectedPR} onTab={(id) => setTab(id as Tab)} />}
            {tab === "pull-requests" && <PullRequests filter={filter} onPR={setSelectedPR} />}
            {tab === "mcp" && <McpPlayground onCopy={copy} copied={copied} apiKey={mcpApiKey} />}
            {tab === "search" && <SearchPanel query={search} setQuery={setSearch} source={source} setSource={setSource} />}
            {tab === "settings" && <SettingsPanel keys={keys} onGenerate={() => setDialog("key")} onRevoke={revokeKey} secret={secret} setSecret={setSecret} showSecret={showSecret} setShowSecret={setShowSecret} onSave={() => { setSaved(true); setToast("Workspace settings saved"); }} saved={saved} />}
          </section>
        </main>
      </div>

      <DashboardDialog
        mode={dialog}
        onClose={() => setDialog(null)}
        onConnect={connectRepo}
        onKeyCreated={addKey}
        onCopy={copy}
        copied={copied}
        search={search}
        setSearch={setSearch}
        onSearchResults={() => { setTab("search"); setDialog(null); }}
      />
      {selectedPR && <PRDrawer pr={selectedPR} onClose={() => setSelectedPR(null)} />}
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}

function BrandMark() {
  return <span className="grid grid-cols-2 gap-[3px]"><i className="h-2 w-2 rounded-full bg-orange-500" /><i className="h-2 w-2 rounded-full bg-white" /><i className="h-2 w-2 rounded-full bg-white/70" /><i className="h-2 w-2 rounded-full bg-orange-600" /></span>;
}

function Popover({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="absolute right-0 top-12 z-50 w-64 rounded-[20px] border border-slate-100 bg-white p-4 text-xs text-slate-600 shadow-xl"><div className="mb-3 flex items-center justify-between"><b>{title}</b><button onClick={onClose} aria-label="Close" className="text-slate-400"><X className="h-4 w-4" /></button></div><div className="space-y-3">{children}</div></div>;
}
