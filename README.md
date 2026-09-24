# InvestView Dashboard

A personal investment dashboard built with Next.js (App Router) + TypeScript + Tailwind CSS,
used as course demo material for teaching Claude Code skills/agents.

The course builds it in stages — the skills and agents in `.claude/` come first (with
throwaway Python prototypes in `prototypes/`), then the Next.js app in `dashboard/` is
assembled from them menu by menu. This repo is the finished result, for reference.

## Repo layout

```
AI-toolkit-dashboard/
├── .claude/skills/    ← skills (fixed-recipe tasks) built in Session 1
├── .claude/agents/    ← agents (judgment-driven tasks) built in Session 1
├── dashboard/         ← the Next.js app itself — everything `npm` runs lives here
└── prototypes/        ← Session 1's disposable Python scripts
```

Open Claude Code at the **repo root** (so it picks up `.claude/`), but run every `npm` /
`node` command from inside `dashboard/`.

## Run it locally

```bash
git clone https://github.com/firstfootstep/AI-toolkit-dashboard.git
cd AI-toolkit-dashboard/dashboard
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to `/dashboard`.

No API keys are required — nothing else needs to run, one process, one port. **Exception:**
the Research page's "Research a symbol" box calls Claude live (see below); it shells out to
the `claude` CLI, so it works as long as you're logged into Claude Code on this machine —
no `ANTHROPIC_API_KEY` needed for that path. (A separate, API-key-based implementation is
kept in `dashboard/src/lib/researchAgent.ts` as `generateResearchBriefViaApiKey`, for a server with no
Claude Code session logged in — see `dashboard/.env.local.example` if you switch to it.) Stock
quotes and news use keyless public endpoints and always fall back to bundled mock data if
the network call fails (see **Data sources** below), so the app never breaks mid-lesson
even offline. The Scanner page's TradingView tier (see below) is also called directly from
this same Next.js server — there used to be a separate Python microservice for this
(`scanner-service/`), but it was folded into `dashboard/src/lib/tvScreener.ts` so students only ever
run `npm run dev`.

## Design system

Visual style (color, type, radius, shadow, motion) follows the "Wiki Market / Editorial
Swiss" tokens from a co-teacher's `dashboard/DESIGN.md` — one warm-ivory light theme, no dark mode.
All tokens live in `:root` in `dashboard/src/app/globals.css` and are exposed as Tailwind utilities
via `@theme inline` (`bg-canvas`, `text-ink`, `bg-primary`, `text-primary-bright`, `bg-lime`,
`bg-coral`, `border-line`, `rounded-sm/md/lg`, `shadow-sm/md`). Don't hardcode a new color,
radius, or shadow in a component — extend the tokens instead.

## Folder map

Each sidebar menu item owns one route and, where it has real logic, one feature folder.
Three rules to hold in your head:

- `dashboard/src/features/<name>/` — a feature's components, data helpers, and types live together.
- `dashboard/src/components/ui/` — dumb, reusable primitives only (Card, Badge, Stat, Sparkline…). No feature logic.
- `dashboard/src/components/layout/` — the app shell (Sidebar, Topbar, ComingSoon stub).

| Sidebar menu | Route | Feature folder | Status |
| --- | --- | --- | --- |
| Dashboard | `dashboard/src/app/(dashboard)/dashboard/` | uses portfolio + markets + watchlist + news features | Built |
| Market & News | `dashboard/src/app/(dashboard)/markets/` | `dashboard/src/features/markets/`, `dashboard/src/features/news/` | Built (Markets + News merged into one page; live/keyless quotes + RSS + an unofficial high-impact economic calendar — see below). `/news` redirects here. |
| Watchlist | `dashboard/src/app/(dashboard)/watchlist/` | `dashboard/src/features/watchlist/` | Built (live/keyless quotes; rows link to Chart) |
| Scanner | `dashboard/src/app/(dashboard)/scanner/` | `dashboard/src/features/scanner/` | Built (market picker; whole market preloaded server-side, filter/sort client-side) |
| Chart | `dashboard/src/app/(dashboard)/chart/` | `dashboard/src/features/markets/CandlestickChart.tsx`, `SymbolSwitcher.tsx` | Built (`?symbol=&exchange=` — candlestick OHLC via `lightweight-charts` + symbol news) |
| Sector Rotation | `dashboard/src/app/(dashboard)/sector-rotation/` | `dashboard/src/features/sector-rotation/`, `dashboard/src/lib/rrg.ts` | Built (real RS-Ratio/RS-Momentum RRG for all 11 sector SPDR ETFs vs SPY, from live OHLC) |
| Research | `dashboard/src/app/(dashboard)/research/` | `dashboard/src/features/research/` | Built (renders `dashboard/research-briefs/`; an on-page form calls Claude to generate one in Thai — see below) |
| Portfolio | `dashboard/src/app/(dashboard)/portfolio/` | `dashboard/src/features/portfolio/` | Built (mock data + trading-journal import) |
| Reports | `dashboard/src/app/(dashboard)/reports/` | `dashboard/src/features/reports/` | Built (monthly performance report from the portfolio fixture + CSV export) |
| Alerts | `dashboard/src/app/(dashboard)/alerts/` | `dashboard/src/features/alerts/` | Built (local-only, no backend) |
| Settings | `dashboard/src/app/(dashboard)/settings/` | `dashboard/src/features/settings/` | Built (local-only) |

Other top-level folders:

- `dashboard/src/fixtures/` — every mock dataset (`trade-setups.csv`, `quotes.json`, `news.json`,
  `watchlist.json`, `economic-calendar.json`). Read these first to see what "fake" data
  looks like.
- `dashboard/src/lib/` — shared, framework-agnostic logic: `dataSource.ts` (the fallback/cache
  pattern), `quotes.ts` / `news.ts` (the keyless Yahoo tier), `tvScreener.ts` (the
  TradingView scanner tier, called directly — no separate service), `economicCalendar.ts`
  (the unofficial Forex Factory calendar tier — see below), `ohlc.ts` (candlestick
  fallback chain), `format.ts`.
- `dashboard/src/app/api/` — thin Route Handlers (`/api/quotes`, `/api/news`) that wrap the `lib/`
  functions, for teaching Route Handlers separately from server components that call the
  same functions directly. `/api/research` is the one exception that isn't a thin wrapper —
  see "Research: calling Claude live" below.
- `dashboard/public/templates/trading-journal-template.xlsx` — downloadable template for the
  Portfolio page's journal import (regenerate with `node scripts/generate-template.mjs` from inside `dashboard/`).
- `.claude/skills/`, `.claude/agents/` — Claude Code skill/agent definitions for extending
  this project during the course (see below).

## Data sources ("never break live" pattern)

Every external call in this app follows the same shape, implemented once in
`dashboard/src/lib/dataSource.ts` and reused by `dashboard/src/lib/quotes.ts` and `dashboard/src/lib/news.ts`:

1. Check a short in-memory cache (60s for quotes, 5min for news) so repeated page loads
   during a lesson don't hammer the upstream source.
2. Try the live, **keyless** upstream with a hard timeout:
   - Quotes: Yahoo Finance's public chart endpoint (`query1.finance.yahoo.com`).
   - News: Yahoo Finance's public RSS feed (`finance.yahoo.com/news/rssindex`).
3. On **any** failure (network error, timeout, unexpected shape, rate limit), fall back to
   the matching fixture in `dashboard/src/fixtures/` instead of throwing.

Every page/API response carries a `source: "live" | "mock"` flag, shown in the UI as a
small badge (`dashboard/src/components/ui/DataSourceBadge.tsx`) — so a class always sees which mode
it's in instead of a broken page.

Portfolio holdings are **mock-only by design** (this is a personal demo, not a brokerage
integration) — derived from `dashboard/src/fixtures/trade-setups.csv` (the one master trading journal
every Portfolio/Dashboard/Reports number is computed from, via `getTradingJournalStats()` in
`dashboard/src/lib/tradingJournal.ts`), or a student's own imported trading journal (see below).

### The TradingView tier (Scanner)

Scanner adds a tier **above** the keyless Yahoo tier: `dashboard/src/lib/tvScreener.ts` posts
directly to `scanner.tradingview.com`, replaying the request TradingView's own website
makes internally (same request shape as the `tradingview-screener` Python package, ported
to a `fetch` call). **This isn't a documented, public TradingView API** — it can change or
get rate-limited/blocked without notice, and using it this way isn't covered by any
published ToS. That's a deliberate, informed tradeoff for this course material (richer
data, real multi-market coverage), not an oversight — but say so if you reuse this pattern
elsewhere. The fallback chain is:

1. **TradingView** (unofficial, `tvScreener.ts`) — richer fields (market cap, real sector
   taxonomy), many markets (`SCANNER_MARKETS` in `dashboard/src/features/scanner/types.ts`).
2. **Yahoo Finance** (keyless) — US market only, for Scanner.
3. **Mock fixture** — last resort, always available.

Chart's candlesticks are simpler: Yahoo Finance's chart endpoint already returns full
OHLC (not just close), so it's the sole live tier there, with the same mock-fixture
fallback (`dashboard/src/lib/ohlc.ts`).

### The economic calendar tier (Market & News)

`dashboard/src/lib/economicCalendar.ts` calls `nfs.faireconomy.media/ff_calendar_thisweek.json`, an
unofficial JSON mirror of Forex Factory's calendar — same caveat as the TradingView tier
above: not a documented public API, no published rate limit, can change shape or get
blocked without notice (mitigated here with a 30min cache instead of the usual few
minutes). It also only ever returns `forecast`/`previous`, never `actual` — that field is
rendered client-side on the real forexfactory.com page, not present in this static export
— so a live row's Actual column is typically "—". The bundled fixture's `actual` values are
illustrative demo data showing what the forecast-vs-actual comparison looks like, not real
historical prints. Both the live filter and the UI's "today"/"yesterday" grouping use the
same `Asia/Bangkok` day boundary (`CALENDAR_TIMEZONE` in `economicCalendar.ts`) so they
never disagree about which column an event belongs in.

Every response still carries `source: "tradingview" | "live" | "mock"`
(`DataSourceStatus` in `dashboard/src/types/market.ts`), shown via the same `DataSourceBadge` — so
which tier served a given page is always visible, never silently swapped.

### Research: calling Claude live

Every data source above is keyless and follows cache → live → mock. The Research page's
"Research a symbol" box is a deliberate exception: it's not a market-data fetch, it's an
on-demand call to Claude itself, hit via `POST /api/research`.

`dashboard/src/lib/researchAgent.ts` exports two implementations:

- **`generateResearchBrief` (default, used by the route)** — shells out to the `claude` CLI
  in headless print mode (`-p --output-format json`), authenticating with whatever Claude
  Code login is active on this machine. No `ANTHROPIC_API_KEY` needed, but it draws on your
  personal Claude Code usage/rate limit and is noticeably slower (~20-30s+ per call,
  measured live — the CLI reloads this project's context on every invocation) than a direct
  API call. On Windows this resolves the real `claude.exe` the npm `.cmd` shim wraps, since
  `execFile` can't launch `.cmd` files directly and shell invocation can't safely escape a
  multi-line `--system-prompt`. Fine for a single-person demo; swap to the function below
  before this serves real concurrent traffic.
- **`generateResearchBriefViaApiKey`** — the original implementation via the Anthropic
  SDK (`claude-sonnet-5`, medium effort, hosted `web_search` tool). Needs
  `ANTHROPIC_API_KEY` (copy `dashboard/.env.local.example` to `dashboard/.env.local`, restart `npm run dev`) and
  bills per token against API console credits — a separate account/balance from any
  Claude.ai/Claude Code subscription, but genuinely metered-only (no platform fee beyond
  token cost). Use this once the app runs somewhere without a logged-in Claude Code session.

Either way, if the call fails the box returns a plain error and the rest of the app is
unaffected.

Design notes, for anyone extending this pattern elsewhere in the app:

- **The brief is written in Thai** (`SYSTEM_PROMPT` instructs this explicitly) — tickers,
  numbers, dates, and source URLs are left in their original form.
- **No filesystem/bash tools are given to Claude** for the API-key path (the CLI path
  restricts to `--allowedTools WebSearch`, same intent). This runs from a public form
  submission, so the API route does all file I/O itself (`writeResearchBrief` in
  `dashboard/src/features/research/data.ts`) after getting back plain markdown text.
- **Same output contract as `earnings-preview-agent`** (`.claude/agents/`, supersedes the
  older `symbol-research-agent` — kept in the repo but no longer the one demoed): both
  produce a `## `-sectioned markdown brief — now including GFM tables and a small
  ` ```chart:bar/line ` fence, parsed/rendered by `dashboard/src/features/research/markdown.tsx` —
  so the Research page renders either path identically. The Claude Code agent gets Bash/
  `yfinance` for real beat/miss history, peer comparison, and next-day price reaction data
  plus open-ended web research (see Session 1's lesson plan); this route pre-fetches the
  same real EPS numbers itself (`dashboard/src/lib/earnings.ts`) and hands them to Claude as context,
  since the public form only gets `WebSearch` — same idea compressed into one call, minus
  local tool execution.

### Upgrading to a keyed provider

Yahoo's endpoints are unofficial and can change shape without notice. If you want to swap
in a stricter, documented API (e.g. Alpha Vantage), replace the `fetchLiveQuote` /
`fetchLiveNews` functions in `dashboard/src/lib/quotes.ts` / `dashboard/src/lib/news.ts` — the cache/fallback
wrapper (`withFallback`) doesn't need to change.

## Importing your own trading journal

On the Portfolio page, click **Download template** for a `.xlsx` starter file, or use your
own `.xlsx` / `.csv` with these columns: `date, symbol, side, quantity, price, fees, notes`.

Parsing happens entirely in the browser (`dashboard/src/features/portfolio/parseTradingJournal.ts`,
using `exceljs`) — nothing is uploaded anywhere. Bad rows are reported individually
("row 14: date unparseable") rather than failing the whole file; valid rows are kept in
`localStorage` under `investview.tradingJournal`.

## Claude Code skills & agents

This repo includes real `.claude/skills/` and `.claude/agents/` definitions, meant to be
demoed live in the course:

- `.claude/skills/add-dashboard-page/` — scaffolds a new sidebar page (route + nav entry)
  following this project's conventions.
- `.claude/skills/add-dashboard-widget/` — scaffolds a new `Card` widget inside an existing
  page, following the `ui/` vs `features/` split.
- `.claude/agents/data-source-auditor.md` — a **review** agent: checks any new external
  API integration against the "never break live" pattern described above (server-side
  keys, caching, fixture fallback). It never writes code, only reports findings.
- `.claude/agents/earnings-preview-agent.md` — a **generative** agent: given a ticker, it
  pulls real numbers via `yfinance` (consensus, beat/miss history, next-day stock reaction,
  analyst sentiment, peer valuation) plus live web research (guidance, segment detail,
  supplier/customer ecosystem) and writes a data-grounded Thai brief with judgment calls a
  fixed recipe can't make (how much to trust thin coverage, whether two guidance figures
  are being conflated). Meant to be run live so a class watches multi-step, autonomous tool
  use — the counterpoint to the two deterministic skills above. Supersedes the older
  `.claude/agents/symbol-research-agent.md` (still present, same output contract, just a
  narrower web-search-only version) for this project.

**Skill vs. agent, the short version:** a skill is the right shape when there's one fixed
recipe to follow every time (add a page, add a widget) — the two above are exactly that.
An agent is the right shape when the task requires judgment about *how* to proceed, not
just what template to fill (how much a thin news trail can be trusted, whether a data
integration actually satisfies a checklist) — the two agents above are exactly that.
Reports (still a `ComingSoon` stub) is this project's built-in skill exercise: extend it
with the deterministic `add-dashboard-page` skill, reusing the holdings math already in
`dashboard/src/features/portfolio/data.ts`. Research is already wired to `earnings-preview-agent`'s
output (`dashboard/src/features/research/`) — running the agent on a ticker is enough to see a real
brief appear on the page, no extra wiring needed.
