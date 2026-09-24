import quotesFixture from "@/fixtures/quotes.json";
import { fetchWithTimeout, getCached, setCached, withFallback } from "@/lib/dataSource";
import type { Quote, QuoteDetail, QuoteDetailResponse, QuotesResponse } from "@/types/market";

const CACHE_TTL_MS = 60_000;
const DETAIL_CACHE_TTL_MS = 5 * 60_000;

type FixtureQuote = {
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  history: number[];
  volume?: number;
  dayHigh?: number;
  dayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
};

const fixtures = quotesFixture as Record<string, FixtureQuote>;

// Yahoo Finance's public chart endpoint requires no API key and is the
// documented "keyless" default for this course demo. It can rate-limit or
// go down without notice — that's exactly why every call here is wrapped
// in withFallback() rather than assumed to succeed.
async function fetchLiveQuote(symbol: string): Promise<Quote> {
  // range=1mo returns only a single point for some thinly-covered
  // international tickers (e.g. ^SET.BK, PSEI.PS) — verified directly
  // against Yahoo's own response; 3mo reliably returns 30+ daily closes for
  // the same symbols, so it's the default range for every symbol here, not
  // just the sparse ones.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=3mo&interval=1d`;

  const res = await fetchWithTimeout(url, 4000, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; InvestViewDashboard/1.0)" },
  });
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("Unexpected response shape");

  const meta = result.meta;
  const validCloses = (result.indicators?.quote?.[0]?.close ?? []).filter(
    (c: number | null): c is number => typeof c === "number"
  );
  const history = validCloses.slice(-20);

  const price = meta.regularMarketPrice as number;
  // meta.previousClose is missing for several international index tickers
  // (verified directly against Yahoo — ^KS11, ^HSI, etc.) — its fallback,
  // chartPreviousClose, is anchored to the *start of the requested range*,
  // not yesterday's close, so it grows more wrong the wider `range` is
  // (confirmed: switching range from 1mo to 3mo alone swung ^KS11's
  // "daily" change from a few % to over -20%). Prefer yesterday's actual
  // close from the series we already fetched — accurate and range-
  // independent — before ever falling back to chartPreviousClose.
  const prevDailyClose = validCloses[validCloses.length - 2];
  const prevClose = meta.previousClose ?? prevDailyClose ?? meta.chartPreviousClose;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  if (typeof price !== "number") throw new Error("Missing price");

  const asNumber = (v: unknown) => (typeof v === "number" ? v : undefined);

  return {
    symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    price,
    change,
    changePercent,
    currency: meta.currency ?? "USD",
    history: history.length ? history : [price],
    volume: asNumber(meta.regularMarketVolume),
    dayHigh: asNumber(meta.regularMarketDayHigh),
    dayLow: asNumber(meta.regularMarketDayLow),
    fiftyTwoWeekHigh: asNumber(meta.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: asNumber(meta.fiftyTwoWeekLow),
  };
}

function fixtureQuote(symbol: string): Quote {
  const f = fixtures[symbol];
  if (!f) {
    return { symbol, name: symbol, price: 0, change: 0, changePercent: 0, currency: "USD", history: [0] };
  }
  return { symbol, ...f };
}

export async function getQuotes(symbols: string[]): Promise<QuotesResponse> {
  const cleaned = symbols.map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (cleaned.length === 0) {
    return { source: "mock", quotes: [], fetchedAt: new Date().toISOString() };
  }

  const cacheKey = `quotes:${cleaned.join(",")}`;
  const cached = getCached<QuotesResponse>(cacheKey);
  if (cached) return cached;

  let anyLive = false;
  const quotes = await Promise.all(
    cleaned.map(async (symbol) => {
      const { value, source } = await withFallback(
        () => fetchLiveQuote(symbol),
        () => fixtureQuote(symbol)
      );
      if (source === "live") anyLive = true;
      return value;
    })
  );

  const body: QuotesResponse = { source: anyLive ? "live" : "mock", quotes, fetchedAt: new Date().toISOString() };
  setCached(cacheKey, body, CACHE_TTL_MS);
  return body;
}

// Same keyless Yahoo Finance endpoint as fetchLiveQuote, but with a longer
// range and the full (date, close) series for the Chart page — the /api
// quotes route only needs a short sparkline, this needs a real chart.
async function fetchLiveQuoteDetail(symbol: string): Promise<QuoteDetail> {
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

  const meta = result.meta;
  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

  const historySeries = timestamps
    .map((t, i) => ({ date: new Date(t * 1000).toISOString().slice(0, 10), close: closes[i] }))
    .filter((p): p is { date: string; close: number } => typeof p.close === "number");

  if (historySeries.length === 0) throw new Error("No history in response");

  const price = meta.regularMarketPrice as number;
  const prevClose = meta.previousClose ?? meta.chartPreviousClose;
  const change = price - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  if (typeof price !== "number") throw new Error("Missing price");

  return {
    symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    price,
    change,
    changePercent,
    currency: meta.currency ?? "USD",
    history: historySeries.slice(-10).map((p) => p.close),
    historySeries,
  };
}

function fixtureQuoteDetail(symbol: string): QuoteDetail {
  const base = fixtureQuote(symbol);
  const today = Date.now();
  const historySeries = base.history.map((close, i) => ({
    date: new Date(today - (base.history.length - 1 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    close,
  }));
  return { ...base, historySeries };
}

export async function getQuoteDetail(symbol: string): Promise<QuoteDetailResponse> {
  const clean = symbol.trim().toUpperCase();
  const cacheKey = `quoteDetail:${clean}`;
  const cached = getCached<QuoteDetailResponse>(cacheKey);
  if (cached) return cached;

  const { value: quote, source } = await withFallback(
    () => fetchLiveQuoteDetail(clean),
    () => fixtureQuoteDetail(clean)
  );

  const body: QuoteDetailResponse = { source, quote, fetchedAt: new Date().toISOString() };
  setCached(cacheKey, body, DETAIL_CACHE_TTL_MS);
  return body;
}
