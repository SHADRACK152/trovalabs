import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  const navItems = [
    { label: "Platform", href: "/#solutions" },
    { label: "Context Hub", href: "/#solutions" },
    { label: "MCP Hub", href: "/#mcp-hub" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Docs", href: "/#docs" },
  ];
  const footerColumns = [
    { title: "Platform", links: [{ label: "Solutions", href: "/#solutions" }, { label: "MCP Hub", href: "/#mcp-hub" }] },
    { title: "Context Graph", links: [{ label: "Metadata", href: "/#solutions" }, { label: "Performance", href: "/#solutions" }] },
    { title: "Support", links: [{ label: "Submit Ticket", href: "mailto:support@trovalabs.dev" }, { label: "FAQs", href: "/#docs" }] },
    { title: "Company", links: [{ label: "About Us", href: "/#docs" }, { label: "Careers", href: "mailto:careers@trovalabs.dev" }] },
  ];
  return (
    <div className="min-h-screen bg-[#e9ecef] p-4 text-[#0f172a] md:p-8">
      <main className="relative mx-auto flex min-h-[85vh] w-full max-w-6xl flex-col justify-between overflow-hidden rounded-[36px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8 md:p-12">
        <header className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200">
            <span className="grid h-10 w-10 grid-cols-2 place-items-center gap-1 rounded-[14px] bg-[#0f172a] p-2"><i className="h-2 w-2 rounded-full bg-[#f97316]" /><i className="h-2 w-2 rounded-full bg-white" /><i className="h-2 w-2 rounded-full bg-white/70" /><i className="h-2 w-2 rounded-full bg-[#ea580c]" /></span>
            <span className="text-lg font-extrabold tracking-tight">TrovaLabs</span>
          </Link>
          <nav aria-label="Main navigation" className="order-3 flex w-full items-center justify-center gap-x-5 gap-y-2 overflow-x-auto text-xs font-medium text-slate-500 sm:order-none sm:w-auto sm:gap-5 md:gap-7 md:text-sm">
            {navItems.map((item) => <a key={item.label} href={item.href} className="whitespace-nowrap transition-colors hover:text-[#f97316]">{item.label}</a>)}
          </nav>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-[#f97316] py-1.5 pl-5 pr-1.5 text-sm font-medium text-white transition-colors hover:bg-[#ea580c]">LOGIN<span className="grid h-8 w-8 place-items-center rounded-full bg-[#0f172a]"><ArrowRight className="h-4 w-4" /></span></Link>
        </header>

        <section className="relative flex flex-1 flex-col items-center justify-center py-10 text-center sm:py-12">
          <h1 className="max-w-4xl text-3xl font-extrabold leading-tight tracking-tight text-[#0f172a] md:text-4xl lg:text-5xl">We can&apos;t find the page that you’re looking for :(</h1>
          <p className="mt-3 text-sm font-medium text-slate-500 md:text-base">A critical <span className="text-[#f97316]">context</span> connection is missing.</p>

          <div aria-label="404 context node illustration" role="img" className="relative mt-5 flex h-[245px] w-full max-w-2xl items-start justify-center sm:h-[285px]">
            <div className="relative z-10 select-none pt-1 text-[124px] font-black leading-none tracking-[-0.1em] text-[#f97316] [text-shadow:0_2px_0_#fdba74,0_4px_0_#fb923c,0_6px_0_#ea580c,0_8px_0_#c2410c,0_16px_28px_rgba(234,88,12,.28)] sm:text-[160px] md:text-[190px]">404</div>
            <div aria-hidden="true" className="absolute bottom-2 left-1/2 h-24 w-[min(90%,520px)] -translate-x-1/2 rounded-[50%] border border-orange-200 bg-gradient-to-b from-white via-orange-50/70 to-orange-100/70 shadow-[0_22px_30px_-20px_rgba(15,23,42,.35)]" />
            <div aria-hidden="true" className="absolute bottom-7 left-1/2 h-16 w-[min(76%,420px)] -translate-x-1/2 rounded-[50%] border border-slate-200/90 bg-white/75 shadow-[inset_0_4px_12px_rgba(15,23,42,.06)]" />
            <svg aria-hidden="true" viewBox="0 0 520 128" className="absolute bottom-4 left-1/2 z-20 h-28 w-[min(94%,540px)] -translate-x-1/2 overflow-visible">
              <path d="M24 94 Q260 164 496 94 M62 86 Q260 139 458 86 M110 76 Q260 112 410 76 M160 67 Q260 88 360 67" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
              <path d="M90 79 145 41 195 72 252 27 308 68 368 37 429 78 M145 41 160 72 252 27 270 69 368 37 350 77" fill="none" stroke="#f97316" strokeOpacity=".7" strokeWidth="1.5" />
              {[ [90,79], [145,41], [195,72], [252,27], [308,68], [368,37], [429,78], [160,72], [270,69], [350,77] ].map(([cx, cy], i) => <g key={i}><circle cx={cx} cy={cy} r="8" fill="#fed7aa" opacity=".55" /><circle cx={cx} cy={cy} r="3.5" fill={i % 3 === 0 ? "#f97316" : "#fb923c"} /></g>)}
            </svg>
          </div>

          <Link to="/" className="relative z-30 -mt-1 inline-flex items-center gap-2 rounded-full bg-[#f97316] px-8 py-3.5 font-semibold text-white shadow-md transition-all hover:bg-[#ea580c]">BACK TO HOMEPAGE <ArrowRight className="h-4 w-4" /></Link>
        </section>

        <footer className="grid grid-cols-2 gap-x-6 gap-y-8 rounded-[28px] bg-[#0f172a] p-6 text-slate-300 sm:p-8 md:grid-cols-5">
          {footerColumns.map((column) => <div key={column.title}><h2 className="text-xs font-bold text-white">{column.title}</h2><ul className="mt-4 space-y-3">{column.links.map((item) => <li key={item.label}><a href={item.href} className="text-xs text-slate-400 transition-colors hover:text-orange-300">{item.label}</a></li>)}</ul></div>)}
          <div className="col-span-2 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 md:col-span-1 md:border-l md:border-t-0 md:pl-6 md:pt-0"><Link to="/" className="inline-flex w-fit items-center gap-2"><span className="grid h-8 w-8 grid-cols-2 place-items-center gap-1 rounded-xl bg-white/10 p-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#f97316]" /><i className="h-1.5 w-1.5 rounded-full bg-white" /><i className="h-1.5 w-1.5 rounded-full bg-white/70" /><i className="h-1.5 w-1.5 rounded-full bg-[#ea580c]" /></span><span className="text-sm font-extrabold text-white">TrovaLabs</span></Link><p className="text-[10px] leading-5 text-slate-500">© 2026 TrovaLabs, Inc.<br />All rights reserved.</p></div>
        </footer>
      </main>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TrovaLabs | Developer Context Platform" },
      {
        name: "description",
        content: "Unifying developer context for modern engineering teams.",
      },
      { name: "author", content: "TrovaLabs" },
      { property: "og:title", content: "TrovaLabs | Developer Context Platform" },
      {
        property: "og:description",
        content: "Unifying developer context for modern engineering teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
