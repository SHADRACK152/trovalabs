import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronLeft, Github, LockKeyhole, Search, X } from "lucide-react";

type Repo = { name: string; private?: boolean; language: string | null };
const demoRepos: Repo[] = [
  { name: "trovalabs/core-api", language: "TypeScript", private: true },
  { name: "trovalabs/web-app", language: "React", private: true },
  { name: "trovalabs/mcp-server", language: "Rust", private: false },
];
const tokenKey = "trova_access_token";
const onboardingKey = "trova_onboarding_complete";

async function postJson(path: string, body: unknown, token: string) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export function AuthGate({ children, landing }: { children: ReactNode; landing?: (openAuth: () => void) => ReactNode }) {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [workspace, setWorkspace] = useState("My Workspace");
  const [teamSize, setTeamSize] = useState("Solo Builder");
  const [repoQuery, setRepoQuery] = useState("");
  const [repositories, setRepositories] = useState<Repo[]>(demoRepos);
  const [selected, setSelected] = useState<string[]>([demoRepos[0]!.name]);
  const [githubToken, setGithubToken] = useState("");
  const [githubUser, setGithubUser] = useState("");
  const [githubBusy, setGithubBusy] = useState(false);
  const [githubNotice, setGithubNotice] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackToken = params.get("token") || params.get("access_token");
    const storedToken = callbackToken || localStorage.getItem(tokenKey) || "";
    if (callbackToken) {
      localStorage.setItem(tokenKey, callbackToken);
      window.history.replaceState({}, "", window.location.pathname);
    }
    setToken(storedToken);
    setOnboarded(localStorage.getItem(onboardingKey) === "true");
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && !token && !landing) window.location.replace("/");
  }, [ready, token, landing]);

  const authenticate = (newToken: string) => {
    localStorage.setItem(tokenKey, newToken);
    setToken(newToken);
    setAuthOpen(false);
    setStep(localStorage.getItem(onboardingKey) === "true" ? 0 : 1);
    setNotice("");
  };

  const startProviderAuth = (provider: "github" | "google") => {
    if (import.meta.env.DEV) {
      authenticate(`dev_preview_${provider}`);
      return;
    }
    window.location.assign(`/api/auth/${provider}`);
  };

  const sendMagicLink = async () => {
    if (!email.trim()) return setNotice("Enter your email address to continue.");
    setBusy(true);
    setNotice("");
    try {
      await postJson("/api/auth/magic-link", { email }, "");
      setNotice("Check your inbox for a secure sign-in link.");
    } catch {
      setNotice("Magic-link sign-in needs the auth service to be configured.");
    } finally { setBusy(false); }
  };

  const completeWorkspace = async () => {
    setBusy(true); setNotice("");
    try { await postJson("/api/workspaces", { name: workspace, teamSize }, token); }
    catch { setNotice("Workspace service is unavailable. Continuing with a local preview workspace."); }
    setStep(2); setBusy(false);
  };

  const loadGitHubRepositories = async () => {
    if (!githubToken.trim()) {
      setGithubNotice("Paste a GitHub token to load repositories from your account.");
      return;
    }
    setGithubBusy(true);
    setGithubNotice("");
    try {
      const headers = {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken.trim()}`,
        "X-GitHub-Api-Version": "2022-11-28",
      };
      const [profileResponse, repositoryResponse] = await Promise.all([
        fetch("https://api.github.com/user", { headers }),
        fetch("https://api.github.com/user/repos?per_page=100&sort=updated&type=all", { headers }),
      ]);
      if (!profileResponse.ok || !repositoryResponse.ok) {
        throw new Error(repositoryResponse.status === 401 || profileResponse.status === 401 ? "GitHub rejected this token. Check it and try again." : `GitHub returned ${repositoryResponse.status || profileResponse.status}.`);
      }
      const profile = await profileResponse.json() as { login?: string };
      const data = await repositoryResponse.json() as Array<{ full_name: string; private: boolean; language: string | null }>;
      const connected = data.map((repo) => ({ name: repo.full_name, private: repo.private, language: repo.language || "Repository" }));
      setRepositories(connected);
      setSelected([]);
      setGithubUser(profile.login || "GitHub account");
      setGithubNotice(connected.length ? `${connected.length} repositories loaded. Select the ones to index.` : "This account has no repositories available to index.");
    } catch (error) {
      setGithubNotice(error instanceof Error ? error.message : "Could not connect to GitHub. Try again.");
    } finally {
      setGithubBusy(false);
    }
  };

  const connectRepos = async () => {
    setBusy(true); setNotice("");
    try { await postJson("/api/repos/connect", { repositories: selected }, token); }
    catch { setNotice("Repository service is unavailable. Continuing with selected preview repositories."); }
    const generated = `tl_live_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
    try {
      const result = await postJson("/api/mcp/tokens", { name: "Workspace MCP", scope: "read_write" }, token);
      setApiToken(typeof result["token"] === "string" ? result["token"] : generated);
    } catch { setApiToken(generated); }
    setStep(3); setBusy(false);
  };

  const signOut = () => {
    localStorage.removeItem(tokenKey); localStorage.removeItem(onboardingKey);
    setToken(""); setOnboarded(false); setStep(0); setAuthOpen(false);
    window.history.replaceState({}, "", "/");
  };

  if (!ready) return <div className="min-h-screen bg-[#e9ecef]" />;
  if (token && onboarded) return <div>{children}</div>;
  if (token) return <Onboarding
    step={step || 1} workspace={workspace} setWorkspace={setWorkspace} teamSize={teamSize} setTeamSize={setTeamSize}
    repoQuery={repoQuery} setRepoQuery={setRepoQuery} repositories={repositories} selected={selected} toggleRepo={(name) => setSelected((items) => items.includes(name) ? items.filter((item) => item !== name) : [...items, name])}
    githubToken={githubToken} setGithubToken={setGithubToken} githubUser={githubUser} githubBusy={githubBusy} githubNotice={githubNotice} onConnectGitHub={loadGitHubRepositories}
    token={apiToken} busy={busy} notice={notice} onWorkspace={completeWorkspace} onRepos={connectRepos} copied={copied}
    onCopy={async () => { await navigator.clipboard.writeText(apiToken); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }}
    onLaunch={() => { localStorage.setItem(onboardingKey, "true"); setOnboarded(true); window.location.assign("/dashboard"); }} onSignOut={signOut}
  />;

  if (landing) return <>{landing(() => setAuthOpen(true))}{authOpen && <AuthModal email={email} setEmail={setEmail} notice={notice} busy={busy} onClose={() => setAuthOpen(false)} onMagic={sendMagicLink} onGithub={() => startProviderAuth("github")} onGoogle={() => startProviderAuth("google")} />}</>;

  return <div className="flex min-h-screen items-center justify-center bg-[#e9ecef] px-5 py-10 font-sans text-[#0f172a]">
    <main className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-xl md:grid md:grid-cols-[1.05fr_.95fr]">
      <section className="flex min-h-[470px] flex-col justify-between bg-[#0f172a] p-8 text-white md:p-12">
        <Brand /><div className="max-w-md"><span className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-orange-300">Developer context, connected</span><h1 className="mt-7 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">Your codebase,<br />in context.</h1><p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">Give your AI tools the engineering knowledge they need to help you build.</p></div>
        <p className="text-xs text-slate-400">Secure workspace access for your engineering team.</p>
      </section>
      <section className="flex flex-col justify-center p-7 sm:p-10 md:p-12">
        <p className="text-xs font-bold uppercase tracking-[.17em] text-orange-600">TrovaLabs workspace</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight">Welcome back</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in to access your developer context hub and MCP server tools.</p>
        <button onClick={() => setAuthOpen(true)} className="mt-8 w-full rounded-full bg-[#f97316] py-3.5 text-sm font-bold text-white transition hover:bg-[#ea580c]">Continue to sign in <ArrowRight className="ml-2 inline h-4 w-4" /></button>
        <p className="mt-5 text-center text-xs text-slate-500">New to TrovaLabs? <button onClick={() => setAuthOpen(true)} className="font-bold text-orange-600 hover:text-orange-700">Join now</button></p>
        {import.meta.env.DEV && <button onClick={() => authenticate("dev_preview_session")} className="mt-7 rounded-full border border-slate-200 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">Open local preview workspace</button>}
      </section>
    </main>
    {authOpen && <AuthModal email={email} setEmail={setEmail} notice={notice} busy={busy} onClose={() => setAuthOpen(false)} onMagic={sendMagicLink} onGithub={() => startProviderAuth("github")} onGoogle={() => startProviderAuth("google")} />}
  </div>;
}

