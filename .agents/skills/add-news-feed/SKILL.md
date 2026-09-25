---
name: add-news-feed
description: เพิ่มฟีดข้อมูลหัวข้อข่าวให้ InvestView แบ่งเป็นสองขั้นตอน — ต้นแบบ Python ที่ใช้แล้วทิ้ง (แสดงผลในเทอร์มินัล ไม่ต้องมีแดชบอร์ด) ที่ดึงจาก Google News RSS โดยมี Yahoo Finance RSS เป็นตัวสำรอง จากนั้นพอร์ตเป็นเวอร์ชัน TypeScript ที่เป็นไปตามรูปแบบ cache-live-mock ของโปรเจกต์นี้ ใช้เมื่อถูกขอให้ดึงหัวข้อข่าวของหุ้น ทำต้นแบบแหล่งข้อมูลข่าว หรือพอร์ตสคริปต์ prototypes/news_feed.py ที่ใช้งานได้แล้วเข้าไปใน dashboard/src/lib
---

# Add the news feed

This skill has two phases. Which one runs depends on what exists already — check
`prototypes/news_feed.py` first.

## When to use this

The user describes wanting news headlines for a symbol ("get today's news headlines
for a symbol", "pull recent headlines from RSS") — either as a brand-new prototype,
or asking to port one that already runs.

## Phase 1 — Python prototype (no dashboard yet)

Use this when `prototypes/news_feed.py` doesn't exist yet.

1. **Confirm the shape**: for a given symbol, fetch recent headlines — title, source,
   published date, link — and print them as JSON. No framework, no persistence.
2. **Write `prototypes/news_feed.py`**: a plain script, no dashboard/Next.js involvement.
   - Primary source: **Google News RSS** (`https://news.google.com/rss/search?q=<symbol>...`),
     parsed with `feedparser`.
   - Fallback source: **Yahoo Finance RSS** for the same symbol, used only if the
     primary call fails or returns nothing.
   - Add `feedparser`/`requests` to `prototypes/requirements.txt` if not already there.
   - Wrap the live call in a `try/except` that falls back to a small hardcoded sample
     list of headlines, and `print(json.dumps(result, indent=2))` either way — this
     mirrors the cache→live→mock pattern the TypeScript side uses later, so porting it
     is a translation, not a redesign.
   - No API keys. Keyless public RSS feeds only, same policy as the rest of this
     project.
3. **Run it**: `python prototypes/news_feed.py` and read the printed JSON in the
   terminal. This is the entire deliverable for this phase — no UI.

## Phase 2 — Port to TypeScript (Session 2, once a dashboard page needs this feed)

Use this when `prototypes/news_feed.py` already runs and a real page needs its data.

1. **Read the working prototype** to see exactly what it fetches and from where —
   don't redesign the data shape, just translate the language.
2. **Read `dashboard/src/lib/dataSource.ts`** for the shared helpers (`getCached`, `setCached`,
   `fetchWithTimeout`, `withFallback`) every other data source in this app uses.
3. **Write `dashboard/src/lib/news.ts`** (or reuse it if this project already has one — check
   first): a `fetchNewsLive()` function doing the same Google News RSS call (with the
   Yahoo Finance RSS fallback) the Python prototype did, a `fixtureNews()` fallback
   (add fixture data under `dashboard/src/fixtures/` if there isn't one already), and a
   `getNews()` export wrapping both in `withFallback` + cache, matching the TTL
   conventions already used nearby.
4. **Add an API route** at `dashboard/src/app/api/news/route.ts` if a page will fetch this
   client-side.
5. **Verify**: `curl http://localhost:3000/api/news?symbol=<SYM>` (or load the route
   in a browser) returns the same headlines the Python prototype printed —
   `source: "live"` in normal conditions, and check that killing network access still
   returns 200 with `source: "mock"`.
6. Leave `prototypes/news_feed.py` in place afterward — it's a record of the
   prototype, not something `npm run dev` ever calls.

## Conventions to preserve

- Never introduce a Python subprocess into the running app — Python only exists in
  `prototypes/`, disposable, for Session 1 terminal demos before there's a dashboard.
- Keyless/no-auth data sources only, same as every other feed in this project.
- Match the TTL and fallback shape of the nearest existing `dashboard/src/lib/*.ts` file rather
  than inventing a new caching convention.
