import universeFixture from "@/fixtures/universe.json";
import { getQuotes } from "@/lib/quotes";
import { fetchTVScreener } from "@/lib/tvScreener";
import { SCANNER_MARKETS } from "@/features/scanner/types";
import type { ScannerRow, ScannerUniverseResult } from "@/features/scanner/types";
import type { DataSourceStatus } from "@/types/market";

const DEFAULT_MARKET = "america";

function currencyForMarket(market: string): string {
  return SCANNER_MARKETS.find((m) => m.id === market)?.currency ?? "USD";
}

// Blended price-performance score (recent quarter weighted heaviest, like
// IBD's RS Rating) used only to rank rows against each other below — never
// shown as a value on its own, just turned into a 0-100 percentile.
function blendedPerf(r: Awaited<ReturnType<typeof fetchTVScreener>>[number]): number | undefined {
  const { perf3MPercent, perf6MPercent, perfYearPercent } = r;
  if (perf3MPercent == null && perf6MPercent == null && perfYearPercent == null) return undefined;
  const parts: [number, number][] = [];
  if (perf3MPercent != null) parts.push([perf3MPercent, 0.4]);
  if (perf6MPercent != null) parts.push([perf6MPercent, 0.3]);
  if (perfYearPercent != null) parts.push([perfYearPercent, 0.3]);
  const weightSum = parts.reduce((sum, [, w]) => sum + w, 0);
  return parts.reduce((sum, [v, w]) => sum + v * w, 0) / weightSum;
}

// Percentile-ranks `blendedPerf` across the whole fetched batch so each row
// gets a 0-100 RS score relative to its peers, the same way a real RS rating
// is a cross-sectional rank rather than an absolute number.
function withRsScores(rows: ScannerRow[], perfByTicker: Map<string, number>): ScannerRow[] {
  const ranked = [...perfByTicker.entries()].sort((a, b) => a[1] - b[1]);
  const rsByTicker = new Map<string, number>();
  ranked.forEach(([ticker], i) => {
    rsByTicker.set(ticker, ranked.length > 1 ? Math.round((i / (ranked.length - 1)) * 100) : 50);
  });
  return rows.map((r) => ({ ...r, rsScore: rsByTicker.get(r.ticker) }));
}

function fromTVRows(rows: Awaited<ReturnType<typeof fetchTVScreener>>, market: string): ScannerRow[] {
  const currency = currencyForMarket(market);
  const usable = rows.filter((r) => r.price != null && r.change != null && r.changePercent != null);

  const scannerRows = usable.map((r) => ({
    ticker: r.ticker,
    symbol: r.symbol,
    name: r.name,
    exchange: r.exchange,
    sector: r.sector,
    price: r.price as number,
    change: r.change as number,
    changePercent: r.changePercent as number,
    currency,
    volume: r.volume ?? undefined,
    marketCap: r.marketCap ?? undefined,
    peRatio: r.peRatio ?? undefined,
    epsDilGrowthPercent: r.epsDilGrowthPercent ?? undefined,
    divYieldPercent: r.divYieldPercent ?? undefined,
    analystRating: r.analystRating ?? undefined,
    perfYearPercent: r.perfYearPercent ?? undefined,
    revenueGrowthPercent: r.revenueGrowthPercent ?? undefined,
    pegRatio: r.pegRatio ?? undefined,
    roePercent: r.roePercent ?? undefined,
    beta: r.beta ?? undefined,
    recentEarningsDate: r.recentEarningsDate ?? undefined,
    upcomingEarningsDate: r.upcomingEarningsDate ?? undefined,
    fiftyTwoWeekHigh: r.fiftyTwoWeekHigh ?? undefined,
    relativeVolume: r.relativeVolume ?? undefined,
    perf3MPercent: r.perf3MPercent ?? undefined,
    perf6MPercent: r.perf6MPercent ?? undefined,
    perfWeekPercent: r.perfWeekPercent ?? undefined,
    perf1MPercent: r.perf1MPercent ?? undefined,
  }));

  const perfByTicker = new Map<string, number>();
  usable.forEach((r) => {
    const perf = blendedPerf(r);
    if (perf !== undefined) perfByTicker.set(r.ticker, perf);
  });

  return withRsScores(scannerRows, perfByTicker);
}

// Yahoo-based fallback only exists for the default "america" market (that's
// what src/fixtures/universe.json curates). Other markets have no keyless
// fallback tier — see the Scanner page for how a fully-empty result is
// surfaced instead of mislabeling it as live or mock data.
async function fallbackAmericaUniverse(): Promise<{ rows: ScannerRow[]; source: DataSourceStatus }> {
  const symbols = universeFixture.symbols.map((s) => s.symbol);
  const { quotes, source } = await getQuotes(symbols);
  const sectorBySymbol = new Map(universeFixture.symbols.map((s) => [s.symbol, s.sector]));

  const rows: ScannerRow[] = quotes.map((q) => ({
    ticker: q.symbol,
    symbol: q.symbol,
    name: q.name,
    sector: sectorBySymbol.get(q.symbol) ?? "Other",
    price: q.price,
    change: q.change,
    changePercent: q.changePercent,
    currency: q.currency,
    volume: q.volume,
    history: q.history,
  }));

  return { rows, source };
}

export async function getScannerUniverse(market: string = DEFAULT_MARKET): Promise<ScannerUniverseResult> {
  try {
    const tvRows = await fetchTVScreener(market);
    return { rows: fromTVRows(tvRows, market), source: "tradingview", market, fetchedAt: new Date().toISOString() };
  } catch {
    if (market === DEFAULT_MARKET) {
      const { rows, source } = await fallbackAmericaUniverse();
      return { rows, source, market, fetchedAt: new Date().toISOString() };
    }
    // No keyless fallback for this market — caller renders an explicit
    // "service unavailable" state rather than an empty table with a
    // misleading source badge.
    return { rows: [], source: "tradingview", market, fetchedAt: new Date().toISOString() };
  }
}
