import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowUpRight, Bell, CircleDollarSign,
  Database, Download, Globe2, LayoutDashboard, LogOut, MoreHorizontal, Plus,
  BookOpen, Search, Server, Settings, Shield, Users, X, Zap,
} from "lucide-react";
import { AdminBlogPanel } from "@/components/admin-blog";

export const Route = createFileRoute("/admin")({ component: AdminDashboard });

type AdminTab = "overview" | "users" | "fleet" | "billing" | "security" | "settings" | "blog";
type UserRow = { name: string; email: string; org: string; plan: "Free" | "Pro" | "Enterprise"; joined: string; status: "Active" | "Suspended" };
type NodeRow = { region: string; ip: string; status: "Healthy" | "Optimal"; load: number };

const tabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Platform Overview", icon: LayoutDashboard },
  { id: "users", label: "User & Tenant Management", icon: Users },
  { id: "fleet", label: "MCP Server Fleet & Nodes", icon: Server },
  { id: "billing", label: "Billing & Subscriptions", icon: CircleDollarSign },
  { id: "security", label: "Security & Audit Logs", icon: Shield },
  { id: "settings", label: "System Settings", icon: Settings },
  { id: "blog", label: "Blog & Publishing", icon: BookOpen },
];

const initialUsers: UserRow[] = [
  { name: "Alex Morgan", email: "alex@acme.com", org: "Acme Engineering", plan: "Enterprise", joined: "Oct 12, 2026", status: "Active" },
  { name: "Jamie Chen", email: "jamie@orbit.dev", org: "Orbit Systems", plan: "Pro", joined: "Oct 10, 2026", status: "Active" },
  { name: "Priya Patel", email: "priya@northstar.io", org: "Northstar", plan: "Pro", joined: "Oct 08, 2026", status: "Active" },
  { name: "Sam Rivera", email: "sam@buildkit.app", org: "BuildKit", plan: "Free", joined: "Oct 04, 2026", status: "Suspended" },
  { name: "Morgan Lee", email: "morgan@acme.com", org: "Acme Engineering", plan: "Enterprise", joined: "Sep 28, 2026", status: "Active" },
  { name: "Taylor Kim", email: "taylor@shipshape.io", org: "Shipshape", plan: "Pro", joined: "Sep 24, 2026", status: "Active" },
];
const initialNodes: NodeRow[] = [
  { region: "US-East", ip: "10.0.1.x", status: "Healthy", load: 34 },
  { region: "EU-West", ip: "10.0.2.x", status: "Healthy", load: 42 },
  { region: "AP-South", ip: "10.0.3.x", status: "Optimal", load: 18 },
];
const auditEvents = [
  { type: "AUTH_SUCCESS", detail: "User dev@acme.com authenticated via GitHub OAuth", time: "2 mins ago", tone: "green" },
  { type: "API_KEY_GENERATED", detail: "New tl_live_... issued for workspace core-infra", time: "14 mins ago", tone: "orange" },
  { type: "RATE_LIMIT_WARNING", detail: "IP 192.168.1.55 exceeded MCP endpoint threshold", time: "1 hr ago", tone: "red" },
  { type: "REPOSITORY_SYNCED", detail: "18 repositories indexed in workspace orbit-dev", time: "2 hrs ago", tone: "blue" },
];
const transactions = [
  { org: "Acme Engineering", type: "Enterprise upgrade", amount: "$2,400.00", date: "Oct 24, 2026", state: "Paid" },
  { org: "Orbit Systems", type: "Pro renewal · 18 seats", amount: "$522.00", date: "Oct 23, 2026", state: "Paid" },
  { org: "Northstar", type: "Pro upgrade · 12 seats", amount: "$348.00", date: "Oct 22, 2026", state: "Paid" },
  { org: "BuildKit", type: "Pro renewal · 6 seats", amount: "$174.00", date: "Oct 21, 2026", state: "Pending" },
];

