# Trova Context Hub

Build a complete, single-page landing page for "TrovaLabs" using React, TypeScript, and Tailwind CSS. The overall design language, UI system, rounded container cards, color palette, floating widgets, and visual hierarchy across all sections must strictly follow the modern rounded-card aesthetic established in the reference hero design.

---

### GLOBAL DESIGN SYSTEM & STYLING

- Outer Background: Soft neutral off-white canvas (`bg-[#e9ecef]`).

- Primary Card Styling: Crisp white background (`bg-white`), hyper-rounded corners (`rounded-[36px]`), subtle borders (`border border-slate-100`), soft drop shadows (`shadow-sm`).

- Brand Color Palette:

  - Primary Accent: Vivid Warm Orange (`#f97316` / `#ea580c`)

  - Dark Neutral: Deep Slate (`#0f172a`)

  - Soft Neutral: Cool Muted Gray (`#64748B` / `#94A3B8`)

- Typography: Modern sans-serif (Inter or Plus Jakarta Sans). Bold, high-contrast headings with clean tracking.

- Interactive Elements: Pill-shaped buttons with rounded-full geometry and smooth hover states.

---

### SECTION 1: HERO SECTION

1. Outer Layout:

   - Contained inside a large white rounded card (`rounded-[36px] bg-white p-8 md:p-12 shadow-sm relative overflow-hidden`).

2. Top Navigation Bar:

   - Left: Minimal abstract geometry logo icon + "TrovaLabs" text in bold slate.

   - Center: Nav links: "Home", "Solutions", "MCP Hub", "Docs", "Pricing" (muted gray font, subtle hover effect).

   - Right: Pill-shaped CTA button "LOGIN" in orange (`bg-[#f97316] text-white rounded-full px-6 py-2.5 font-medium flex items-center gap-2`) paired with an attached circular arrow icon badge (`bg-[#ea580c] rounded-full p-1.5`).

3. Left Column Content:

   - Top Tagline: `#No.1 Developer Context Platform` in orange (`text-[#f97316] text-sm font-semibold tracking-wide`).

   - Main Headline: Extra bold typography (`text-5xl md:text-6xl font-extrabold text-[#0f172a] leading-[1.15] mt-4 max-w-xl`).

     - Text: "Unifying Code Context For A <span className="text-[#f97316]">Smarter Future</span>"

   - Subtitle Paragraph: Muted gray text (`text-slate-500 text-sm md:text-base mt-6 max-w-md leading-relaxed`).

     - Text: "Join us in creating seamless engineering workflows with cutting-edge developer context aggregation and MCP tools."

   - Main CTA Button: Large orange pill button labeled "JOIN NOW" (`bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold rounded-full px-8 py-3.5 shadow-md transition-all mt-8`).

4. Floating Sub-Cards Overlay (Bottom-Left of Hero):

   - Card 1: Elevated floating white glassmorphism card with thumbnail icon, title "Context Hub", subtitle "Live Pipeline Indexing" (`bg-white/90 backdrop-blur rounded-2xl p-3 shadow-lg flex items-center gap-3 border border-slate-100`).

   - Card 2: Positioned slightly offset below Card 1, thumbnail icon, title "MCP Server Engine", subtitle "Connected to IDEs".

5. Right Column Hero Visual (3D Asset):

   - Render a high-res 3D tech/node asset or abstract metallic structure breaking out of the top right of the white container card (matching the spatial overflow of the wind turbine in the reference layout).

   - Include a floating circular orange badge with a lightning icon near the top right of the 3D element.

6. Bottom Metrics Bar (Dual Rounded Sub-Cards directly below Hero):

   - Two side-by-side white rounded cards (`bg-white rounded-[28px] p-6 shadow-sm flex items-center gap-12 border border-slate-100 mt-4`):

     - Metric 1: **99.9%** | Uptime & Context Retrieval Accuracy

     - Metric 2: **10x+** | Faster Engineering Context Search

---

### SECTION 2: CORE FEATURES (GRID OF ROUNDED CARDS)

- Section Header: Centered tagline `#TrovaLabs Capabilities` in orange, followed by headline "Everything You Need for Unified Context".

- Layout: 3-column grid of white rounded cards (`rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all`).

- Card 1: "Real-Time PR Ingestion" – Automatic GitHub/GitLab webhook processing with real-time indexing.

- Card 2: "Model Context Protocol (MCP)" – Direct IDE connection for Cursor, VS Code, and Claude Code.

- Card 3: "Unified Search Engine" – Instant cross-repository and internal documentation context retrieval.

---

### SECTION 3: HOW IT WORKS (STEP-BY-STEP PROCESS)

- Container: Single large white rounded card (`rounded-[36px] p-10 md:p-14 bg-white border border-slate-100 shadow-sm mt-8`).

- Header: Left-aligned headline "Seamless Setup in 3 Minutes".

- Steps Layout (3 Horizontal Columns):

  - Step 01: "Connect Repositories" – One-click GitHub OAuth authorization.

  - Step 02: "Spin Up MCP Server" – Expose context to your local or cloud IDE assistants.

  - Step 03: "Query Anywhere" – Search context directly from code editors, web UI, or PR comments.

---

### SECTION 4: PRICING TIERS

- Layout: 3-column cards enclosed inside rounded white containers (`rounded-[32px] p-8 border border-slate-100 shadow-sm relative`).

- Card 1 (Community / Free): $0/mo – Single repository, local MCP server, basic context search.

- Card 2 (Pro / Teams - Featured with Orange Accent Border & Badge): $29/dev/mo – Multi-repo indexing, Slack/GitHub webhooks, team search.

- Card 3 (Enterprise): Custom Pricing – Dedicated deployment, SAML SSO, custom security audit logs.

---

### SECTION 5: FOOTER SECTION

- Outer Frame: Large white rounded card (`rounded-[36px] bg-white p-8 md:p-12 border border-slate-100 shadow-sm mt-8 mb-8`).

- Content Layout:

  - Left: Logo + "TrovaLabs" brand name + brief description "Unifying developer context for modern engineering teams."

  - Right: Column links for "Product", "Developers", "Company", and "Legal".

  - Bottom Bar: Copyright notice + social links + small orange pill button "BACK TO TOP".

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## MCP integration

The local MCP adapter lives in `packages/mcp-server`; the Node API and PostgreSQL/pgvector schema live in `services/api`.

1. Start PostgreSQL with pgvector, copy `services/api/.env.example` to `services/api/.env`, and configure the database, session signing secret, and embeddings provider.
2. In `services/api`, run `npm install`, `npm run db:migrate`, then `npm run dev`.
3. Set `VITE_TROVALABS_API_URL=http://localhost:4000` for the dashboard. Create a real workspace API key after signing in with a session JWT accepted by the API service.
4. In `packages/mcp-server`, run `npm install` and `npm run build`. Configure the IDE with `npx -y @trovalabs/mcp-server` and `TROVALABS_API_KEY`.

The dashboard defaults to the local API on port 4000 in development and `https://api.trovalabs.com` in production. Production deployment also needs HTTPS, database migrations, a trusted session issuer using the configured HS256 secret and workspace claims, and repository ingestion to populate the context tables.
