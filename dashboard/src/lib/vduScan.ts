import { fetchTVScreener, type TVScreenerRow } from "@/lib/tvScreener";
import { fetchYahooOhlc } from "@/lib/ohlc";
import { getCached, setCached } from "@/lib/dataSource";
import { toYahooSymbol } from "@/lib/exchanges";
import { SCANNER_MARKETS } from "@/features/scanner/types";
import type { OhlcBar } from "@/types/market";

// VCP/VDU breakout scan — a TypeScript port of the rule set in
// vcp-vdu-breakout.md (VDU pickup + 52-week-high breakout + RS rank + "still
// in base" filter + buy-stop trade plan). Pure, deterministic arithmetic over
// daily OHLCV bars; no LLM anywhere in this path.
//
// Differences from the original Python spec, all forced by this app's data
// layer rather than chosen:
//   * Universe = the Scanner's TradingView universe for the selected market
//     (top 1000 by market cap), not a hand-built tickers.txt.
//   * RS 1-99 uses TradingView's Perf.W/1M/3M/6M columns in place of the
//     5/21/63/126-day returns (same 0.10/0.20/0.30/0.40 weights, same
//     percentile-rank-across-universe step). Close, not identical.
//   * Bars come from Yahoo's chart endpoint (1y, adjusted), same source the
//     Chart page already uses.
// Constants are the author's tuned values — change constants, never add
// per-symbol exceptions.

const VDU_LOOKBACK = 50;
const VDU_DRY_RATIO = 0.5;
const BASE_WINDOW = 25;
const ATR_WINDOW = 20;
const BASE_LIFT_ATR_MIN = -3.0;
const BASE_LIFT_ATR_MAX = 1.5;
const BASE_DEPTH_ATR_MAX = 8.0;
const BASE_TIGHT_MAX = 1.2;
const RS_WEIGHTS: [keyof TVScreenerRow, number][] = [
  ["perfWeekPercent", 0.1],
  ["perf1MPercent", 0.2],
  ["perf3MPercent", 0.3],
  ["perf6MPercent", 0.4],
];
const T3_MIN_RS = 80;
const LONG_RS_MIN = 70;
const RISK_PER_TRADE = 0.005;
const MAX_POSITION_PCT = 0.2;
const STOP_ATR_MULT = 1.0;
const STOP_MAX_PCT = 0.08;
const TARGET_R = 2.5;
const TRIGGER_PCT = 0.001;

const MIN_BARS = 70;
const MIN_UNIVERSE_FOR_RS = 50;
// Yahoo calls are the expensive part — only symbols that could plausibly pass
// (RS floor, and for the US the author's 30B market-cap floor) get bars fetched.
const PREFILTER_MIN_RS = 70;
const US_MIN_RS = 80;
const US_MIN_MCAP = 30e9;
const MAX_CANDIDATES = 300;
const FETCH_CONCURRENCY = 8;
const BARS_CACHE_TTL_MS = 5 * 60_000;

// Minimum 20-day average traded value, in millions of local currency.
const MIN_VALUE_M: Record<string, number> = {
  america: 2,
  thailand: 5,
  hongkong: 5,
  japan: 100,
  uk: 2,
  germany: 2,
  australia: 2,
};

export interface VduPlan {
  entryStopBuy: number;
  stop: number;
  target: number;
  qty: number;
  risk: number;
}

export interface VduPick {
  symbol: string;
  exchange: string;
  name: string;
  sector: string;
  currency: string;
  tier: 1 | 2 | 3;
  rs: number;
  close: number;
  changePercent: number | null;
  breakout52w: boolean;
  pivot: number;
  liftAtr: number;
  depthAtr: number;
  tight: number | null;
  volToVdu: number | null;
  valueM: number;
  plan: VduPlan | null;
}

export interface VduScanResult {
  market: string;
  asOf: string;
  universeSize: number;
  candidatesChecked: number;
  barsFailed: number;
  picks: VduPick[];
  rejected: { symbol: string; reason: string }[];
}

// ------------------------------------------------------------------ indicators

function rsRanks(rows: TVScreenerRow[]): Map<string, number> {
  const scores: [string, number][] = [];
  for (const r of rows) {
    let sc = 0;
    let tw = 0;
    for (const [key, w] of RS_WEIGHTS) {
      const v = r[key];
      if (typeof v === "number") {
        sc += (w * v) / 100;
        tw += w;
      }
    }
    if (tw > 0) scores.push([r.ticker, sc / tw]);
  }
  if (scores.length < MIN_UNIVERSE_FOR_RS) {
    throw new Error(`Universe too small for a meaningful RS ranking (${scores.length} symbols with history, need ${MIN_UNIVERSE_FOR_RS}).`);
  }
  const values = scores.map(([, s]) => s);
  const out = new Map<string, number>();
  for (const [ticker, s] of scores) {
    let less = 0;
    let equal = 0;
    for (const v of values) {
      if (v < s) less++;
      else if (v === s) equal++;
    }
    const pct = (less + (equal + 1) / 2) / values.length; // average rank, like pandas rank(pct=True)
    out.set(ticker, Math.round(pct * 98 + 1));
  }
  return out;
}

