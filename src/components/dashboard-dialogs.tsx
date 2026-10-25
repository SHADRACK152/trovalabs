import { useEffect, useState } from "react";
import { ArrowRight, Check, CircleCheck, Copy, Github, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { contextResults, snippets, type Repo } from "@/components/dashboard-panels";

export type DialogMode = "connect" | "key" | "setup" | "search" | null;
export type CreateKeyRequest = { name: string; scope: string };
export type CreatedKey = CreateKeyRequest & { id: string | number; token: string; created: string; preview?: boolean };

export function DashboardDialog({
  mode,
  onClose,
  onConnect,
  onKeyCreated,
  onCopy,
  copied,
  search,
  setSearch,
  onSearchResults,
}: {
  mode: DialogMode;
  onClose: () => void;
  onConnect: (repo: Repo) => void;
  onKeyCreated: (key: CreateKeyRequest) => Promise<CreatedKey>;
  onCopy: (value: string, label: string) => void;
  copied: string;
  search: string;
  setSearch: (value: string) => void;
  onSearchResults: () => void;
}) {
  const [step, setStep] = useState(0);
  const [repoUrl, setRepoUrl] = useState("");
  const [scope, setScope] = useState("Read / Write");
  const [keyName, setKeyName] = useState("Local MCP Server");
  const [key, setKey] = useState("");
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [editor, setEditor] = useState<"Cursor" | "VS Code">("Cursor");

  useEffect(() => {
    if (mode === "connect") { setStep(0); setRepoUrl(""); }
    if (mode === "key") { setKey(""); setScope("Read / Write"); setKeyName("Local MCP Server"); setCreatedKey(null); setKeyError(""); }
  }, [mode]);

  const title = mode === "connect" ? "Connect a repository" : mode === "key" ? "Generate an API key" : mode === "setup" ? "MCP setup guide" : "Search workspace context";
  const createKey = async () => {
    setCreatingKey(true); setKeyError("");
    try {
      const result = await onKeyCreated({ name: keyName.trim(), scope });
      setCreatedKey(result); setKey(result.token);
    } catch (error) {
      setKeyError(error instanceof Error ? error.message : "Could not create an API key.");
    } finally { setCreatingKey(false); }
  };
  const saveRepo = () => {
    const input = repoUrl.trim() || "trovalabs/new-repository";
    const name = input.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/^https?:\/\/(www\.)?gitlab\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
    onConnect({ name, provider: "GitHub", status: "Indexing", synced: "Just now", progress: 4 });
    setStep(2);
  };
  const snippet = snippets[editor];

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-[28px] border-slate-100 bg-white p-0 shadow-xl sm:max-w-xl">
        <div className="p-6 sm:p-8">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-xl font-extrabold tracking-tight text-slate-900">{title}</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-500">
              {mode === "connect" ? "Authorize repository access and start indexing workspace context." : mode === "key" ? "Create a scoped key for your local MCP server." : mode === "setup" ? "Add TrovaLabs context to the tools you already use." : "Search commits, pull requests, docs, and MCP memory."}
            </DialogDescription>
          </DialogHeader>

          {mode === "connect" && (
            <div className="mt-6">
              <div className="mb-5 flex items-center gap-2">{["Authorize", "Select repo", "Complete"].map((label, i) => <div key={label} className="flex flex-1 items-center gap-2"><span className={"grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold " + (step >= i ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400")}>{step > i ? <Check className="h-4 w-4" /> : i + 1}</span><span className="hidden text-[10px] font-semibold text-slate-500 sm:block">{label}</span>{i < 2 && <span className="h-px flex-1 bg-slate-200" />}</div>)}</div>
              {step === 0 && <div className="rounded-2xl border border-slate-200 p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><Github className="h-5 w-5" /></span><div><b className="text-sm">Authorize with GitHub</b><p className="mt-1 text-xs leading-relaxed text-slate-500">Grant read access to repository metadata, pull requests, and commit history.</p></div></div><label className="mt-5 block text-xs font-bold text-slate-600">Repository URL<input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/organization/repository" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-orange-400" /></label><p className="mt-2 text-[10px] text-slate-400">Demo flow: this does not perform external OAuth.</p><button onClick={() => setStep(1)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-xs font-bold text-white">Continue <ArrowRight className="h-4 w-4" /></button></div>}
              {step === 1 && <div className="rounded-2xl border border-slate-200 p-5"><b className="text-sm">Choose a repository to index</b><label className="mt-4 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4"><input type="radio" name="repo" defaultChecked className="accent-orange-500" /><Github className="h-4 w-4" /><span className="truncate text-xs font-semibold">{repoUrl || "trovalabs/new-repository"}</span></label><div className="mt-4 flex gap-2"><button onClick={() => setStep(0)} className="rounded-full border px-4 py-2 text-xs font-bold text-slate-600">Back</button><button onClick={saveRepo} className="rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white">Connect and index</button></div></div>}
              {step === 2 && <div className="rounded-2xl bg-emerald-50 p-5"><p className="flex items-center gap-2 font-bold text-emerald-800"><CircleCheck className="h-5 w-5" />Repository connected</p><p className="mt-2 text-xs text-emerald-800">Indexing has started. Track progress from Overview.</p><button onClick={onClose} className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white">Done</button></div>}
            </div>
          )}

          {mode === "key" && <div className="mt-6">{!key ? <><label className="block text-xs font-bold text-slate-600">Key name<input value={keyName} onChange={(e) => setKeyName(e.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label><label className="mt-4 block text-xs font-bold text-slate-600">Key scope<select value={scope} onChange={(e) => setScope(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>Read</option><option>Read / Write</option><option>Admin</option></select></label><p className="mt-4 rounded-2xl bg-orange-50 p-4 text-xs leading-relaxed text-orange-900">The full key is displayed once. Store it securely before closing this window.</p>{keyError && <p role="alert" className="mt-3 text-xs text-rose-600">{keyError}</p>}<button disabled={creatingKey || !keyName.trim()} onClick={() => void createKey()} className="mt-4 rounded-full bg-orange-500 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60">{creatingKey ? "Creating..." : "Generate key"}</button></> : <><p className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800"><CircleCheck className="h-4 w-4" />{createdKey?.preview ? "Preview key created" : `Key created with ${scope} access`}</p><div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"><code className="min-w-0 flex-1 break-all text-xs">{key}</code><button aria-label="Copy API key" onClick={() => onCopy(key, "API key")} className="p-2">{copied === "API key" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button></div><p className="mt-3 text-[10px] text-slate-400">{createdKey?.preview ? "Local preview key only; configure the API service to enable remote calls." : "This secret is shown only once. Save it now."}</p><button onClick={onClose} className="mt-4 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white">Done</button></>}</div>}

          {mode === "setup" && <div className="mt-6"><div className="flex gap-2">{(["Cursor", "VS Code"] as const).map((name) => <button key={name} onClick={() => setEditor(name)} className={"rounded-full px-4 py-2 text-xs font-bold " + (editor === name ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600")}>{name}</button>)}</div><p className="mt-4 text-xs text-slate-500">Add to <code className="rounded bg-slate-100 px-1 py-0.5">{snippet.path}</code></p><pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(snippet.value, null, 2)}</pre><button onClick={() => onCopy(JSON.stringify(snippet.value, null, 2), "MCP config")} className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-xs font-bold text-white">{copied === "MCP config" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === "MCP config" ? "Copied" : "Copy configuration"}</button></div>}

          {mode === "search" && <div className="mt-5"><label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><Search className="h-4 w-4 text-orange-500" /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSearchResults()} placeholder="Search commits, PRs, docs, or MCP memory..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><div className="mt-3 space-y-1">{contextResults.filter((r) => !search || (r.title + r.source + r.excerpt).toLowerCase().includes(search.toLowerCase())).slice(0, 4).map((r) => <button key={r.title} onClick={() => { setSearch(r.title); onSearchResults(); }} className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-slate-50"><Search className="mt-0.5 h-4 w-4 text-orange-500" /><span><b className="block text-xs">{r.title}</b><small className="text-slate-400">{r.source} · {r.repo}</small></span></button>)}</div><button onClick={onSearchResults} className="mt-3 rounded-full bg-orange-500 px-5 py-2.5 text-xs font-bold text-white">View search results</button></div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