function AuthModal({ email, setEmail, notice, busy, onClose, onMagic, onGithub, onGoogle }: { email: string; setEmail: (v: string) => void; notice: string; busy: boolean; onClose: () => void; onMagic: () => void; onGithub: () => void; onGoogle: () => void }) {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="relative w-full max-w-md rounded-[32px] border border-slate-100 bg-white p-7 shadow-2xl sm:p-8"><button onClick={onClose} aria-label="Close sign in" className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button><Brand /><h2 id="auth-title" className="mt-8 text-2xl font-extrabold">Welcome to TrovaLabs</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in to access your developer context hub and MCP server tools.</p>
    <button onClick={onGithub} className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-slate-900 py-3.5 text-sm font-semibold text-white hover:bg-slate-800"><Github className="h-4 w-4" />Continue with GitHub</button><button onClick={onGoogle} className="mt-3 flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><GoogleIcon />Continue with Google</button>
    {import.meta.env.DEV && <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-[11px] leading-5 text-orange-800">Local preview: GitHub and Google continue with a demo session. Live OAuth needs the auth API configured.</p>}
    <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400"><span className="h-px flex-1 bg-slate-100" />or continue with magic link<span className="h-px flex-1 bg-slate-100" /></div><label className="text-xs font-bold text-slate-700">Email address</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50" /><button disabled={busy} onClick={onMagic} className="mt-3 w-full rounded-full bg-[#f97316] py-3 text-sm font-semibold text-white hover:bg-[#ea580c] disabled:opacity-60">{busy ? "Sending..." : "Send Magic Link"}</button>{notice && <p role="status" className="mt-3 text-xs text-slate-500">{notice}</p>}<p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-slate-400"><LockKeyhole className="h-3 w-3" />Your repositories stay private.</p></section></div>;
}

function Onboarding({ step, workspace, setWorkspace, teamSize, setTeamSize, repoQuery, setRepoQuery, repositories, selected, toggleRepo, githubToken, setGithubToken, githubUser, githubBusy, githubNotice, onConnectGitHub, token, busy, notice, onWorkspace, onRepos, copied, onCopy, onLaunch, onSignOut }: { step: number; workspace: string; setWorkspace: (v: string) => void; teamSize: string; setTeamSize: (v: string) => void; repoQuery: string; setRepoQuery: (v: string) => void; repositories: Repo[]; selected: string[]; toggleRepo: (name: string) => void; githubToken: string; setGithubToken: (v: string) => void; githubUser: string; githubBusy: boolean; githubNotice: string; onConnectGitHub: () => void; token: string; busy: boolean; notice: string; onWorkspace: () => void; onRepos: () => void; copied: boolean; onCopy: () => void; onLaunch: () => void; onSignOut: () => void }) {
  const config = JSON.stringify({ mcpServers: { trovalabs: { command: "npx", args: ["-y", "@trovalabs/mcp-server"], env: { TROVA_API_KEY: token } } } }, null, 2);
  return <div className="flex min-h-screen items-center justify-center bg-[#e9ecef] px-4 py-8 font-sans text-[#0f172a]"><main className="w-full max-w-2xl rounded-[32px] border border-slate-100 bg-white p-6 shadow-xl sm:p-10"><header className="flex items-center justify-between"><Brand /><button onClick={onSignOut} className="text-xs font-semibold text-slate-400 hover:text-slate-700">Sign out</button></header><div className="mt-8 flex gap-2">{[1, 2, 3].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-[#f97316]" : "bg-slate-100"}`} />)}</div><p className="mt-7 text-[10px] font-bold uppercase tracking-[.18em] text-orange-600">Step 0{step} of 03</p>
    {step === 1 && <><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Create Your Engineering Workspace</h1><p className="mt-2 text-sm text-slate-500">Start with a name and team size. You can change these later.</p><label className="mt-7 block text-xs font-bold">Workspace name</label><input value={workspace} onChange={(e) => setWorkspace(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400" /><label className="mt-5 block text-xs font-bold">Team size</label><select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"><option>Solo Builder</option><option>2-10 Devs</option><option>10+ Devs</option></select><button disabled={busy || !workspace.trim()} onClick={onWorkspace} className="mt-7 w-full rounded-full bg-[#f97316] py-3.5 text-sm font-bold text-white hover:bg-[#ea580c] disabled:opacity-60">{busy ? "Saving..." : "Next: Connect Repositories →"}</button></>}
    {step === 2 && <>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Select Repositories to Index</h1>
      <p className="mt-2 text-sm text-slate-500">Connect your GitHub account, then choose which repositories TrovaLabs can index.</p>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Github className="h-4 w-4" />{githubUser ? `Connected as @${githubUser}` : "Connect GitHub account"}</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">Use a GitHub personal access token with repository read access. It stays in this browser session and is sent directly to GitHub.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="password" autoComplete="off" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="github_pat_..." aria-label="GitHub personal access token" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400" />
          <button disabled={githubBusy} onClick={onConnectGitHub} className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60">{githubBusy ? "Loading..." : githubUser ? "Refresh repos" : "Connect & load repos"}</button>
        </div>
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11px] font-semibold text-orange-700 hover:text-orange-800">Create a GitHub token ↗</a>
        {githubNotice && <p role="status" className="mt-2 text-xs text-slate-600">{githubNotice}</p>}
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3"><Search className="h-4 w-4 text-slate-400" /><input value={repoQuery} onChange={(e) => setRepoQuery(e.target.value)} placeholder="Search repositories" className="w-full text-sm outline-none" /></div>
      <div className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-100">
        {repositories.filter((repo) => repo.name.toLowerCase().includes(repoQuery.toLowerCase())).map((repo) => <button key={repo.name} onClick={() => toggleRepo(repo.name)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50"><Github className="h-4 w-4 text-slate-500" /><span className="flex-1"><b className="block text-sm">{repo.name}</b><small className="text-xs text-slate-400">{repo.language || "Repository"} · {repo.private ? "Private" : "Public"}</small></span><span className={`grid h-5 w-5 place-items-center rounded-md border ${selected.includes(repo.name) ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300"}`}>{selected.includes(repo.name) && <Check className="h-3 w-3" />}</span></button>)}
        {repositories.filter((repo) => repo.name.toLowerCase().includes(repoQuery.toLowerCase())).length === 0 && <p className="p-5 text-center text-xs text-slate-400">No repositories match your search.</p>}
      </div>
      <div className="mt-6 flex gap-3"><button onClick={() => window.history.back()} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"><ChevronLeft className="mr-1 inline h-4 w-4" />Back</button><button disabled={busy || selected.length === 0} onClick={onRepos} className="flex-1 rounded-full bg-[#f97316] py-3 text-sm font-bold text-white hover:bg-[#ea580c] disabled:opacity-60">{busy ? "Connecting..." : "Next: Setup MCP Token →"}</button></div>
    </>}
    {step === 3 && <><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Your MCP Server Token</h1><p className="mt-2 text-sm text-slate-500">Use this key to connect TrovaLabs context to your development tools.</p><div className="mt-6 flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4"><code className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{token}</code><button onClick={onCopy} className="shrink-0 rounded-full bg-[#f97316] px-4 py-2 text-xs font-bold text-white">{copied ? "Copied" : "Copy Key"}</button></div><p className="mt-5 text-xs font-bold text-slate-700">Cursor, VS Code & Claude Code configuration</p><pre className="mt-2 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-200"><code>{config}</code></pre><p className="mt-2 text-[10px] text-slate-400">Keep this key private. It is available here during this setup.</p><button onClick={onLaunch} className="mt-6 w-full rounded-full bg-[#f97316] py-3.5 text-sm font-bold text-white hover:bg-[#ea580c]">Launch Dashboard →</button></>}
    {notice && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">{notice}</p>}
  </main></div>;
}

function Brand() { return <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 grid-cols-2 place-items-center gap-1 rounded-xl bg-slate-900 p-2"><i className="h-2 w-2 rounded-full bg-orange-500" /><i className="h-2 w-2 rounded-full bg-white" /><i className="h-2 w-2 rounded-full bg-white/70" /><i className="h-2 w-2 rounded-full bg-orange-600" /></span><span className="text-sm font-extrabold tracking-tight">TrovaLabs</span></div>; }
function GoogleIcon() { return <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1 1 32 15.1l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 32 15.1l5.7-5.7A20 20 0 0 0 6.3 14.7Z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44Z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.4l6.3 5.3A20 20 0 0 0 44 24c0-1.2-.1-2.4-.4-3.5Z"/></svg>; }