function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [users, setUsers] = useState(initialUsers);
  const [nodes, setNodes] = useState(initialNodes);
  const [query, setQuery] = useState("");
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployRegion, setDeployRegion] = useState("US-Central");
  const [deployName, setDeployName] = useState("");
  const [toast, setToast] = useState("");
  const [settings, setSettings] = useState({ maintenance: false, signup: true, audit: true, emailAlerts: true });
  const activeLabel = tabs.find((item) => item.id === tab)?.label ?? "Platform Overview";
  const filteredUsers = useMemo(() => users.filter((user) => `${user.name} ${user.email} ${user.org}`.toLowerCase().includes(query.toLowerCase())), [users, query]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const download = (name: string, contents: string, type: string) => {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
  };
  const exportUsers = () => {
    const rows = [["Name", "Email", "Workspace", "Plan", "Joined", "Status"], ...filteredUsers.map((user) => [user.name, user.email, user.org, user.plan, user.joined, user.status])];
    download("trovalabs-users.csv", rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n"), "text/csv");
  };
  const exportAudit = () => download("trovalabs-audit-log.json", JSON.stringify(auditEvents, null, 2), "application/json");
  const deployNode = () => {
    if (!deployName.trim()) return;
    setNodes((current) => [...current, { region: deployRegion, ip: `10.0.${current.length + 1}.x`, status: "Healthy", load: 0 }]);
    setDeployOpen(false); setDeployName(""); notify(`${deployName} is provisioning in ${deployRegion}.`);
  };
  const userAction = (user: UserRow, action: "details" | "quota" | "suspend") => {
    if (action === "suspend") {
      setUsers((current) => current.map((item) => item.email === user.email ? { ...item, status: item.status === "Active" ? "Suspended" : "Active" } : item));
      notify(`${user.email} ${user.status === "Active" ? "suspended" : "reactivated"}.`);
    } else if (action === "quota") notify(`API quota reset for ${user.org}.`);
    else notify(`${user.name} · ${user.email} · ${user.org} · ${user.plan}`);
  };

  return (
    <div className="min-h-screen bg-[#e9ecef] p-3 text-[#0f172a] sm:p-5 md:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1600px] gap-4">
        <aside className="hidden w-64 shrink-0 flex-col justify-between rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:flex">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <BrandMark />
              <span><b className="block text-sm font-extrabold">TrovaLabs</b><span className="mt-1 inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-[#ea580c]">TrovaAdmin</span></span>
            </Link>
            <p className="mb-3 mt-10 px-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Administration</p>
            <nav className="space-y-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-semibold transition ${tab === id ? "bg-orange-50 text-orange-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><Icon className={`h-[17px] w-[17px] shrink-0 ${tab === id ? "text-orange-600" : "text-slate-400"}`} /><span>{label}</span></button>)}</nav>
          </div>
          <div>
            <div className="rounded-2xl bg-slate-50 p-3"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-[10px] font-extrabold text-white">SM</span><span className="min-w-0"><b className="block truncate text-xs">Admin: Shadrack Mark</b><small className="text-[10px] text-slate-400">Platform administrator</small></span></div><button onClick={() => { localStorage.removeItem("trova_access_token"); localStorage.removeItem("trova_onboarding_complete"); window.location.assign("/"); }} className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-white hover:text-[#ea580c]"><LogOut className="h-3.5 w-3.5" />Logout</button></div>
            <Link to="/" className="mt-4 flex items-center gap-2 px-2 text-[10px] font-semibold text-slate-400 hover:text-slate-700"><ArrowLeft className="h-3 w-3" />Return to product site</Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1 rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm sm:p-6 md:rounded-[36px] md:p-10">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3"><div className="md:hidden"><BrandMark /></div><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-orange-600">TrovaLabs / Admin</p><h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">{activeLabel}</h1></div></div>
            <div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 sm:flex"><i className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />All systems operational</span><button aria-label="Notifications" onClick={() => notify("You’re all caught up.")} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50"><Bell className="h-4 w-4" /><i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#f97316]" /></button><span className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-[10px] font-extrabold text-white">SM</span></div>
          </header>
          <nav aria-label="Admin sections" className="mt-4 flex gap-2 overflow-x-auto pb-2 md:hidden">{tabs.map(({ id, label }) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-full px-3 py-2 text-[10px] font-bold ${tab === id ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-500"}`}>{label}</button>)}</nav>

          <div className="mt-6">
            {tab === "overview" && <Overview />}
            {tab === "users" && <UsersPanel users={filteredUsers} query={query} setQuery={setQuery} onExport={exportUsers} onAction={userAction} />}
            {tab === "fleet" && <FleetPanel nodes={nodes} onDeploy={() => setDeployOpen(true)} />}
            {tab === "billing" && <BillingPanel />}
            {tab === "security" && <SecurityPanel onExport={exportAudit} />}
            {tab === "settings" && <SettingsPanel settings={settings} setSettings={setSettings} />}
            {tab === "blog" && <AdminBlogPanel onToast={notify} />}
          </div>
        </main>
      </div>
      {deployOpen && <DeployModal name={deployName} setName={setDeployName} region={deployRegion} setRegion={setDeployRegion} onClose={() => setDeployOpen(false)} onDeploy={deployNode} />}
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-xs font-semibold text-white shadow-xl">{toast}</div>}
    </div>
  );
}

function Overview() {
  const metrics = [
    { label: "Total Registered Users", value: "14,820", note: "↑ 18% this month", icon: Users, tint: "orange" },
    { label: "Active Workspaces", value: "3,450", note: "teams across 42 regions", icon: LayoutDashboard, tint: "blue" },
    { label: "Global MCP Ingestion", value: "2.4 TB", note: "processed per day", icon: Activity, tint: "violet" },
    { label: "Platform Uptime", value: "99.98%", note: "Healthy · last 30 days", icon: Zap, tint: "green" },
  ];
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, note, icon: Icon, tint }) => <article key={label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-slate-500">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-xl ${tintClass(tint)}`}><Icon className="h-4 w-4" /></span></div><p className="mt-4 text-3xl font-extrabold tracking-tight">{value}</p><p className="mt-1 text-[10px] font-semibold text-emerald-600">{note}</p></article>)}</div>
    <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_.9fr]">
      <section className="rounded-[28px] border border-slate-100 p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-sm font-extrabold">API Gateway Latency</h2><p className="mt-1 text-xs text-slate-400">Response time · last 24 hours</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">Avg 38 ms</span></div><div className="mt-6"><LatencyChart /></div><div className="mt-3 flex justify-between text-[9px] font-medium text-slate-400"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div></section>
      <section className="rounded-[28px] border border-slate-100 p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Data layer health</h2><p className="mt-1 text-xs text-slate-400">Database & cache clusters</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">All healthy</span></div><div className="mt-6 space-y-3"><HealthRow icon={Database} name="PostgreSQL cluster" detail="Primary + 3 replicas · 24 ms" /><HealthRow icon={Zap} name="Redis cache" detail="6 shards · 81% hit rate" /><HealthRow icon={Globe2} name="Vector index" detail="12 nodes · 6.8M embeddings" /></div><div className="mt-5 rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">Storage utilization</span><b>68%</b></div><div className="mt-3 h-2 rounded-full bg-slate-200"><div className="h-full w-[68%] rounded-full bg-[#f97316]" /></div><p className="mt-2 text-[10px] text-slate-400">3.4 TB of 5 TB allocated</p></div></section>
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-3"><MiniPanel label="Ingestion throughput" value="28.4k" suffix="events / min" change="+8.2% vs yesterday" /><MiniPanel label="Active MCP sessions" value="8,294" suffix="connected clients" change="Across 1,806 workspaces" /><MiniPanel label="Queue depth" value="1.2s" suffix="oldest event" change="Within target" /></div>
  </>;
}