function annotateVdu(bars: OhlcBar[]): { pickup: boolean[]; lastVduVol: number } {
  const n = bars.length;
  const o = bars.map((b) => b.open);
  const c = bars.map((b) => b.close);
  const v = bars.map((b) => b.volume);

  const sma50: number[] = [];
  let runSum = 0;
  for (let i = 0; i < n; i++) {
    runSum += c[i];
    if (i >= 50) runSum -= c[i - 50];
    sma50.push(runSum / Math.min(i + 1, 50));
  }

  const validHrvb = c.map((close, i) => close > o[i] && i > 0 && close > c[i - 1]);
  const isVdu = new Array<boolean>(n).fill(false);
  const pickup = new Array<boolean>(n).fill(false);
  let lastVduVol = Infinity;
  let lastVduClose = Infinity;
  let lastVduI = -1;

  for (let i = 0; i < n; i++) {
    const s = Math.max(0, i - VDU_LOOKBACK);
    if (i <= s) continue;

    let h = -1;
    for (let j = s; j < i; j++) {
      if (validHrvb[j] && (h === -1 || v[j] > v[h])) h = j;
    }
    if (h === -1) continue;

    let minVol = Infinity;
    for (let j = h; j <= i; j++) minVol = Math.min(minVol, v[j]);

    if (minVol < VDU_DRY_RATIO * v[h] && v[i] === minVol && i !== h) {
      isVdu[i] = true;
      lastVduVol = v[i];
      lastVduClose = c[i];
      lastVduI = i;
    }
    if (lastVduI !== -1 && i > lastVduI && !isVdu[i]) {
      if (v[i] > lastVduVol && c[i] > o[i] && c[i] > sma50[i] && c[i] > lastVduClose && v[i] > v[i - 1]) {
        pickup[i] = true;
      }
    }
  }
  return { pickup, lastVduVol };
}

function is52wBreakout(bars: OhlcBar[]): boolean {
  const n = bars.length;
  const lookback = Math.min(n, 250);
  let prior = -Infinity;
  for (let i = n - lookback; i < n - 1; i++) prior = Math.max(prior, bars[i].high);
  return bars[n - 1].close >= prior;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function trueRanges(bars: OhlcBar[]): number[] {
  return bars.map((b, i) => {
    if (i === 0) return b.high - b.low;
    const pc = bars[i - 1].close;
    return Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc));
  });
}

interface BaseMetrics {
  pivot: number;
  liftAtr: number;
  depthAtr: number;
  tight: number | null;
}

function baseMetrics(bars: OhlcBar[], pickupIdx: number): BaseMetrics | null {
  const pre = bars.slice(0, pickupIdx);
  if (pre.length < Math.max(BASE_WINDOW, ATR_WINDOW + 1)) return null;
  const close = bars[bars.length - 1].close;
  const base = pre.slice(-BASE_WINDOW);
  const pivot = Math.max(...base.map((b) => b.high));
  const low = Math.min(...base.map((b) => b.low));
  const atr = mean(trueRanges(pre).slice(-ATR_WINDOW));
  if (pivot <= 0 || atr <= 0) return null;

  const rng = base.map((b) => (b.high - b.low) / b.close);
  const rngMean = mean(rng);
  return {
    pivot,
    liftAtr: (close - pivot) / atr,
    depthAtr: (pivot - low) / atr,
    tight: rngMean > 0 ? mean(rng.slice(-10)) / rngMean : null,
  };
}

function baseRejectReason(m: BaseMetrics | null): string | null {
  if (!m) return "no base data";
  if (m.liftAtr > BASE_LIFT_ATR_MAX) return `extended ${m.liftAtr >= 0 ? "+" : ""}${m.liftAtr.toFixed(1)} ATR above pivot`;
  if (m.liftAtr < BASE_LIFT_ATR_MIN) return `too far below pivot ${m.liftAtr.toFixed(1)} ATR`;
  if (m.depthAtr > BASE_DEPTH_ATR_MAX) return `base too deep ${m.depthAtr.toFixed(1)} ATR`;
  if (m.tight != null && m.tight > BASE_TIGHT_MAX) return `ranges expanding ${m.tight.toFixed(2)}x`;
  return null;
}

function atr14(bars: OhlcBar[]): number {
  return mean(trueRanges(bars.slice(-30)).slice(-14));
}

// ------------------------------------------------------------------ trade plan

function tickSize(price: number, market: string): number {
  if (market !== "thailand") return 0.01;
  const steps: [number, number][] = [[2, 0.01], [5, 0.02], [10, 0.05], [25, 0.1], [100, 0.25], [200, 0.5], [400, 1]];
  for (const [lim, t] of steps) if (price < lim) return t;
  return 2;
}

function roundTick(price: number, tick: number, dir: "up" | "down"): number {
  const n = price / tick;
  const rounded = dir === "up" ? Math.ceil(n - 1e-9) : Math.floor(n + 1e-9);
  return Math.round(rounded * tick * 1e4) / 1e4;
}

