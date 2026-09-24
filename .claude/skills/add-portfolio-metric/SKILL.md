---
name: add-portfolio-metric
description: คำนวณตัวชี้วัดพอร์ตที่ได้จากข้อมูลอื่น (% การจัดสรรสินทรัพย์, กำไร/ขาดทุน, ต้นทุน ฯลฯ) จากบันทึกการเทรดจำลองใน dashboard/src/fixtures/trade-setups.csv ใช้เมื่อถูกขอให้เพิ่มการคำนวณพอร์ต สรุปสัดส่วนการถือครอง หรือตัวชี้วัดผลตอบแทน — นี่คือสูตรตายตัวบนข้อมูลที่มีอยู่แล้ว ไม่ต้องใช้วิจารณญาณ
---

# Add a portfolio metric

Unlike `add-news-feed`/`add-price-feed`, this isn't fetching anything external — `dashboard/src/fixtures/trade-setups.csv`
(~36 mock trades) is already there, generated once for the course. It's the ONE master journal
the whole Portfolio page (and the Dashboard/Reports summaries) already derives from via
`getTradingJournalStats()` in `dashboard/src/lib/tradingJournal.ts` — reuse that function's output rather
than re-parsing the CSV, so a new metric never drifts out of sync with the rest of the app. This
skill turns that already-computed state into a specific derived number or breakdown. It's a
skill and not an agent because the formula for any given metric is fixed once someone states
it — there's no judgment call about which sectors are "interesting" the way
`scanner-insight-agent` has to make.

## When to use this

The user names a specific metric: "show allocation % by symbol", "compute realized P&L",
"what's the current cost basis per holding", "add a metric for average holding days".

## Steps

1. **Read `dashboard/src/lib/tradingJournal.ts`** to see what `getTradingJournalStats()` already
   returns (`holdings`, `closedTradesList`, `series`, `netPnl`, `winRate`, ...) — most
   metrics are a small fold over one of those, not a fresh CSV parse. Only read
   `dashboard/src/fixtures/trade-setups.csv` directly if the metric needs a column that function
   doesn't expose yet (e.g. `setup`, `rsRating`, `relativeVolume` — those come from
   `getTradeSetups()` in `dashboard/src/lib/tradeSetups.ts` instead).

2. **Write or extend `dashboard/src/features/portfolio/data.ts`** (or a new `dashboard/src/lib/portfolio.ts`
   if the metric doesn't fit that file's existing shape):
   - Fold over `getTradingJournalStats()`'s `holdings/closedTradesList` — don't
     re-implement FIFO lot matching, that's already done for you.
   - Export one function per metric (e.g. `getAllocations()`, `getAvgHoldingDays()`)
     rather than one giant function returning everything — pages will import only what
     they need.

3. **No live/mock fallback tier needed here** — the CSV *is* the fixture, there's no
   external network call to fail. Don't wrap this in `withFallback`; that pattern is
   for `dashboard/src/lib/news.ts`/`quotes.ts`-style external feeds only.

4. **Wire into the Portfolio page** (`dashboard/src/app/(dashboard)/portfolio/page.tsx` via
   `dashboard/src/features/portfolio/`) using the `add-dashboard-widget` skill for the Card/chart
   shell around the numbers this produces.

5. **Verify**: the numbers should be internally consistent — allocations sum to 100%,
   and should match what the Portfolio page's other tabs already show for the same
   trades (flag it as a data problem in the CSV if they don't, don't silently patch it).

## Conventions to preserve

- Derived-data logic belongs in `dashboard/src/lib/portfolio.ts`, not inline in a component —
  same separation `dashboard/src/features/portfolio/` already uses for judgment-free math.
- Keep each exported function's return shape small and specific to one metric.
