import quotesFixture from "@/fixtures/quotes.json";
import { fetchWithTimeout, getCached, setCached, withFallback } from "@/lib/dataSource";
import { toYahooSymbol } from "@/lib/exchanges";
import type { OhlcBar, OhlcResponse, DataSourceStatus } from "@/types/market";

const CACHE_TTL_MS = 5 * 60_000;

// Yahoo Finance's chart endpoint (same one src/lib/quotes.ts uses) already
// returns full open/high/low/close arrays, not just close — this is the
// keyless fallback tier for candlesticks when scanner-service's TradingView
// tier is unreachable or no exchange was given.
async function fetchYahooOhlc(symbol: string): Promise<OhlcBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=6mo&interval=1d`;

  const res = await fetchWithTimeout(url, 4000, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; InvestViewDashboard/1.0)" },
  });
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("Unexpected response shape");

  const timestamps: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const open: (number | null)[] = q.open ?? [];
  const high: (number | null)[] = q.high ?? [];
  const low: (number | null)[] = q.low ?? [];
  const close: (number | null)[] = q.close ?? [];
  const volume: (number | null)[] = q.volume ?? [];

  const bars = timestamps
    .map((t, i) => ({
      time: new Date(t * 1000).toISOString().slice(0, 10),
      open: open[i],
      high: high[i],
      low: low[i],
      close: close[i],
      volume: volume[i] ?? 0,
    }))
    .filter(
      (b): b is OhlcBar =>
        typeof b.open === "number" && typeof b.high === "number" && typeof b.low === "number" && typeof b.close === "number"
    );

  if (bars.length === 0) throw new Error("No OHLC bars in response");
  return bars;
}

type FixtureQuote = { price: number; history: number[] };
const fixtures = quotesFixture as Record<string, FixtureQuote>;

// Last-resort tier: synthesizes plausible OHLC from the close-only mock
// history (open = previous close, high/low = close +/- a small spread).
function fixtureOhlc(symbol: string): OhlcBar[] {
  const f = fixtures[symbol];
  const history = f?.history?.length ? f.history : [f?.price ?? 100];
  const today = Date.now();

  return history.map((close, i) => {
    const prevClose = i === 0 ? close : history[i - 1];
    const open = prevClose;
    const spread = Math.max(Math.abs(close - open), close * 0.004);
    return {
      time: new Date(today - (history.length - 1 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      open,
      high: Math.max(open, close) + spread,
      low: Math.min(open, close) - spread,
      close,
      volume: 0,
    };
  });
}

export async function getOhlc(symbol: string, exchange?: string): Promise<OhlcResponse> {
  const cacheKey = `ohlc:${exchange ?? ""}:${symbol}`;
  const cached = getCached<OhlcResponse>(cacheKey);
  if (cached) return cached;

  const yahooSymbol = toYahooSymbol(symbol, exchange);
  const { value: bars, source }: { value: OhlcBar[]; source: DataSourceStatus } = await withFallback(
    () => fetchYahooOhlc(yahooSymbol),
    () => fixtureOhlc(symbol)
  );

  const body: OhlcResponse = { source, bars, fetchedAt: new Date().toISOString() };
  setCached(cacheKey, body, CACHE_TTL_MS);
  return body;
}
