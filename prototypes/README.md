# Session 1 prototypes (Python)

This folder starts **empty** on purpose — it's where Session 1 begins, before any
Next.js dashboard exists. Each block of Session 1 follows the same loop here:

1. Write a short `name` / `description` / what-to-do for one script (e.g. "fetch
   today's market news headlines for a symbol from Google News RSS, print as JSON").
2. Let Claude Code fill in the actual script as `prototypes/<name>.py`.
3. Run it — `python prototypes/<name>.py` — and read the printed output right in the
   terminal. No server, no browser, no dashboard needed yet.

Session 2 then **ports** whichever of these scripts worked into
`dashboard/src/lib/<name>.ts`, following the cache → live → mock pattern in
`dashboard/src/lib/dataSource.ts` — the same shape every other data source in this app already
uses. The Python script is disposable once it's ported; it stays here as a record of
what was prototyped, not as a running part of the app. `npm run dev` never calls
anything in this folder — this project is still one Next.js process, no Python
subprocess in production (the old `scanner-service/` was removed for that reason).

## Setup

```bash
cd prototypes
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

## Planned scripts (built live in class, not pre-written)

| Script | Session 1 block | Data source |
| --- | --- | --- |
| `news_feed.py` | Skill 1: Newsfeed | Google News RSS (+ Yahoo Finance RSS fallback) |
| `price_feed.py` | Skill 2: Price feed | Yahoo Finance chart endpoint (`yfinance`-equivalent) |
| `market_commentary.py` | Agent 1: Market commentary | Reads output of the two scripts above |
| `scanner_insight.py` | Agent 2: Scanner insight | TradingView scanner API (`tvscreener`-equivalent) |
| `chart_view.py` + `.png` | Skill 3: Chart | reuses `price_feed.py`'s OHLC output — `matplotlib` line chart |
| `chart_view.json` + `.html` | Skill 3: Chart, phase 2 | same data, rendered as a candlestick preview with TradingView's `lightweight-charts` (CDN, standalone HTML — no build step) |
| (inline computation) | Agent 3: Sector Rotation (RRG) | reuses `price_feed.py` + `scanner_insight.py`'s `sector` field — RS-Ratio/RS-Momentum computed directly by the agent, no separate script |

Portfolio metric (the 4th skill) does **not** go through this folder — it has no external source to
prototype, just derived math over the already-generated `dashboard/src/fixtures/trade-setups.csv`, so it's
written directly as TypeScript in Session 1 (see `.claude/skills/add-portfolio-metric/SKILL.md`).
