import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUp,
  Boxes,
  Cable,
  GitBranch,
  Github,
  Linkedin,
  Search,
  Slack,
  Twitter,
  Zap,
} from "lucide-react";
import hero3d from "@/assets/hero-3d.png";
import { AuthGate } from "@/components/auth-onboarding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "TrovaLabs — Unified Developer Context Platform",
      },
      {
        name: "description",
        content:
          "TrovaLabs unifies code context for modern engineering teams with real-time PR ingestion, MCP servers, and a unified search engine.",
      },
      { property: "og:title", content: "TrovaLabs — Unified Developer Context Platform" },
      {
        property: "og:description",
        content:
          "Unifying code context for a smarter future — real-time ingestion, MCP servers, and unified search for engineering teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "TrovaLabs — Unified Developer Context Platform" },
      {
        name: "twitter:description",
        content:
          "Unifying code context for a smarter future — real-time ingestion, MCP servers, and unified search for engineering teams.",
      },
    ],
  }),
  component: Index,
});

function LogoMark() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900">
      <div className="grid grid-cols-2 gap-[3px]">
        <span className="h-[7px] w-[7px] rounded-full bg-[#f97316]" />
        <span className="h-[7px] w-[7px] rounded-full bg-white" />
        <span className="h-[7px] w-[7px] rounded-full bg-white/70" />
        <span className="h-[7px] w-[7px] rounded-full bg-[#ea580c]" />
      </div>
    </div>
  );
}

