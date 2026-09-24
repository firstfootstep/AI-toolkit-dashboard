---
name: add-price-feed
description: เพิ่มฟีดข้อมูลราคา/OHLC ให้ InvestView แบ่งเป็นสองขั้นตอน — ต้นแบบ Python ที่ใช้แล้วทิ้ง (แสดงผลในเทอร์มินัล ไม่ต้องมีแดชบอร์ด) ที่ดึงแท่ง OHLC ครบชุดจาก Yahoo Finance chart endpoint จากนั้นพอร์ตเป็นเวอร์ชัน TypeScript ที่เป็นไปตามรูปแบบ cache-live-mock ของโปรเจกต์นี้ ใช้เมื่อถูกขอให้ดึงราคาปิด/OHLC รายวันของหุ้น ทำต้นแบบแหล่งข้อมูลราคา หรือพอร์ตสคริปต์ prototypes/price_feed.py ที่ใช้งานได้แล้วเข้าไปใน dashboard/src/lib
---

# Add the price feed

This skill has two phases. Which one runs depends on what exists already — check
`prototypes/price_feed.py` first.

## When to use this

The user describes wanting price data for a symbol ("pull daily close prices", "get
OHLC bars for a symbol") — either as a brand-new prototype, or asking to port one that
already runs.

## Phase 1 — Python prototype (no dashboard yet)

Use this when `prototypes/price_feed.py` doesn't exist yet.

1. **Confirm the shape**: for a given symbol, fetch recent daily bars — date, open,
   high, low, close, volume — and print them as JSON. Keep the **full OHLC**, not just
   close: the chart-view skill reuses this exact output for candlesticks later, so
   dropping fields now means redoing this script then.
2. **Write `prototypes/price_feed.py`**: a plain script, no dashboard/Next.js involvement.
   - Source: the **Yahoo Finance chart endpoint** (the same data `yfinance` wraps —
     use the `yfinance` package directly per `prototypes/requirements.txt`).
   - Wrap the live call in a `try/except` that falls back to a small hardcoded sample
     set of OHLC bars, and `print(json.dumps(result, indent=2))` either way — this
     mirrors the cache→live→mock pattern the TypeScript side uses later, so porting it
     is a translation, not a redesign.
   - No API keys. Keyless public endpoints only, same policy as the rest of this
     project.
3. **Run it**: `python prototypes/price_feed.py` and read the printed JSON in the
   terminal. This is the entire deliverable for this phase — no UI.

## Phase 2 — Port to TypeScript (Session 2, once a dashboard page needs this feed)

Use this when `prototypes/price_feed.py` already runs and a real page needs its data.

1. **Read the working prototype** to see exactly what it fetches and from where —
   don't redesign the data shape, just translate the language.
2. **Read `dashboard/src/lib/dataSource.ts`** for the shared helpers (`getCached`, `setCached`,
   `fetchWithTimeout`, `withFallback`) every other data source in this app uses.
3. **Write `dashboard/src/lib/quotes.ts`** (or reuse it if this project already has one — check
   first): a `fetchQuoteLive()` function doing the same Yahoo Finance chart call the
   Python prototype did, a `fixtureQuote()` fallback (add fixture data under
   `dashboard/src/fixtures/` if there isn't one already), and a `getQuote()` export wrapping both
   in `withFallback` + cache, matching the TTL conventions already used nearby.
4. **Add an API route** at `dashboard/src/app/api/quotes/route.ts` if a page will fetch this
   client-side.
5. **Verify**: `curl http://localhost:3000/api/quotes?symbol=<SYM>` (or load the route
   in a browser) returns the same bars the Python prototype printed —
   `source: "live"` in normal conditions, and check that killing network access still
   returns 200 with `source: "mock"`.
6. Leave `prototypes/price_feed.py` in place afterward — it's a record of the
   prototype, not something `npm run dev` ever calls.

## Conventions to preserve

- Never introduce a Python subprocess into the running app — Python only exists in
  `prototypes/`, disposable, for Session 1 terminal demos before there's a dashboard.
- Keyless/no-auth data sources only, same as every other feed in this project.
- Match the TTL and fallback shape of the nearest existing `dashboard/src/lib/*.ts` file rather
  than inventing a new caching convention.
