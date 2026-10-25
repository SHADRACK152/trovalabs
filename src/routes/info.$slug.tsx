import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TROVA_API_BASE_URL } from "@/lib/trova-api";

export const Route = createFileRoute("/info/$slug")({
  component: InfoPage,
});

const pages = {
  docs: {
    title: "TrovaLabs Documentation",
    description: "Connect your repositories, configure an MCP server, and retrieve useful engineering context from your tools.",
    items: [
      "Connect a GitHub or GitLab repository to start indexing pull requests and code changes.",
      "Add the TrovaLabs MCP server to Cursor, VS Code, or Claude Code using your workspace token.",
      "Search indexed code, pull request discussions, and documentation from the context hub.",
    ],
  },
  changelog: {
    title: "TrovaLabs v1.0 Release Notes",
    description: "The first release of the TrovaLabs context platform.",
    items: ["Initial MCP Server release", "GitHub Ingestion pipeline online"],
  },
  status: {
    title: "System Status",
    description: "All Systems Operational",
    items: [
      "Context API — Operational · 99.9% uptime",
      "GitHub ingestion — Operational · 99.9% uptime",
      "MCP server — Operational · 99.9% uptime",
    ],
  },
  about: {
    title: "About TrovaLabs",
    description: "We make engineering knowledge easier to find and use.",
    items: [
      "Our mission — Give every developer the context they need to build with confidence.",
      "A note from the founder — TrovaLabs began with a simple idea: teams move faster when their tools can understand the work around the code.",
    ],
  },
  careers: {
    title: "Join TrovaLabs",
    description: "Help build the next generation of developer tools.",
    items: ["Frontend Engineer (React/TS)", "Systems Engineer (C++/Rust)"],
  },
  blog: {
    title: "Engineering Notes",
    description: "Recent ideas from the TrovaLabs team.",
    items: ["Building High-Throughput MCP Servers", "Quantifying Technical Debt"],
  },
  privacy: {
    title: "Privacy Policy",
    description: "Your source code stays private and under your control.",
    items: [
      "Code is encrypted in transit and at rest.",
      "Zero-retention code privacy: source code is not used to train models or retained as prompt content.",
      "Access is limited to authorized team members and connected tools.",
    ],
  },
  terms: {
    title: "Terms of Service",
    description: "Use TrovaLabs responsibly and keep your account secure.",
    items: [
      "You retain ownership of your repositories and content.",
      "You are responsible for access permissions and activity under your account.",
      "Service availability and features may change as the platform evolves.",
    ],
  },
  security: {
    title: "Security & Compliance",
    description: "Security is built into how TrovaLabs handles engineering context.",
    items: [
      "Encryption protects data in transit and at rest.",
      "Access controls help keep repository context limited to authorized users.",
      "SOC 2 readiness is on the product roadmap.",
    ],
  },
} as const;

type InfoSlug = keyof typeof pages;

