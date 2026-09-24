---
name: add-chart-view
description: แปลงข้อมูลราคา OHLC ให้เป็นกราฟ แบ่งเป็นสองขั้นตอนภาพ — ต้นแบบกราฟเส้นด้วย Python แบบเร็วๆ จากนั้นดูตัวอย่างกราฟแท่งเทียนด้วย TradingView Lightweight Charts ใช้เมื่อถูกขอให้แสดงภาพราคา เพิ่มกราฟ หรืออัปเกรดกราฟเส้นธรรมดาให้เป็นแท่งเทียน
---

# Add a chart view

Companion to `add-price-feed` — that skill gets the OHLC numbers; this one turns them into
something to look at. Fixed recipe both times (fetch → plot), no judgment call, which is
why it's a skill and not an agent.

## When to use this

The user wants to see prices visually: "chart this symbol", "plot the price history",
"make the line chart a candlestick chart".

## Phase 1 — Python line chart (fast, ugly is fine)

Use when there's no chart yet for this data.

1. Make sure OHLC data exists — reuse `prototypes/price_feed.py` if it already fetches
   open/high/low/close, or extend it (`add-price-feed` skill) if it only has closes so far.
2. Write `prototypes/chart_view.py`: load that data, plot a plain line chart of the close
   price with `matplotlib`, save it as `prototypes/chart_view.png` (`plt.savefig`, don't
   rely on an interactive window popping up over screen-share).
3. Open the PNG. This is the whole point of phase 1: prove the data is chartable at all,
   in under a minute, with a library everyone already has a mental model for.

## Phase 2 — TradingView Lightweight Charts candlestick (the visual payoff)

Use once the line chart works, to show what the real dashboard version will look like.

1. Export the same OHLC data as JSON (`prototypes/chart_view.json` — reuse the shape
   `prototypes/price_feed.py` already produces, just write it to a file instead of only
   printing it).
2. Write a **standalone** `prototypes/chart_view.html` — a single file, no build step:
   load `lightweight-charts` from a CDN `<script>` tag, `fetch("chart_view.json")`, and
   call `createChart(...).addCandlestickSeries(...).setData(...)`. This is intentionally
   outside the Next.js app — it's a preview, not the real page yet.
3. Open it (`start prototypes/chart_view.html` on Windows, or just double-click) — this is
   the moment to show the class "this is what Session 2 wires into the actual Chart page."

## Phase 3 — Port into the dashboard (Session 2)

1. Read `dashboard/src/lib/dataSource.ts` and the ported `dashboard/src/lib/quotes.ts`/`ohlc.ts` pattern.
2. Add `"lightweight-charts"` to `dashboard/package.json` (`cd dashboard && npm install lightweight-charts`) — it's
   the one real npm dependency this skill introduces; everything in Phase 1-2 was
   disposable prototype code.
3. Build the actual `"use client"` chart component under `dashboard/src/features/chart/`, following
   whatever this project's existing chart component shape is if one already exists —
   otherwise mirror the CDN prototype's `createChart`/`addCandlestickSeries` calls using
   the npm import instead of the CDN global.
4. Wire it into `dashboard/src/app/(dashboard)/chart/page.tsx` with `add-dashboard-page` if the page
   doesn't already have a real feature folder.

## Conventions to preserve

- Phase 1-2 stay in `prototypes/`, disposable, never imported by the real app.
- Only Phase 3 touches `dashboard/package.json`/`dashboard/src/` — don't add `lightweight-charts` (or any npm
  package) before there's an actual page that needs it.
