import { fetchWithTimeout } from "@/lib/dataSource";

/**
 * Direct port of scanner-service/main.py's `/screener` endpoint — calls
 * TradingView's own (undocumented, reverse-engineered) scanner API from the
 * Next.js server instead of proxying through a separate Python process, so
 * `npm run dev` alone is enough to serve this tier. Same request shape as
 * the `tradingview-screener` Python package: POST a JSON query to
 * `https://scanner.tradingview.com/{market}/scan`.
 *
 * This only covers the screener. OHLC/candles never went through this route
 * for "no exchange" callers, and even with an exchange the TradingView tier
 * was just one candidate among several — Yahoo Finance (src/lib/ohlc.ts)
 * already returns real OHLC data with no auth, so it's the sole live tier
 * for charts now rather than porting TradingView's WebSocket chart protocol.
 */

const TIMEOUT_MS = 10_000;

const COLUMNS = [
  "name",
  "description",
  "close",
  "change",
  "change_abs",
  "volume",
  "market_cap_basic",
  "sector",
  "exchange",
  // Fundamentals tier — same "unofficial, may change/return null" caveat as
  // the columns above. Field names are TradingView's internal scanner keys
  // (mirrors the `tradingview-screener` Python package); a wrong/renamed key
  // degrades to `null` for that one column rather than failing the request.
  "price_earnings_ttm",
  "earnings_per_share_diluted_yoy_growth_ttm",
  "dividends_yield_current",
  "Recommend.All",
  "Perf.Y",
  "total_revenue_yoy_growth_ttm",
  "price_earnings_growth_ttm",
  "return_on_equity",
  "beta_1_year",
  "earnings_release_date",
  "earnings_release_next_date",
  // Added for the Scanner's quick-filter chips (52-week high, volume surge,
  // RS score): 52w high for "near high", 10d relative volume for "volume
  // surge", 3M/6M perf blended with the existing 1Y perf above into a
  // percentile-rank RS score (see rsScore in features/scanner/data.ts).
  "price_52_week_high",
  "relative_volume_10d_calc",
  "Perf.3M",
  "Perf.6M",
  // Added for the Chart page's "ผลตอบแทนราคา" (price returns) row — 1W/1M
  // fill out the 1W/1M/3M/6M/1Y set alongside the two above and Perf.Y.
  "Perf.W",
  "Perf.1M",
  // Added for the Legend Scanner's Lynch/Buffett/Minervini screens
  // (src/lib/legendScanner.ts) — debt/equity for the "low leverage" check
  // both legends use, 50/150/200-day SMA + 52-week low for Minervini's
  // trend template. SMA150 confirmed live (2026-09-16): TradingView's
  // scanner accepts arbitrary "SMA<period>" column names, not just the
  // round 20/50/100/200 periods shown in their own UI presets — don't
  // assume a period is unsupported without testing it directly. Same
  // "unofficial, degrades to null if renamed" caveat as every other
  // column here.
  "debt_to_equity",
  "SMA50",
  "SMA150",
  "SMA200",
  "price_52_week_low",
  // Added for the Legend Scanner's Qullamaggie (momentum breakout) and
  // Graham (deep value) screens — 20-day SMA + ATR/daily volatility for
  // the trend/tightness checks Qullamaggie's style needs, price/book +
  // current ratio for Graham's classic defensive-investor checks, 10-day
  // average volume as a liquidity floor. All confirmed live (2026-09-16).
  "SMA20",
  "ATR",
  "Volatility.D",
  "price_book_fq",
  "current_ratio",
  "average_volume_10d_calc",
] as const;