function InfoPage() {
  const { slug } = Route.useParams();
  const page = slug in pages ? pages[slug as InfoSlug] : null;

  return (
    <div className="min-h-screen bg-[#e9ecef] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#f97316]">
            &larr; Back to TrovaLabs
          </Link>
          <span className="text-sm font-bold text-slate-500">TrovaLabs</span>
        </header>
        <main className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:p-10 md:p-14">
          {slug === "blog" ? (
            <BlogIndex />
          ) : !page && slug !== "api" && slug !== "contact" ? (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#f97316]">Page not found</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f172a]">We couldn&apos;t find that page.</h1>
              <Link to="/" className="mt-6 inline-flex rounded-full bg-[#f97316] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#ea580c]">
                Return home
              </Link>
            </div>
          ) : slug === "api" ? (
            <ApiSandbox />
          ) : slug === "contact" ? (
            <ContactPage />
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#f97316]">TrovaLabs</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f172a] md:text-4xl">{page?.title}</h1>
              <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">{page?.description}</p>
              <ul className="mt-8 space-y-3">
                {page?.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-700">
                    {slug === "status" && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

type PublicArticle = { slug: string; title: string; excerpt: string; author: string; published_at?: string; updatedAt?: string; status?: string; preview?: boolean };

function BlogIndex() {
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const localArticles = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("trova_blog_articles") ?? "[]") as PublicArticle[];
        if (active) setArticles(saved.filter((article) => article.status === "published"));
      } catch { if (active) setArticles([]); }
    };
    void fetch(`${TROVA_API_BASE_URL}/v1/blog`)
      .then((response) => { if (!response.ok) throw new Error("Blog service unavailable"); return response.json() as Promise<{ articles: PublicArticle[] }>; })
      .then((result) => { if (active) setArticles(result.articles); })
      .catch(localArticles)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <>
    <p className="text-sm font-semibold uppercase tracking-wide text-[#f97316]">TrovaLabs Journal</p>
    <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f172a] md:text-4xl">Engineering Notes</h1>
    <p className="mt-4 text-slate-600">Ideas and field notes from the teams building TrovaLabs.</p>
    {loading ? <p className="mt-8 text-sm text-slate-500">Loading articles…</p> : articles.length ? <div className="mt-8 grid gap-3">{articles.map((article) => <a key={article.slug} href={`/blog/${encodeURIComponent(article.slug)}`} className="group rounded-2xl border border-slate-100 bg-slate-50 p-5 transition hover:border-orange-200 hover:bg-orange-50/40"><p className="text-[11px] font-semibold text-slate-400">{article.author}{article.preview ? " · local preview" : ""}</p><h2 className="mt-2 text-lg font-bold text-[#0f172a] group-hover:text-[#ea580c]">{article.title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">{article.excerpt}</p><span className="mt-4 inline-flex text-xs font-bold text-[#ea580c]">Read article →</span></a>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-slate-200 p-8 text-center"><p className="text-sm font-semibold text-slate-700">No articles published yet</p><p className="mt-1 text-xs text-slate-500">Check back soon for notes from the TrovaLabs team.</p></div>}
  </>;
}

function ApiSandbox() {
  const [response, setResponse] = useState<"/v1/context" | "/v1/webhooks/github" | null>(null);
  const requests = [
    {
      method: "GET",
      path: "/v1/context",
      sample: "GET /v1/context?query=authentication%20flow&repository=acme%2Fweb-app",
    },
    {
      method: "POST",
      path: "/v1/webhooks/github",
      sample: JSON.stringify(
        {
          action: "pull_request",
          repository: "acme/web-app",
          pull_request: { number: 42 },
        },
        null,
        2,
      ),
    },
  ] as const;

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wide text-[#f97316]">Developers</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f172a] md:text-4xl">API Sandbox</h1>
      <p className="mt-4 text-slate-600">Explore sample requests for the context API.</p>
      <div className="mt-8 space-y-4">
        {requests.map((request) => (
          <section key={request.path} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <code className="text-sm font-semibold text-[#0f172a]">
                <span className="text-[#ea580c]">{request.method}</span> {request.path}
              </code>
              <button
                type="button"
                onClick={() => setResponse(request.path)}
                className="rounded-full bg-[#f97316] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#ea580c]"
              >
                Send sample
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">{request.sample}</pre>
          </section>
        ))}
      </div>
      {response && (
        <div role="status" className="mt-5 rounded-2xl bg-slate-100 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Sample response: {response}</p>
          <pre className="mt-2 overflow-x-auto text-xs leading-relaxed text-slate-700">
            {JSON.stringify(
              response === "/v1/context"
                ? { results: [{ file: "src/auth.ts", score: 0.98 }], total: 1 }
                : { accepted: true, indexed: true },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </>
  );
}

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wide text-[#f97316]">Company</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f172a] md:text-4xl">Get in Touch with TrovaLabs</h1>
      <p className="mt-4 text-slate-600">Send a note to the TrovaLabs team.</p>
      <form
        className="mt-8 max-w-xl space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input required name="name" autoComplete="name" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#f97316] focus:ring-2 focus:ring-orange-100" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input required name="email" type="email" autoComplete="email" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#f97316] focus:ring-2 focus:ring-orange-100" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Message
          <textarea required name="message" rows={5} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#f97316] focus:ring-2 focus:ring-orange-100" />
        </label>
        <button type="submit" className="rounded-full bg-[#f97316] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ea580c]">
          Send message
        </button>
        {submitted && (
          <p role="status" className="text-sm text-slate-600">
            Thanks — this preview form is interactive, but messages aren&apos;t sent yet.
          </p>
        )}
      </form>
    </>
  );
}
