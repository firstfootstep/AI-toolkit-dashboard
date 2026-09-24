---
name: add-dashboard-widget
description: เพิ่มวิดเจ็ตใหม่ (Card ที่มีกราฟ, สถิติ หรือตาราง) ให้กับหน้าแดชบอร์ด InvestView ที่มีอยู่แล้ว โดยเป็นไปตามการแบ่ง ui/ กับ features/ ของโปรเจกต์นี้ ใช้เมื่อผู้ใช้ขอให้เพิ่มกราฟ, การ์ดสถิติ, ตาราง หรือวิดเจ็ตให้หน้า Dashboard, Portfolio, Watchlist, Markets หรือ News
---

# Add a dashboard widget

This skill adds a self-contained widget — a `Card` showing a stat, chart, or table — to an
existing page, without breaking this project's separation between generic UI and
feature-specific logic.

## When to use this

The user asks to add something *inside* an existing page: "add a sector breakdown chart to
Portfolio", "show a 52-week high/low stat on Watchlist", "add a table of top movers to
Markets".

## The rule that matters most

- `dashboard/src/components/ui/` = dumb, reusable, **no knowledge of investing data shapes**
  (`Card`, `Badge`, `Stat`, `Sparkline`, `EmptyState`, `DataSourceBadge`). If your widget is
  generic enough to reuse elsewhere with different data, its primitive goes here.
- `dashboard/src/features/<feature>/` = everything that knows about `Quote`, `Holding`,
  `PortfolioSummary`, etc. Your new widget's component and any data-shaping helper go here,
  next to the feature it belongs to (`portfolio`, `watchlist`, `markets`, `news`, `scanner`,
  `research`, `settings`, ...).

Don't add a new top-level folder for one widget — extend the existing feature folder.

## Steps

1. **Identify the feature** the widget belongs to (matches the page it's going on).

2. **Get or shape the data.**
   - Prices/quotes → `getQuotes(symbols)` from `dashboard/src/lib/quotes.ts` (already
     cached + keyless-live + mock-fallback).
   - News → `getNews()` from `dashboard/src/lib/news.ts`.
   - Portfolio/holdings → `getPortfolioSummary()` / `allocationByAssetClass()` from
     `dashboard/src/features/portfolio/data.ts` (mock-only by design — see README).
   - If the widget needs a derived value (e.g. top movers, sector totals), add a small pure
     function next to the existing data helper in that feature folder — don't compute it
     inline in the page.

3. **Build the widget component** in `dashboard/src/features/<feature>/<WidgetName>.tsx`. Wrap it in
   the shared `Card` from `dashboard/src/components/ui/Card.tsx` for visual consistency:

   ```tsx
   import { Card } from "@/components/ui/Card";
   import { DataSourceBadge } from "@/components/ui/DataSourceBadge";

   export function TopMovers({ quotes, source }: { quotes: Quote[]; source: "live" | "mock" }) {
     return (
       <Card title="Top movers" action={<DataSourceBadge source={source} />}>
         {/* ... */}
       </Card>
     );
   }
   ```

   Reuse `Stat` and `Sparkline` for anything stat/trend-shaped, and `formatCurrency` /
   `formatPercent` / `formatCompact` from `dashboard/src/lib/format.ts` for numbers — don't
   hand-roll formatting again.

4. **If a live external data source is used and it's new** (not already covered by
   `getQuotes`/`getNews`), stop and follow the `data-source-auditor` agent's checklist
   first — this project's rule is that nothing shown live can break the page if the
   upstream fails.

5. **Wire it into the page** (`dashboard/src/app/(dashboard)/<page>/page.tsx`), passing data fetched
   in the (async, server) page component as props — widgets themselves stay presentational
   where possible. Client-only widgets (using hooks, `localStorage`, drag/drop) need
   `"use client"` at the top, matching the existing pattern in `ImportJournal.tsx` and
   `SettingsPanel.tsx`.

6. **Verify** in `npm run dev` (inside `dashboard/`): check the widget in both the `live` and forced-`mock`
   states (temporarily break the fetch URL, or disconnect network, to confirm the fallback
   badge and data render correctly), and in both light/dark mode.
