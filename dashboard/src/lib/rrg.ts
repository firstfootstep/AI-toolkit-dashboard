import { getOhlc } from "@/lib/ohlc";
import type { DataSourceStatus } from "@/types/market";

/**
 * Simplified JdK RS-Ratio / RS-Momentum (Relative Rotation Graph) computation.
 * Uses this project's existing getOhlc() (Yahoo Finance chart endpoint, with its
 * own cache/mock fallback) for the benchmark and each sector SPDR ETF — no new
 * external data source, just derived math over data the app already fetches.
 */

const BENCHMARK_SYMBOL = "SPY";
const WINDOW = 14; // JdK's standard smoothing window
const TAIL_LENGTH = 5; // trailing points plotted per sector, to show rotation direction

export const SECTORS = [
  { symbol: "XLK", label: "Technology" },
  { symbol: "XLF", label: "Financials" },
  { symbol: "XLE", label: "Energy" },
  { symbol: "XLV", label: "Health Care" },
  { symbol: "XLY", label: "Consumer Discretionary" },
  { symbol: "XLP", label: "Consumer Staples" },
  { symbol: "XLI", label: "Industrials" },
  { symbol: "XLU", label: "Utilities" },
  { symbol: "XLB", label: "Materials" },
  { symbol: "XLRE", label: "Real Estate" },
  { symbol: "XLC", label: "Communication Services" },
] as const;

export type Quadrant = "Leading" | "Weakening" | "Lagging" | "Improving";

export interface RrgPoint {
  date: string;
  ratio: number;
  momentum: number;
}

export interface SectorRotation {
  symbol: string;
  label: string;
  points: RrgPoint[]; // last TAIL_LENGTH points, oldest first
  current: RrgPoint;
  quadrant: Quadrant;
}

export interface RrgResponse {
  source: DataSourceStatus;
  benchmark: string;
  sectors: SectorRotation[];
  fetchedAt: string;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Rolling z-score-based RS-Ratio, centered at 100, over a trailing WINDOW. */
function rsRatioSeries(rsRaw: number[]): number[] {
  const out: number[] = [];
  for (let i = WINDOW - 1; i < rsRaw.length; i++) {
    const windowSlice = rsRaw.slice(i - WINDOW + 1, i + 1);
    const sd = stdev(windowSlice);
    const z = sd === 0 ? 0 : (rsRaw[i] - mean(windowSlice)) / sd;
    out.push(100 + z);
  }
  return out;
}

/** Rolling z-score of the day-over-day change in RS-Ratio, centered at 100. */
function rsMomentumSeries(rsRatio: number[]): number[] {
  const deltas = rsRatio.slice(1).map((v, i) => v - rsRatio[i]);
  const out: number[] = [];
  for (let i = WINDOW - 1; i < deltas.length; i++) {
    const windowSlice = deltas.slice(i - WINDOW + 1, i + 1);
    const sd = stdev(windowSlice);
    const z = sd === 0 ? 0 : (deltas[i] - mean(windowSlice)) / sd;
    out.push(100 + z);
  }
  return out;
}

function classifyQuadrant(ratio: number, momentum: number): Quadrant {
  if (ratio >= 100 && momentum >= 100) return "Leading";
  if (ratio >= 100 && momentum < 100) return "Weakening";
  if (ratio < 100 && momentum < 100) return "Lagging";
  return "Improving";
}

export async function getSectorRotation(): Promise<RrgResponse> {
  const symbols = [BENCHMARK_SYMBOL, ...SECTORS.map((s) => s.symbol)];
  const responses = await Promise.all(symbols.map((s) => getOhlc(s)));
  const [benchmarkRes, ...sectorRes] = responses;

  const benchmarkByDate = new Map(benchmarkRes.bars.map((b) => [b.time, b.close]));

  const sectors: SectorRotation[] = SECTORS.map((sector, i) => {
    const bars = sectorRes[i].bars.filter((b) => benchmarkByDate.has(b.time));
    const rsRaw = bars.map((b) => b.close / (benchmarkByDate.get(b.time) as number));
    const dates = bars.map((b) => b.time);

    const ratioSeries = rsRatioSeries(rsRaw);
    const ratioDates = dates.slice(WINDOW - 1);
    const momentumSeries = rsMomentumSeries(ratioSeries);
    // momentum series is offset by one more WINDOW (it's built from ratioSeries' deltas)
    const momentumDates = ratioDates.slice(WINDOW);

    const points: RrgPoint[] = momentumDates.map((date, idx) => ({
      date,
      ratio: ratioSeries[ratioSeries.length - momentumSeries.length + idx],
      momentum: momentumSeries[idx],
    }));

    const tail = points.slice(-TAIL_LENGTH);
    const current = tail[tail.length - 1] ?? { date: "", ratio: 100, momentum: 100 };

    return {
      symbol: sector.symbol,
      label: sector.label,
      points: tail,
      current,
      quadrant: classifyQuadrant(current.ratio, current.momentum),
    };
  });

  const allSources = responses.map((r) => r.source);
  const source: DataSourceStatus = allSources.every((s) => s === "live") ? "live" : "mock";

  return { source, benchmark: BENCHMARK_SYMBOL, sectors, fetchedAt: new Date().toISOString() };
}
