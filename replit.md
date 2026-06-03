# Seamless AI Continuity Bridge

Extract and convert AI chat conversations (ChatGPT, Claude, Gemini, Grok, Perplexity, DeepSeek, Mistral, Copilot) into portable formats so you can seamlessly continue them in any LLM.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS v4 + Framer Motion
- API: Express 5 (port 8080, preview path `/api`)
- DB: PostgreSQL + Drizzle ORM
- Web scraping: axios + cheerio (Node.js only — no Python dependency)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/bridge/` — React+Vite frontend (preview path `/`)
  - `src/App.tsx` — main app (1231 lines), all tabs and chat extraction logic
  - `src/components/` — About, FAQ, Impact, Security, Privacy, Terms, Contact, ApiDocs, ExtensionPage, Vault, PasteViewer, PdfEditor, DonationModal, DonationSection, LiveGlobeSection, RotatingEarth, AILogoMarquee
  - `public/world.geo.json` — world GeoJSON for the 3D rotating globe
- `artifacts/api-server/src/routes/bridge.ts` — main extraction route (HTML upload + share link scraping + paste storage)
- `artifacts/api-server/src/routes/stats.ts` — visitor/use/platform stats
- `artifacts/api-server/src/lib/crawl4aiScraper.ts` — Node-only scraper (axios → jina.ai → cheerio extractors)
- `lib/db/src/schema/` — `pastes.ts`, `platformStats.ts`, `stats.ts`

## Architecture decisions

- **Python scraper replaced with Node-only**: Original used a Python venv + Crawl4AI. Replit doesn't support Python venvs in this setup, so `crawl4aiScraper.ts` was rewritten to use `axios` (jina.ai reader → direct fetch) + `cheerio` cheerio extractors for each AI platform.
- **Paste storage via DB**: Extracted chats are stored as text in the `pastes` table with UUID IDs and 7-day expiry for shareable bridge links.
- **Stats tracking**: `site_stats` table (single row, id=1) tracks visitors/uses. `platform_stats` table tracks per-platform usage counts.
- **GeoJSON static asset**: `world.geo.json` (~14MB) lives in `artifacts/bridge/public/` and is served statically by Vite for the RotatingEarth D3 globe component.
- **No OpenAPI codegen used**: The frontend calls the API directly with `fetch()` since all data shapes are simple and defined inline. No react-query hooks generated.

## Product

- **Chat extraction**: Paste a share link (ChatGPT, Gemini, Perplexity, DeepSeek) or upload a saved HTML file (all platforms) to extract the full conversation.
- **Export formats**: Copy as prompt text, download as Markdown, JSON, DOCX, or PDF. Generate a shareable bridge link.
- **Vault**: Browse and restore previously extracted chats stored in the browser (localStorage).
- **Live stats globe**: Animated 3D globe with real-time visitor/use stats and per-platform breakdown.
- **Chrome Extension support**: Extension can relay page HTML to the app directly from within the AI chat tab.

## Gotchas

- The bridge route (`/api/extract`) expects multipart for HTML uploads and JSON for link extraction.
- Claude and Grok use Cloudflare protection — link extraction often fails; HTML export recommended for those platforms.
- The `world.geo.json` file is ~14MB; first load of the Globe section may take a moment.
- `pnpm --filter @workspace/db run push` must be run after any schema changes before the API server will work.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