function Hero({ onAuth }: { onAuth: () => void }) {
  return (
    <section className="relative rounded-[36px] bg-white p-8 pb-8 pt-10 shadow-sm md:p-12 md:pb-12 md:pt-16">
      {/* Top navigation bar */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-lg font-extrabold tracking-tight text-[#0f172a]">TrovaLabs</span>
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {["Home", "Solutions", "MCP Hub", "Docs", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(" ", "-")}`}
              className="text-sm font-medium text-slate-500 transition-colors hover:text-[#f97316]"
            >
              {item}
            </a>
          ))}
        </nav>
        <button onClick={onAuth} className="flex items-center gap-1.5 font-medium text-white" aria-label="Login to TrovaLabs">
          <span className="rounded-full bg-[#f97316] px-6 py-2.5 text-sm transition-colors hover:bg-[#ea580c]">LOGIN</span>
          <span className="rounded-full bg-[#ea580c] p-1.5">
            <ArrowRight className="h-4 w-4 text-white" />
          </span>
        </button>
      </header>

      {/* Hero body */}
      <div className="relative mt-10 grid items-center gap-10 pb-40 md:mt-14 md:grid-cols-[1.05fr_0.95fr] md:pb-44">
        <div className="relative z-10">
          <p className="text-sm font-semibold tracking-wide text-[#f97316]">
            #No.1 Developer Context Platform
          </p>
          <h1 className="mt-4 max-w-xl text-5xl font-extrabold leading-[1.15] text-[#0f172a] md:text-6xl">
            Unifying Code Context For A <span className="text-[#f97316]">Smarter Future</span>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-slate-500 md:text-base">
            Join us in creating seamless engineering workflows with cutting-edge developer context
            aggregation and MCP tools.
          </p>
          <button onClick={onAuth} className="mt-8 inline-block rounded-full bg-[#f97316] px-8 py-3.5 font-semibold text-white shadow-md transition-all hover:bg-[#ea580c] hover:shadow-lg">
            JOIN NOW
          </button>
        </div>

        {/* 3D visual breaking out of the top right */}
        <div className="relative h-64 md:h-[420px]">
          <img
            src={hero3d}
            alt="Abstract 3D structure of connected code context nodes"
            width={1024}
            height={1024}
            className="pointer-events-none absolute -top-16 right-0 z-0 w-[380px] max-w-none drop-shadow-xl md:-top-40 md:-right-16 md:w-[470px]"
          />
          {/* Floating lightning badge */}
          <div className="absolute right-10 top-6 grid h-14 w-14 place-items-center rounded-full bg-[#f97316] shadow-lg shadow-orange-500/40 md:right-16 md:top-10">
            <Zap className="h-6 w-6 fill-white text-white" />
          </div>
        </div>

        {/* Floating sub-cards overlay — bottom left */}
        <div className="pointer-events-none absolute bottom-2 left-2 z-20 md:bottom-4 md:left-4">
          <div className="flex w-max items-center gap-3 rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-lg backdrop-blur">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100">
              <Boxes className="h-5 w-5 text-[#ea580c]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">Context Hub</p>
              <p className="text-xs text-slate-500">Live Pipeline Indexing</p>
            </div>
          </div>
          <div className="ml-8 -mt-2 flex w-max items-center gap-3 rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-lg backdrop-blur">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100">
              <Cable className="h-5 w-5 text-[#0f172a]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">MCP Server Engine</p>
              <p className="text-xs text-slate-500">Connected to IDEs</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricsBar() {
  const metrics = [
    { value: "99.9%", label: "Uptime & Context Retrieval Accuracy" },
    { value: "10x+", label: "Faster Engineering Context Search" },
  ];
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {metrics.map((m) => (
        <div
          key={m.value}
          className="flex items-center gap-6 rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm md:gap-12"
        >
          <span className="text-4xl font-extrabold tracking-tight text-[#0f172a] md:text-5xl">
            {m.value}
          </span>
          <span className="max-w-[220px] text-sm font-medium text-slate-500">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

function Features() {
  const features = [
    {
      icon: GitBranch,
      title: "Real-Time PR Ingestion",
      body: "Automatic GitHub/GitLab webhook processing with real-time indexing of every pull request and branch.",
    },
    {
      icon: Cable,
      title: "Model Context Protocol (MCP)",
      body: "Direct IDE connection for Cursor, VS Code, and Claude Code — your context, wherever you work.",
    },
    {
      icon: Search,
      title: "Unified Search Engine",
      body: "Instant cross-repository and internal documentation context retrieval with semantic ranking.",
    },
  ];
  return (
    <section id="solutions" className="mt-8">
      <div className="mb-10 text-center">
        <p className="text-sm font-semibold tracking-wide text-[#f97316]">
          #TrovaLabs Capabilities
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f172a] md:text-4xl">
          Everything You Need for Unified Context
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm transition-all hover:shadow-md"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100">
              <Icon className="h-6 w-6 text-[#ea580c]" />
            </div>
            <h3 className="mt-6 text-lg font-bold text-[#0f172a]">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Connect Repositories",
      body: "One-click GitHub OAuth authorization to start indexing instantly.",
    },
    {
      n: "02",
      title: "Spin Up MCP Server",
      body: "Expose context to your local or cloud IDE assistants in minutes.",
    },
    {
      n: "03",
      title: "Query Anywhere",
      body: "Search context directly from code editors, web UI, or PR comments.",
    },
  ];
  return (
    <section id="mcp-hub" className="mt-8">
      <div className="rounded-[36px] border border-slate-100 bg-white p-10 shadow-sm md:p-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-md text-3xl font-extrabold tracking-tight text-[#0f172a] md:text-4xl">
            Seamless Setup in 3 Minutes
          </h2>
          <p className="text-sm font-medium text-slate-500">From clone to context — in three steps.</p>
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-orange-100 px-4 py-1.5 text-sm font-bold text-[#ea580c]">
                  Step {s.n}
                </span>
                <span className="hidden h-px flex-1 bg-slate-100 md:block" />
              </div>
              <h3 className="mt-6 text-lg font-bold text-[#0f172a]">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      name: "Community",
      price: "$0",
      unit: "/mo",
      blurb: "For solo builders getting started.",
      items: ["Single repository", "Local MCP server", "Basic context search"],
      featured: false,
    },
    {
      name: "Pro / Teams",
      price: "$29",
      unit: "/dev/mo",
      blurb: "For fast-moving engineering teams.",
      items: ["Multi-repo indexing", "Slack/GitHub webhooks", "Team-wide context search"],
      featured: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      unit: "pricing",
      blurb: "For organizations with advanced needs.",
      items: ["Dedicated deployment", "SAML SSO", "Custom security audit logs"],
      featured: false,
    },
  ];
  return (
    <section id="pricing" className="mt-8">
      <div className="mb-10 text-center">
        <p className="text-sm font-semibold tracking-wide text-[#f97316]">#Simple Pricing</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f172a] md:text-4xl">
          Scale Context With Your Team
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={
              t.featured
                ? "relative rounded-[32px] border-2 border-[#f97316] bg-white p-8 shadow-sm transition-all hover:shadow-md"
                : "relative rounded-[32px] border border-slate-100 bg-white p-8 shadow-sm transition-all hover:shadow-md"
            }
          >
            {t.featured && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#f97316] px-4 py-1.5 text-xs font-bold tracking-wide text-white">
                MOST POPULAR
              </span>
            )}
            <h3 className="text-lg font-bold text-[#0f172a]">{t.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{t.blurb}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight text-[#0f172a]">
                {t.price}
              </span>
              <span className="text-sm font-medium text-slate-500">{t.unit}</span>
            </div>
            <a
              href="#"
              className={
                t.featured
                  ? "mt-7 block rounded-full bg-[#f97316] px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-[#ea580c]"
                  : "mt-7 block rounded-full border border-slate-200 px-6 py-3 text-center font-semibold text-[#0f172a] transition-colors hover:border-[#f97316] hover:text-[#f97316]"
              }
            >
              {t.featured ? "Get Started" : t.name === "Enterprise" ? "Contact Sales" : "Start Free"}
            </a>
            <ul className="mt-8 space-y-3">
              {t.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f97316]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const columns = [
    { title: "Product", links: [{ label: "Solutions", href: "/#solutions" }, { label: "MCP Hub", href: "/#mcp-hub" }, { label: "Pricing", href: "/#pricing" }, { label: "Changelog", href: "/info/changelog" }] },
    { title: "Developers", links: [{ label: "Docs", href: "/info/docs" }, { label: "API Reference", href: "/info/api" }, { label: "Status", href: "/info/status" }, { label: "Community", href: "https://github.com/SHADRACK152/trova-context-hub/discussions", external: true }] },
    { title: "Company", links: [{ label: "About", href: "/info/about" }, { label: "Careers", href: "/info/careers" }, { label: "Blog", href: "/info/blog" }, { label: "Contact", href: "/info/contact" }] },
    { title: "Legal", links: [{ label: "Privacy", href: "/info/privacy" }, { label: "Terms", href: "/info/terms" }, { label: "Security", href: "/info/security" }] },
  ];
  return (
    <footer
      id="docs"
      className="mb-8 mt-8 rounded-[36px] border border-slate-100 bg-white p-8 shadow-sm md:p-12"
    >
      <div className="flex flex-wrap justify-between gap-10">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-lg font-extrabold tracking-tight text-[#0f172a]">TrovaLabs</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            Unifying developer context for modern engineering teams.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-14 gap-y-8 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-bold text-[#0f172a]">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target={"external" in l && l.external ? "_blank" : undefined}
                      rel={"external" in l && l.external ? "noopener noreferrer" : undefined}
                      className="text-sm text-slate-500 transition-colors hover:text-[#f97316]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} TrovaLabs. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-slate-400">
          <a href="https://github.com/SHADRACK152/trova-context-hub" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="transition-colors hover:text-[#f97316]">
            <Github className="h-4.5 w-4.5" />
          </a>
          <a href="https://github.com/SHADRACK152/trova-context-hub/discussions" target="_blank" rel="noopener noreferrer" aria-label="Slack community" className="transition-colors hover:text-[#f97316]">
            <Slack className="h-4.5 w-4.5" />
          </a>
          <a href="https://x.com/" target="_blank" rel="noopener noreferrer" aria-label="X" className="transition-colors hover:text-[#f97316]">
            <Twitter className="h-4.5 w-4.5" />
          </a>
          <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="transition-colors hover:text-[#f97316]">
            <Linkedin className="h-4.5 w-4.5" />
          </a>
        </div>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-2 rounded-full bg-[#f97316] px-5 py-2 text-xs font-bold tracking-wide text-white transition-colors hover:bg-[#ea580c]"
        >
          BACK TO TOP
          <ArrowUp className="h-3.5 w-3.5" />
        </a>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <AuthGate landing={(onAuth) => <div className="min-h-screen bg-[#e9ecef] px-4 py-6 md:px-8 md:py-10"><div className="mx-auto max-w-6xl"><Hero onAuth={onAuth} /><MetricsBar /><Features /><HowItWorks /><Pricing /><Footer /></div></div>}>
      <div className="min-h-screen bg-[#e9ecef] px-4 py-6 text-center text-slate-500">You’re signed in. <a href="/dashboard" className="font-semibold text-orange-600">Open your dashboard</a></div>
    </AuthGate>
  );
}