function tradePlan(bars: OhlcBar[], equity: number, market: string, lot: number): VduPlan | null {
  const last = bars[bars.length - 1];
  const tick = tickSize(last.high, market);
  const trigger = roundTick(last.high * (1 + TRIGGER_PCT), tick, "up");
  const raw = trigger - last.low;
  const dist = Math.min(Math.max(raw, atr14(bars) * STOP_ATR_MULT), trigger * STOP_MAX_PCT);
  if (dist <= 0) return null;

  const stop = roundTick(trigger - dist, tick, "down");
  const target = roundTick(trigger + TARGET_R * dist, tick, "up");
  let qty = Math.floor((equity * RISK_PER_TRADE) / dist / lot) * lot;
  qty = Math.min(qty, Math.floor((equity * MAX_POSITION_PCT) / trigger / lot) * lot);
  if (qty < lot) return null;
  return { entryStopBuy: trigger, stop, target, qty, risk: Math.round(dist * qty * 100) / 100 };
}

// ------------------------------------------------------------------ data

async function getBars(row: TVScreenerRow): Promise<OhlcBar[] | null> {
  const key = `vdu-bars:${row.ticker}`;
  const cached = getCached<OhlcBar[] | null>(key);
  if (cached !== undefined) return cached;
  try {
    const raw = await fetchYahooOhlc(toYahooSymbol(row.symbol, row.exchange), "1y", true);
    const bars = raw.filter((b) => b.volume > 0);
    const usable = bars.length >= MIN_BARS ? bars : null;
    setCached(key, usable, BARS_CACHE_TTL_MS);
    return usable;
  } catch {
    return null; // not cached — a transient Yahoo failure shouldn't stick for 5 minutes
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

// ------------------------------------------------------------------ scan

export async function getVduScan(market: string, equity: number): Promise<VduScanResult> {
  const marketDef = SCANNER_MARKETS.find((m) => m.id === market);
  if (!marketDef) throw new Error(`Unknown market "${market}".`);
  const isUs = market === "america";
  const lot = market === "thailand" ? 100 : 1;
  const minValueM = MIN_VALUE_M[market] ?? 2;

  const rows = await fetchTVScreener(market);
  const rs = rsRanks(rows);

  const candidates = rows
    .filter((r) => {
      const score = rs.get(r.ticker);
      if (score == null) return false;
      if (score < (isUs ? US_MIN_RS : PREFILTER_MIN_RS)) return false;
      if (isUs && (r.marketCap ?? 0) < US_MIN_MCAP) return false;
      return true;
    })
    .sort((a, b) => (rs.get(b.ticker) ?? 0) - (rs.get(a.ticker) ?? 0))
    .slice(0, MAX_CANDIDATES);

  const barsList = await mapPool(candidates, FETCH_CONCURRENCY, getBars);

  const picks: VduPick[] = [];
  const rejected: { symbol: string; reason: string }[] = [];
  let barsFailed = 0;

  candidates.forEach((r, idx) => {
    const bars = barsList[idx];
    if (!bars) {
      barsFailed++;
      return;
    }
    const n = bars.length;
    const valueM = mean(bars.slice(-20).map((b) => b.close * b.volume)) / 1e6;
    if (valueM < minValueM) return;

    const { pickup, lastVduVol } = annotateVdu(bars);
    const breakout = is52wBreakout(bars);
    const score = rs.get(r.ticker) as number;

    let tier: 1 | 2 | 3 | null = null;
    let pidx = n - 1;
    if (pickup[n - 1]) tier = 1;
    else if (pickup[n - 2]) {
      tier = 2;
      pidx = n - 2;
    } else if (breakout && score >= T3_MIN_RS) tier = 3;
    if (tier === null) return;

    const m = baseMetrics(bars, pidx);
    const why = baseRejectReason(m);
    if (why || !m) {
      rejected.push({ symbol: r.symbol, reason: why ?? "no base data" });
      return;
    }

    const last = bars[n - 1];
    const sma50 = mean(bars.slice(-50).map((b) => b.close));
    const plan =
      tier < 3 && score >= LONG_RS_MIN && last.close > sma50 ? tradePlan(bars, equity, market, lot) : null;

    picks.push({
      symbol: r.symbol,
      exchange: r.exchange,
      name: r.name,
      sector: r.sector,
      currency: marketDef.currency,
      tier,
      rs: score,
      close: last.close,
      changePercent: r.changePercent,
      breakout52w: breakout,
      pivot: m.pivot,
      liftAtr: m.liftAtr,
      depthAtr: m.depthAtr,
      tight: m.tight,
      volToVdu: tier < 3 && Number.isFinite(lastVduVol) && lastVduVol > 0 ? last.volume / lastVduVol : null,
      valueM,
      plan,
    });
  });

  // tier asc, 52w breakouts first, RS desc
  picks.sort((a, b) => a.tier - b.tier || Number(b.breakout52w) - Number(a.breakout52w) || b.rs - a.rs);

  return {
    market,
    asOf: new Date().toISOString(),
    universeSize: rows.length,
    candidatesChecked: candidates.length,
    barsFailed,
    picks,
    rejected,
  };
}