function UsersPanel({ users, query, setQuery, onExport, onAction }: { users: UserRow[]; query: string; setQuery: (value: string) => void; onExport: () => void; onAction: (user: UserRow, action: "details" | "quota" | "suspend") => void }) {
  return <><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-extrabold">Users & tenants</h2><p className="mt-1 text-xs text-slate-400">Manage platform accounts and workspace access.</p></div><button onClick={onExport} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-bold hover:border-orange-300 hover:text-orange-700"><Download className="h-3.5 w-3.5" />Export CSV</button></div><div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 sm:max-w-md"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users by email or organization..." className="w-full text-xs outline-none" /></div><div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr>{["User name / email", "Workspace org", "Plan tier", "Joined date", "Status", ""].map((label) => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.email} className="text-xs"><td className="px-4 py-3.5"><b className="block text-slate-800">{user.name}</b><span className="mt-1 block text-[10px] text-slate-400">{user.email}</span></td><td className="px-4 py-3.5 font-medium text-slate-600">{user.org}</td><td className="px-4 py-3.5"><PlanBadge plan={user.plan} /></td><td className="px-4 py-3.5 text-slate-500">{user.joined}</td><td className="px-4 py-3.5"><StatusBadge status={user.status} /></td><td className="px-4 py-3.5"><details className="relative"><summary aria-label={`Actions for ${user.name}`} className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></summary><div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl"><ActionButton onClick={() => onAction(user, "details")}>View details</ActionButton><ActionButton onClick={() => onAction(user, "quota")}>Reset API quota</ActionButton><ActionButton onClick={() => onAction(user, "suspend")}>{user.status === "Active" ? "Suspend user" : "Reactivate user"}</ActionButton></div></details></td></tr>)}</tbody></table>{users.length === 0 && <p className="p-8 text-center text-xs text-slate-400">No users match this search.</p>}</div><p className="mt-3 text-[10px] text-slate-400">Showing {users.length} accounts · Preview dataset</p></>;
}

function FleetPanel({ nodes, onDeploy }: { nodes: NodeRow[]; onDeploy: () => void }) {
  return <><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-extrabold">MCP Server Fleet & Nodes</h2><p className="mt-1 text-xs text-slate-400">Edge capacity and regional cluster health.</p></div><button onClick={onDeploy} className="inline-flex items-center gap-2 rounded-full bg-[#f97316] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#ea580c]"><Plus className="h-4 w-4" />Deploy new edge node</button></div><div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{nodes.map((node) => <article key={node.region} className="rounded-[26px] border border-slate-100 p-5"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-600"><Server className="h-5 w-5" /></span><StatusBadge status={node.status} /></div><h3 className="mt-5 text-base font-extrabold">Node Cluster {node.region}</h3><p className="mt-1 font-mono text-xs text-slate-400">{node.ip}</p><div className="mt-5 flex items-center justify-between text-xs"><span className="text-slate-500">Compute load</span><b>{node.load}%</b></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#f97316]" style={{ width: `${node.load}%` }} /></div><p className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-emerald-700"><i className="h-2 w-2 rounded-full bg-emerald-500" />Serving traffic · 3 replicas</p></article>)}</div><div className="mt-5 flex flex-wrap gap-3 rounded-2xl bg-slate-50 p-4 text-xs"><span className="font-bold">Fleet summary</span><span className="text-slate-500">{nodes.length} regions</span><span className="text-slate-500">18 edge nodes</span><span className="text-slate-500">0 degraded</span></div></>;
}

function BillingPanel() {
  return <><div><h2 className="text-base font-extrabold">Billing & Subscriptions</h2><p className="mt-1 text-xs text-slate-400">Revenue performance and recent customer activity.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><BillingMetric label="Monthly recurring revenue" value="$48,200" change="↑ 12.4%" /><BillingMetric label="Active Pro subscriptions" value="1,240" change="↑ 86 this month" /><BillingMetric label="Enterprise contracts" value="45" change="98% renewal rate" /></div><section className="mt-5 overflow-hidden rounded-[26px] border border-slate-100"><div className="flex items-center justify-between p-5"><div><h3 className="text-sm font-extrabold">Recent transactions</h3><p className="mt-1 text-xs text-slate-400">Latest plan changes and renewals</p></div><button className="inline-flex items-center gap-1 text-xs font-bold text-orange-600" onClick={() => window.alert("Transaction export is available in the billing provider.")}>View billing <ArrowUpRight className="h-3.5 w-3.5" /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr>{["Workspace", "Activity", "Date", "Amount", "Status"].map((label) => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{transactions.map((row) => <tr key={row.org} className="text-xs"><td className="px-4 py-4 font-bold">{row.org}</td><td className="px-4 py-4 text-slate-500">{row.type}</td><td className="px-4 py-4 text-slate-500">{row.date}</td><td className="px-4 py-4 font-bold">{row.amount}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${row.state === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.state}</span></td></tr>)}</tbody></table></div></section></>;
}

function SecurityPanel({ onExport }: { onExport: () => void }) {
  return <><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-extrabold">Security & Audit Logs</h2><p className="mt-1 text-xs text-slate-400">Recent authentication, API key, and platform events.</p></div><button onClick={onExport} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><ArrowDownToLine className="h-3.5 w-3.5" />Download full audit log (.json)</button></div><div className="mt-5 overflow-hidden rounded-[26px] border border-slate-100"><div className="flex items-center justify-between bg-slate-50 px-5 py-4"><span className="flex items-center gap-2 text-xs font-bold"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Live security stream</span><span className="text-[10px] text-slate-400">Updated just now</span></div><div className="divide-y divide-slate-100">{auditEvents.map((event) => <div key={event.type} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center"><span className={`w-fit rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold ${auditTone(event.tone)}`}>[{event.type}]</span><span className="flex-1 text-xs text-slate-600">{event.detail}</span><span className="text-[10px] text-slate-400">{event.time}</span></div>)}</div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><MiniPanel label="Failed sign-ins" value="12" suffix="last 24 hours" change="Normal range" /><MiniPanel label="Keys rotated" value="184" suffix="this month" change="On schedule" /><MiniPanel label="Risk alerts" value="0" suffix="unresolved" change="No action needed" /></div></>;
}

function SettingsPanel({ settings, setSettings }: { settings: { maintenance: boolean; signup: boolean; audit: boolean; emailAlerts: boolean }; setSettings: (value: (current: typeof settings) => typeof settings) => void }) {
  const options: { key: keyof typeof settings; title: string; detail: string }[] = [
    { key: "maintenance", title: "Maintenance mode", detail: "Temporarily block new workspace activity." },
    { key: "signup", title: "Open registration", detail: "Allow new teams to create an account." },
    { key: "audit", title: "Extended audit retention", detail: "Keep platform security events for 365 days." },
    { key: "emailAlerts", title: "Critical email alerts", detail: "Notify admins about incidents and elevated risk." },
  ];
  return <><div><h2 className="text-base font-extrabold">System Settings</h2><p className="mt-1 text-xs text-slate-400">Platform-wide controls and administrator preferences.</p></div><section className="mt-5 divide-y divide-slate-100 rounded-[26px] border border-slate-100 px-5">{options.map((option) => <div key={option.key} className="flex items-center justify-between gap-4 py-5"><div><h3 className="text-xs font-bold">{option.title}</h3><p className="mt-1 text-xs text-slate-400">{option.detail}</p></div><button role="switch" aria-checked={settings[option.key]} onClick={() => setSettings((current) => ({ ...current, [option.key]: !current[option.key] }))} className={`relative h-6 w-11 shrink-0 rounded-full transition ${settings[option.key] ? "bg-[#f97316]" : "bg-slate-200"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${settings[option.key] ? "left-6" : "left-1"}`} /></button></div>)}</section><div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-xs leading-5 text-orange-900"><b>Preview mode.</b> These controls update this page only and are not connected to platform configuration.</div></>;
}

function DeployModal({ name, setName, region, setRegion, onClose, onDeploy }: { name: string; setName: (value: string) => void; region: string; setRegion: (value: string) => void; onClose: () => void; onDeploy: () => void }) {
  return <div role="presentation" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="deploy-title" className="w-full max-w-md rounded-[28px] border border-slate-100 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600"><Server className="h-5 w-5" /></span><h2 id="deploy-title" className="mt-4 text-lg font-extrabold">Deploy edge node</h2><p className="mt-1 text-xs text-slate-500">Configure a new MCP fleet node.</p></div><button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><label className="mt-5 block text-xs font-bold">Node name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="mcp-edge-us-central-04" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" /></label><label className="mt-4 block text-xs font-bold">Region<select value={region} onChange={(event) => setRegion(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>US-Central</option><option>US-West</option><option>EU-North</option><option>AP-East</option></select></label><div className="mt-6 flex gap-2"><button onClick={onClose} className="flex-1 rounded-full border border-slate-200 py-3 text-xs font-bold text-slate-600">Cancel</button><button disabled={!name.trim()} onClick={onDeploy} className="flex-1 rounded-full bg-[#f97316] py-3 text-xs font-bold text-white hover:bg-[#ea580c] disabled:opacity-50">Deploy node</button></div></section></div>;
}

function BillingMetric({ label, value, change }: { label: string; value: string; change: string }) { return <article className="rounded-[24px] border border-slate-100 p-5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-orange-600"><CircleDollarSign className="h-4 w-4" /></div><p className="mt-4 text-[10px] font-semibold text-slate-400">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p><p className="mt-1 text-[10px] font-semibold text-emerald-600">{change}</p></article>; }
function MiniPanel({ label, value, suffix, change }: { label: string; value: string; suffix: string; change: string }) { return <article className="rounded-[24px] border border-slate-100 p-5"><p className="text-[10px] font-semibold text-slate-400">{label}</p><div className="mt-3 flex items-baseline gap-2"><b className="text-2xl font-extrabold">{value}</b><span className="text-[10px] text-slate-400">{suffix}</span></div><p className="mt-2 text-[10px] font-semibold text-emerald-600">{change}</p></article>; }
function HealthRow({ icon: Icon, name, detail }: { icon: typeof Database; name: string; detail: string }) { return <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-500"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><b className="block text-xs">{name}</b><small className="text-[10px] text-slate-400">{detail}</small></span><span className="h-2 w-2 rounded-full bg-emerald-500" /></div>; }
function PlanBadge({ plan }: { plan: UserRow["plan"] }) { return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${plan === "Enterprise" ? "bg-violet-50 text-violet-700" : plan === "Pro" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600"}`}>{plan}</span>; }
function StatusBadge({ status }: { status: string }) { const good = status === "Healthy" || status === "Optimal" || status === "Active"; return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${good ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}><i className={`h-1.5 w-1.5 rounded-full ${good ? "bg-emerald-500" : "bg-rose-500"}`} />{status}</span>; }
function ActionButton({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button onClick={onClick} className="block w-full rounded-lg px-2.5 py-2 text-left text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">{children}</button>; }
function BrandMark() { return <span className="grid h-10 w-10 grid-cols-2 place-items-center gap-1 rounded-2xl bg-slate-900 p-2"><i className="h-2 w-2 rounded-full bg-orange-500" /><i className="h-2 w-2 rounded-full bg-white" /><i className="h-2 w-2 rounded-full bg-white/70" /><i className="h-2 w-2 rounded-full bg-orange-600" /></span>; }
function tintClass(tint: string) { return ({ orange: "bg-orange-50 text-orange-600", blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", green: "bg-emerald-50 text-emerald-600" } as Record<string, string>)[tint] ?? "bg-slate-50 text-slate-500"; }
function auditTone(tone: string) { return ({ green: "bg-emerald-50 text-emerald-700", orange: "bg-orange-50 text-orange-700", red: "bg-rose-50 text-rose-700", blue: "bg-blue-50 text-blue-700" } as Record<string, string>)[tone] ?? "bg-slate-100 text-slate-600"; }
function LatencyChart() { return <svg viewBox="0 0 720 190" role="img" aria-label="API latency ranges between 28 and 44 milliseconds" className="h-44 w-full overflow-visible"><defs><linearGradient id="latency-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity=".2" /><stop offset="100%" stopColor="#f97316" stopOpacity="0" /></linearGradient></defs>{[30, 70, 110, 150].map((y) => <line key={y} x1="0" x2="720" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />)}<path d="M0 103 C32 97 43 104 68 92 S111 85 130 94 S162 88 181 80 S213 82 235 90 S265 72 290 77 S327 72 347 82 S375 78 400 68 S432 75 455 72 S488 80 512 63 S549 66 571 59 S608 71 628 58 S662 63 685 50 S705 55 720 46 L720 175 L0 175Z" fill="url(#latency-fill)" /><path d="M0 103 C32 97 43 104 68 92 S111 85 130 94 S162 88 181 80 S213 82 235 90 S265 72 290 77 S327 72 347 82 S375 78 400 68 S432 75 455 72 S488 80 512 63 S549 66 571 59 S608 71 628 58 S662 63 685 50 S705 55 720 46" fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" /><circle cx="720" cy="46" r="5" fill="#f97316" stroke="white" strokeWidth="3" /></svg>; }
