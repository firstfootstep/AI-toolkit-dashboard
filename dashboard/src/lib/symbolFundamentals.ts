import { fetchTVSymbolFundamentals } from "@/lib/tvScreener";
import { getCached, setCached, withFallback } from "@/lib/dataSource";
import type { DataSourceStatus } from "@/types/market";

const CACHE_TTL_MS = 5 * 60_000;

// Real, server-controlled fundamentals for the Research page — the safe
// alternative to giving the web research agent a live code-execution tool
// (see researchAgent.ts's "only tool it gets is WebSearch" comment): the
// server decides exactly what to fetch and how, via this fixed TradingView
// scan call, and only ever hands Claude the resulting numbers as context.
// No mock fixture here (unlike quotes/news) — there's no fixed universe to
// bundle for an arbitrary user-typed ticker, so a miss is just `null`
// ("unavailable"), same as the EPS-context handling in researchAgent.ts.
export interface SymbolFundamentals {
  peRatio: number | null;
  epsDilGrowthPercent: number | null;
  divYieldPercent: number | null;
  analystRating: number | null; // -1 (strong sell) .. +1 (strong buy)
  perfYearPercent: number | null;
  revenueGrowthPercent: number | null;
  pegRatio: number | null;
  roePercent: number | null;
  beta: number | null;
  marketCap: number | null;
  fiftyTwoWeekHigh: number | null;
  relativeVolume: number | null;
  sector: string | null;
}

export interface SymbolFundamentalsResponse {
  source: DataSourceStatus;
  fundamentals: SymbolFundamentals | null;
  fetchedAt: string;
}

async function fetchFundamentals(symbol: string): Promise<SymbolFundamentals | null> {
  const row = await fetchTVSymbolFundamentals(symbol);
  if (!row) return null;
  return {
    peRatio: row.peRatio,
    epsDilGrowthPercent: row.epsDilGrowthPercent,
    divYieldPercent: row.divYieldPercent,
    analystRating: row.analystRating,
    perfYearPercent: row.perfYearPercent,
    revenueGrowthPercent: row.revenueGrowthPercent,
    pegRatio: row.pegRatio,
    roePercent: row.roePercent,
    beta: row.beta,
    marketCap: row.marketCap,
    fiftyTwoWeekHigh: row.fiftyTwoWeekHigh,
    relativeVolume: row.relativeVolume,
    sector: row.sector,
  };
}

export async function getSymbolFundamentals(symbol: string): Promise<SymbolFundamentalsResponse> {
  const clean = symbol.trim().toUpperCase();
  const cacheKey = `fundamentals:${clean}`;
  const cached = getCached<SymbolFundamentalsResponse>(cacheKey);
  if (cached) return cached;

  // withFallback's "mock" only means the TradingView call itself failed
  // (network/timeout/shape) — a clean "no match on any US exchange" result
  // still counts as a successful "tradingview" lookup that simply found
  // nothing; the UI hides the section entirely when fundamentals is null,
  // so this label only matters for the failed-call case.
  const { value: fundamentals, source } = await withFallback(
    () => fetchFundamentals(clean),
    () => null
  );
  const body: SymbolFundamentalsResponse = {
    source: source === "mock" ? "mock" : "tradingview",
    fundamentals,
    fetchedAt: new Date().toISOString(),
  };
  setCached(cacheKey, body, CACHE_TTL_MS);
  return body;
}