export interface TVScreenerRow {
  ticker: string; // e.g. "NASDAQ:AAPL"
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
  peRatio: number | null;
  epsDilGrowthPercent: number | null;
  divYieldPercent: number | null;
  analystRating: number | null; // TradingView's -1 (strong sell) .. +1 (strong buy) aggregate
  perfYearPercent: number | null;
  revenueGrowthPercent: number | null;
  pegRatio: number | null;
  roePercent: number | null;
  beta: number | null;
  recentEarningsDate: string | null; // ISO date
  upcomingEarningsDate: string | null; // ISO date
  fiftyTwoWeekHigh: number | null;
  relativeVolume: number | null; // today's volume / 10-day average volume
  perf3MPercent: number | null;
  perf6MPercent: number | null;
  perfWeekPercent: number | null;
  perf1MPercent: number | null;
  debtToEquity: number | null;
  sma50: number | null;
  sma150: number | null;
  sma200: number | null;
  fiftyTwoWeekLow: number | null;
  sma20: number | null;
  atr: number | null; // average true range, absolute price units
  volatilityDailyPercent: number | null;
  priceToBook: number | null;
  currentRatio: number | null;
  avgVolume10d: number | null;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function mapRow(row: { s: string; d: unknown[] }): TVScreenerRow {
  const [
    name,
    description,
    close,
    change,
    changeAbs,
    volume,
    marketCap,
    sector,
    exchange,
    peRatio,
    epsDilGrowthPercent,
    divYieldPercent,
    analystRating,
    perfYearPercent,
    revenueGrowthPercent,
    pegRatio,
    roePercent,
    beta,
    recentEarningsDate,
    upcomingEarningsDate,
    fiftyTwoWeekHigh,
    relativeVolume,
    perf3MPercent,
    perf6MPercent,
    perfWeekPercent,
    perf1MPercent,
    debtToEquity,
    sma50,
    sma150,
    sma200,
    fiftyTwoWeekLow,
    sma20,
    atr,
    volatilityDailyPercent,
    priceToBook,
    currentRatio,
    avgVolume10d,
  ] = row.d;
  return {
    ticker: row.s,
    symbol: String(name),
    name: (description as string) || String(name),
    exchange: exchange as string,
    sector: (sector as string) || "Other",
    price: isNumber(close) ? close : null,
    change: isNumber(changeAbs) ? changeAbs : null,
    changePercent: isNumber(change) ? change : null,
    volume: isNumber(volume) ? volume : null,
    marketCap: isNumber(marketCap) ? marketCap : null,
    peRatio: isNumber(peRatio) ? peRatio : null,
    epsDilGrowthPercent: isNumber(epsDilGrowthPercent) ? epsDilGrowthPercent : null,
    divYieldPercent: isNumber(divYieldPercent) ? divYieldPercent : null,
    analystRating: isNumber(analystRating) ? analystRating : null,
    perfYearPercent: isNumber(perfYearPercent) ? perfYearPercent : null,
    revenueGrowthPercent: isNumber(revenueGrowthPercent) ? revenueGrowthPercent : null,
    pegRatio: isNumber(pegRatio) ? pegRatio : null,
    roePercent: isNumber(roePercent) ? roePercent : null,
    beta: isNumber(beta) ? beta : null,
    recentEarningsDate: isNumber(recentEarningsDate) ? new Date(recentEarningsDate * 1000).toISOString() : null,
    upcomingEarningsDate: isNumber(upcomingEarningsDate)
      ? new Date(upcomingEarningsDate * 1000).toISOString()
      : null,
    fiftyTwoWeekHigh: isNumber(fiftyTwoWeekHigh) ? fiftyTwoWeekHigh : null,
    relativeVolume: isNumber(relativeVolume) ? relativeVolume : null,
    perf3MPercent: isNumber(perf3MPercent) ? perf3MPercent : null,
    perf6MPercent: isNumber(perf6MPercent) ? perf6MPercent : null,
    perfWeekPercent: isNumber(perfWeekPercent) ? perfWeekPercent : null,
    perf1MPercent: isNumber(perf1MPercent) ? perf1MPercent : null,
    debtToEquity: isNumber(debtToEquity) ? debtToEquity : null,
    sma50: isNumber(sma50) ? sma50 : null,
    sma150: isNumber(sma150) ? sma150 : null,
    sma200: isNumber(sma200) ? sma200 : null,
    fiftyTwoWeekLow: isNumber(fiftyTwoWeekLow) ? fiftyTwoWeekLow : null,
    sma20: isNumber(sma20) ? sma20 : null,
    atr: isNumber(atr) ? atr : null,
    volatilityDailyPercent: isNumber(volatilityDailyPercent) ? volatilityDailyPercent : null,
    priceToBook: isNumber(priceToBook) ? priceToBook : null,
    currentRatio: isNumber(currentRatio) ? currentRatio : null,
    avgVolume10d: isNumber(avgVolume10d) ? avgVolume10d : null,
  };
}

async function scan(market: string, body: Record<string, unknown>): Promise<TVScreenerRow[]> {
  // Every /{market}/scan path accepts the same body shape whether it's
  // scoped by `markets` (whole-market screener) or by `symbols.tickers`
  // (single-symbol lookup) — one POST helper for both callers below.
  const url = `https://scanner.tradingview.com/${encodeURIComponent(market)}/scan`;
  const res = await fetchWithTimeout(url, TIMEOUT_MS, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/plain, */*; q=0.01",
      origin: "https://www.tradingview.com",
      referer: "https://www.tradingview.com/",
      "user-agent": "Mozilla/5.0 (compatible; InvestViewDashboard/1.0)",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`TradingView scanner ${res.status}`);

  const json = await res.json();
  const rows: Array<{ s: string; d: unknown[] }> = json?.data;
  if (!Array.isArray(rows)) throw new Error("Unexpected TradingView scanner response shape");

  return rows.map(mapRow);
}

export async function fetchTVScreener(market: string, limit = 1000): Promise<TVScreenerRow[]> {
  return scan(market, {
    markets: [market],
    symbols: { query: { types: [] }, tickers: [] },
    options: { lang: "en" },
    columns: COLUMNS,
    // Excludes depositary receipts (e.g. Thai DRs of US stocks like NVDA80.SET) and
    // other non-common-stock listings that would otherwise crowd out real local
    // companies when sorted by market cap. For the US market specifically, also
    // excludes OTC-exchange rows: TradingView attributes a foreign company's full
    // *global* market cap to its thinly-traded US OTC pink-sheet line, so names
    // like "BACHF" or "SEMHF" (unfamiliar, barely-traded ADR-equivalents) were
    // dominating market-cap-sorted results ahead of real NASDAQ/NYSE names — and
    // their stale/frozen prices made every scan-preset metric read as 0.00%.
    filter: [
      { left: "market_cap_basic", operation: "greater", right: 0 },
      { left: "type", operation: "equal", right: "stock" },
      { left: "typespecs", operation: "has", right: "common" },
      ...(market === "america" ? [{ left: "exchange", operation: "nequal", right: "OTC" }] : []),
    ],
    sort: { sortBy: "market_cap_basic", sortOrder: "desc" },
    range: [0, limit],
  });
}

// Common US exchanges tried in order for a bare ticker (e.g. "NVDA", no
// exchange given) — this app's research flow is US-only (see
// researchAgent.ts), same limitation as the rest of the Research page.
const US_EXCHANGES = ["NASDAQ", "NYSE", "AMEX"];

/**
 * Looks up a single symbol directly via TradingView's `symbols.tickers`
 * filter — no market-wide scan needed. Tries each common US exchange
 * prefix in turn (the scanner returns `totalCount: 0` for a wrong prefix,
 * not an error) and returns the first hit, or `null` if none match.
 */
export async function fetchTVSymbolFundamentals(symbol: string): Promise<TVScreenerRow | null> {
  const bare = symbol.trim().toUpperCase();
  if (!bare) return null;

  for (const exchange of US_EXCHANGES) {
    const rows = await scan("america", {
      symbols: { tickers: [`${exchange}:${bare}`], query: { types: [] } },
      columns: COLUMNS,
    });
    if (rows.length > 0) return rows[0];
  }
  return null;
}
