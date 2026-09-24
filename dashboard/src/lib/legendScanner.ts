import { fetchTVScreener } from "@/lib/tvScreener";
import { getOhlc } from "@/lib/ohlc";

// Real, server-controlled legend screens for the Legend Scanner page's
// "สแกนหุ้น" button — same trust model as symbolFundamentals.ts for
// Research: the server decides exactly what to fetch and how (one
// TradingView scan call +, for CANSLIM/Minervini, one Yahoo OHLC call for
// SPY, both already used elsewhere in this app) and scores every row with
// fixed arithmetic. Deliberately no Claude call in this path at all — the
// button just needs the table, and a fixed scoring formula doesn't need an
// LLM to read it back. The narrative, judgment-driven version (curated
// picks + written reasoning) is still .claude/agents/legend-scanner-agent.md,
// run manually in Claude Code — see that file for the full criteria mapping
// per legend and why each substitution (e.g. analyst rating standing in for
// real institutional-ownership data) is an approximation, not the letter of
// each investor's real methodology.

export type LegendKey = "CANSLIM" | "LYNCH" | "BUFFETT" | "MINERVINI" | "QULLAMAGGIE" | "GRAHAM";

export const LEGEND_META: Record<LegendKey, { label: string; style: "fundamental" | "technical"; initials: string }> = {
  CANSLIM: { label: "William O'Neil · CANSLIM", style: "technical", initials: "WO" },
  LYNCH: { label: "Peter Lynch · GARP", style: "fundamental", initials: "PL" },
  BUFFETT: { label: "Warren Buffett · Quality-Value", style: "fundamental", initials: "WB" },
  MINERVINI: { label: "Mark Minervini · Trend Template", style: "technical", initials: "MM" },
  QULLAMAGGIE: { label: "Qullamaggie · Momentum Breakout", style: "technical", initials: "QM" },
  GRAHAM: { label: "Benjamin Graham · Deep Value", style: "fundamental", initials: "BG" },
};

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

// Percentile rank of `value` within `values` (nulls ignored) — this scan
// has no true "RS rating" data source, so "leader"/"strength" is defined
// relative to this same universe rather than an absolute benchmark.
function percentileRank(values: Array<number | null>, value: number | null): number | null {
  if (value == null) return null;
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  const below = nums.filter((v) => v <= value).length;
  return (below / nums.length) * 100;
}

async function getSpyMarketGate(): Promise<{ spyClose: number | null; spySma50: number | null; isOpen: boolean | null }> {
  const spy = await getOhlc("SPY").catch(() => null);
  let spyClose: number | null = null;
  let spySma50: number | null = null;
  if (spy && spy.bars.length > 0) {
    spyClose = spy.bars[spy.bars.length - 1].close;
    spySma50 = sma(
      spy.bars.map((b) => b.close),
      50
    );
  }
  return { spyClose, spySma50, isOpen: spyClose != null && spySma50 != null ? spyClose > spySma50 : null };
}

interface MarketGate {
  spyClose: number | null;
  spySma50: number | null;
  isOpen: boolean | null;
}

// ---------------------------------------------------------------------------
// William O'Neil — CANSLIM
// ---------------------------------------------------------------------------

export interface CanslimCandidate {
  symbol: string;
  exchange: string;
  name: string;
  sector: string;
  price: number | null;
  changePercent: number | null;
  epsGrowthPercent: number | null; // proxy for both C and A
  revenueGrowthPercent: number | null;
  fiftyTwoWeekHigh: number | null;
  percentOffHigh: number | null; // proxy for N
  relativeVolume: number | null; // proxy for S
  perfYearPercentile: number | null; // RS proxy for L, 0-100 within this scan
  analystRating: number | null; // proxy for I, -1..+1
  score: number; // count of C/A/N/S/L/I that pass (0-6)
  passes: {
    c: boolean | null;
    a: boolean | null;
    n: boolean | null;
    s: boolean | null;
    l: boolean | null;
    i: boolean | null;
  };
}

export interface CanslimScreen {
  legend: "CANSLIM";
  asOf: string;
  marketGate: MarketGate;
  universeSize: number;
  candidates: CanslimCandidate[];
}

async function getCanslimScreen(limit = 1000, topN = 50): Promise<CanslimScreen> {
  const [rows, marketGate] = await Promise.all([fetchTVScreener("america", limit), getSpyMarketGate()]);

  const perfValues = rows.map((r) => r.perfYearPercent);

  const candidates: CanslimCandidate[] = rows.map((r) => {
    const percentOffHigh =
      r.price != null && r.fiftyTwoWeekHigh != null && r.fiftyTwoWeekHigh > 0
        ? ((r.fiftyTwoWeekHigh - r.price) / r.fiftyTwoWeekHigh) * 100
        : null;
    const perfYearPercentile = percentileRank(perfValues, r.perfYearPercent);

    const passC = r.epsDilGrowthPercent != null ? r.epsDilGrowthPercent >= 25 : null;
    const passA = r.epsDilGrowthPercent != null ? r.epsDilGrowthPercent >= 25 : null;
    const passN = percentOffHigh != null ? percentOffHigh <= 15 : null;
    const passS = r.relativeVolume != null ? r.relativeVolume >= 1.2 : null;
    const passL = perfYearPercentile != null ? perfYearPercentile >= 80 : null;
    const passI = r.analystRating != null ? r.analystRating >= 0.3 : null;

    const score = [passC, passA, passN, passS, passL, passI].filter((p) => p === true).length;

    return {
      symbol: r.symbol,
      exchange: r.exchange,
      name: r.name,
      sector: r.sector,
      price: r.price,
      changePercent: r.changePercent,
      epsGrowthPercent: r.epsDilGrowthPercent,
      revenueGrowthPercent: r.revenueGrowthPercent,
      fiftyTwoWeekHigh: r.fiftyTwoWeekHigh,
      percentOffHigh,
      relativeVolume: r.relativeVolume,
      perfYearPercentile,
      analystRating: r.analystRating,
      score,
      passes: { c: passC, a: passA, n: passN, s: passS, l: passL, i: passI },
    };
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.perfYearPercentile ?? -1) - (a.perfYearPercentile ?? -1);
  });

  return { legend: "CANSLIM", asOf: new Date().toISOString(), marketGate, universeSize: rows.length, candidates: candidates.slice(0, topN) };
}

// ---------------------------------------------------------------------------
// Peter Lynch — GARP (Growth At a Reasonable Price)
// ---------------------------------------------------------------------------

export interface LynchCandidate {
  symbol: string;
  exchange: string;
  name: string;
  sector: string;
  price: number | null;
  changePercent: number | null;
  pegRatio: number | null; // P
  epsGrowthPercent: number | null; // G
  debtToEquity: number | null; // D
  roePercent: number | null; // Q (basic profitability sanity check)
  score: number; // 0-4
  passes: {
    peg: boolean | null; // PEG < 1
    growth: boolean | null; // "reasonable" growth: 10-50% YoY, not a one-off spike
    debt: boolean | null; // debt/equity < 0.5
    quality: boolean | null; // ROE >= 10%
  };
}

export interface LynchScreen {
  legend: "LYNCH";
  asOf: string;
  universeSize: number;
  candidates: LynchCandidate[];
}

async function getLynchScreen(limit = 1000, topN = 50): Promise<LynchScreen> {
  const rows = await fetchTVScreener("america", limit);

  const candidates: LynchCandidate[] = rows.map((r) => {
    const passPeg = r.pegRatio != null ? r.pegRatio > 0 && r.pegRatio < 1 : null;
    const passGrowth = r.epsDilGrowthPercent != null ? r.epsDilGrowthPercent >= 10 && r.epsDilGrowthPercent <= 50 : null;
    const passDebt = r.debtToEquity != null ? r.debtToEquity < 0.5 : null;
    const passQuality = r.roePercent != null ? r.roePercent >= 10 : null;

    const score = [passPeg, passGrowth, passDebt, passQuality].filter((p) => p === true).length;

    return {
      symbol: r.symbol,
      exchange: r.exchange,
      name: r.name,
      sector: r.sector,
      price: r.price,
      changePercent: r.changePercent,
      pegRatio: r.pegRatio,
      epsGrowthPercent: r.epsDilGrowthPercent,
      debtToEquity: r.debtToEquity,
      roePercent: r.roePercent,
      score,
      passes: { peg: passPeg, growth: passGrowth, debt: passDebt, quality: passQuality },
    };
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.pegRatio ?? Infinity) - (b.pegRatio ?? Infinity);
  });

  return { legend: "LYNCH", asOf: new Date().toISOString(), universeSize: rows.length, candidates: candidates.slice(0, topN) };
}

// ---------------------------------------------------------------------------
// Warren Buffett — Quality-Value (ROE/moat/leverage/valuation)
// ---------------------------------------------------------------------------

export interface BuffettCandidate {
  symbol: string;
  exchange: string;
  name: string;
  sector: string;
  price: number | null;
  changePercent: number | null;
  roePercent: number | null;
  debtToEquity: number | null;
  beta: number | null;
  peRatio: number | null;
  score: number; // 0-4
  passes: {
    roe: boolean | null; // ROE >= 15%, consistent quality/moat proxy
    debt: boolean | null; // debt/equity < 0.8
    stability: boolean | null; // beta < 1.2
    valuation: boolean | null; // P/E <= 25, not overpaying
  };
}

export interface BuffettScreen {
  legend: "BUFFETT";
  asOf: string;
  universeSize: number;
  candidates: BuffettCandidate[];
}

async function getBuffettScreen(limit = 1000, topN = 50): Promise<BuffettScreen> {
  const rows = await fetchTVScreener("america", limit);

  const candidates: BuffettCandidate[] = rows.map((r) => {
    const passRoe = r.roePercent != null ? r.roePercent >= 15 : null;
    const passDebt = r.debtToEquity != null ? r.debtToEquity < 0.8 : null;
    const passStability = r.beta != null ? r.beta < 1.2 : null;
    const passValuation = r.peRatio != null ? r.peRatio > 0 && r.peRatio <= 25 : null;

    const score = [passRoe, passDebt, passStability, passValuation].filter((p) => p === true).length;

    return {
      symbol: r.symbol,
      exchange: r.exchange,
      name: r.name,
      sector: r.sector,
      price: r.price,
      changePercent: r.changePercent,
      roePercent: r.roePercent,
      debtToEquity: r.debtToEquity,
      beta: r.beta,
      peRatio: r.peRatio,
      score,
      passes: { roe: passRoe, debt: passDebt, stability: passStability, valuation: passValuation },
    };
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.roePercent ?? -Infinity) - (a.roePercent ?? -Infinity);
  });

  return { legend: "BUFFETT", asOf: new Date().toISOString(), universeSize: rows.length, candidates: candidates.slice(0, topN) };
}

// ---------------------------------------------------------------------------
// Mark Minervini — Trend Template (5 of the original 8 checks — the ones a
// single scanner snapshot can actually verify; see the agent file for the
// full 8-point template and what's skipped, and why: only criterion #3
// ("200-day MA trending up for at least a month") needs a historical time
// series TradingView's scanner endpoint doesn't expose — confirmed live by
// requesting "SMA200[20]" (a 20-session-old value) and getting back `null`.
// SMA150 itself, despite not being one of TradingView's own UI presets
// (20/50/100/200), IS a real, working scanner column — confirmed live too.
// ---------------------------------------------------------------------------

export interface MinerviniCandidate {
  symbol: string;
  exchange: string;
  name: string;
  sector: string;
  price: number | null;
  changePercent: number | null;
  sma50: number | null;
  sma150: number | null;
  sma200: number | null;
  percentOffHigh: number | null;
  percentAboveLow: number | null;
  rsPercentile: number | null; // 0-100 within this scan
  score: number; // 0-5
  passes: {
    priceAboveMAs: boolean | null; // #1: price > SMA50, SMA150, and SMA200
    maStack: boolean | null; // #2 + #4: SMA50 > SMA150 > SMA200 (correct stacking order)
    aboveLow: boolean | null; // #6: at least 25% above 52-week low
    nearHigh: boolean | null; // #7: within 25% of 52-week high
    rs: boolean | null; // #8: RS percentile >= 70
  };
}

export interface MinerviniScreen {
  legend: "MINERVINI";
  asOf: string;
  marketGate: MarketGate;
  universeSize: number;
  candidates: MinerviniCandidate[];
}

async function getMinerviniScreen(limit = 1000, topN = 50): Promise<MinerviniScreen> {
  const [rows, marketGate] = await Promise.all([fetchTVScreener("america", limit), getSpyMarketGate()]);

  const perfValues = rows.map((r) => r.perfYearPercent);

  const candidates: MinerviniCandidate[] = rows.map((r) => {
    const percentOffHigh =
      r.price != null && r.fiftyTwoWeekHigh != null && r.fiftyTwoWeekHigh > 0
        ? ((r.fiftyTwoWeekHigh - r.price) / r.fiftyTwoWeekHigh) * 100
        : null;
    const percentAboveLow =
      r.price != null && r.fiftyTwoWeekLow != null && r.fiftyTwoWeekLow > 0
        ? ((r.price - r.fiftyTwoWeekLow) / r.fiftyTwoWeekLow) * 100
        : null;
    const rsPercentile = percentileRank(perfValues, r.perfYearPercent);

    const passPriceAboveMAs =
      r.price != null && r.sma50 != null && r.sma150 != null && r.sma200 != null
        ? r.price > r.sma50 && r.price > r.sma150 && r.price > r.sma200
        : null;
    const passMaStack =
      r.sma50 != null && r.sma150 != null && r.sma200 != null ? r.sma50 > r.sma150 && r.sma150 > r.sma200 : null;
    const passNearHigh = percentOffHigh != null ? percentOffHigh <= 25 : null;
    const passAboveLow = percentAboveLow != null ? percentAboveLow >= 25 : null;
    const passRs = rsPercentile != null ? rsPercentile >= 70 : null;

    const score = [passPriceAboveMAs, passMaStack, passAboveLow, passNearHigh, passRs].filter((p) => p === true)
      .length;

    return {
      symbol: r.symbol,
      exchange: r.exchange,
      name: r.name,
      sector: r.sector,
      price: r.price,
      changePercent: r.changePercent,
      sma50: r.sma50,
      sma150: r.sma150,
      sma200: r.sma200,
      percentOffHigh,
      percentAboveLow,
      rsPercentile,
      score,
      passes: {
        priceAboveMAs: passPriceAboveMAs,
        maStack: passMaStack,
        aboveLow: passAboveLow,
        nearHigh: passNearHigh,
        rs: passRs,
      },
    };
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.rsPercentile ?? -1) - (a.rsPercentile ?? -1);
  });

  return { legend: "MINERVINI", asOf: new Date().toISOString(), marketGate, universeSize: rows.length, candidates: candidates.slice(0, topN) };
}

// ---------------------------------------------------------------------------
// Qullamaggie — momentum breakout ("strength precedes strength": a stock
// already leading the market, trending tightly, breaking out on volume).
// No public numeric checklist the way O'Neil/Minervini/Graham publish one —
// this is a reasonable, commonly-cited reading of the public methodology
// (momentum leg + short-term trend + volatility contraction + volume
// expansion), not a verbatim rule set. Say so when presenting this one.
// ---------------------------------------------------------------------------

export interface QullamaggieCandidate {
  symbol: string;
  exchange: string;
  name: string;
  sector: string;
  price: number | null;
  changePercent: number | null;
  perf3MPercent: number | null;
  momentumPercentile: number | null; // 0-100 within this scan
  sma20: number | null;
  sma50: number | null;
  atrPercent: number | null; // ATR / price * 100 — volatility-contraction proxy
  tightnessPercentile: number | null; // 0-100, LOWER = tighter (ranked ascending)
  relativeVolume: number | null;
  score: number; // 0-4
  passes: {
    momentum: boolean | null; // 3-month performance in top 10% of this scan
    trend: boolean | null; // price > SMA20 > SMA50
    tightness: boolean | null; // ATR% in the tightest 40% of this scan
    volumeSurge: boolean | null; // relative volume >= 1.5x
  };
}

export interface QullamaggieScreen {
  legend: "QULLAMAGGIE";
  asOf: string;
  universeSize: number;
  candidates: QullamaggieCandidate[];
}

async function getQullamaggieScreen(limit = 1000, topN = 50): Promise<QullamaggieScreen> {
  const rows = await fetchTVScreener("america", limit);

  const perf3MValues = rows.map((r) => r.perf3MPercent);
  const atrPercentValues = rows.map((r) =>
    r.atr != null && r.price != null && r.price > 0 ? (r.atr / r.price) * 100 : null
  );

  const candidates: QullamaggieCandidate[] = rows.map((r, i) => {
    const atrPercent = atrPercentValues[i];
    const momentumPercentile = percentileRank(perf3MValues, r.perf3MPercent);
    const tightnessPercentile = percentileRank(atrPercentValues, atrPercent);

    const passMomentum = momentumPercentile != null ? momentumPercentile >= 90 : null;
    const passTrend =
      r.price != null && r.sma20 != null && r.sma50 != null ? r.price > r.sma20 && r.sma20 > r.sma50 : null;
    const passTightness = tightnessPercentile != null ? tightnessPercentile <= 40 : null;
    const passVolumeSurge = r.relativeVolume != null ? r.relativeVolume >= 1.5 : null;

    const score = [passMomentum, passTrend, passTightness, passVolumeSurge].filter((p) => p === true).length;

    return {
      symbol: r.symbol,
      exchange: r.exchange,
      name: r.name,
      sector: r.sector,
      price: r.price,
      changePercent: r.changePercent,
      perf3MPercent: r.perf3MPercent,
      momentumPercentile,
      sma20: r.sma20,
      sma50: r.sma50,
      atrPercent,
      tightnessPercentile,
      relativeVolume: r.relativeVolume,
      score,
      passes: { momentum: passMomentum, trend: passTrend, tightness: passTightness, volumeSurge: passVolumeSurge },
    };
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.momentumPercentile ?? -1) - (a.momentumPercentile ?? -1);
  });

  return { legend: "QULLAMAGGIE", asOf: new Date().toISOString(), universeSize: rows.length, candidates: candidates.slice(0, topN) };
}

// ---------------------------------------------------------------------------
// Benjamin Graham — classic defensive-investor deep value (the intellectual
// root Buffett/Lynch both built on): cheap relative to earnings AND book
// value, safe balance sheet.
// ---------------------------------------------------------------------------

export interface GrahamCandidate {
  symbol: string;
  exchange: string;
  name: string;
  sector: string;
  price: number | null;
  changePercent: number | null;
  peRatio: number | null;
  priceToBook: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  score: number; // 0-4
  passes: {
    valuation: boolean | null; // P/E <= 15
    bookValue: boolean | null; // P/B <= 1.5
    liquidity: boolean | null; // current ratio >= 2
    leverage: boolean | null; // debt/equity < 0.5
  };
}

export interface GrahamScreen {
  legend: "GRAHAM";
  asOf: string;
  universeSize: number;
  candidates: GrahamCandidate[];
}

async function getGrahamScreen(limit = 1000, topN = 50): Promise<GrahamScreen> {
  const rows = await fetchTVScreener("america", limit);

  const candidates: GrahamCandidate[] = rows.map((r) => {
    const passValuation = r.peRatio != null ? r.peRatio > 0 && r.peRatio <= 15 : null;
    const passBookValue = r.priceToBook != null ? r.priceToBook > 0 && r.priceToBook <= 1.5 : null;
    const passLiquidity = r.currentRatio != null ? r.currentRatio >= 2 : null;
    const passLeverage = r.debtToEquity != null ? r.debtToEquity < 0.5 : null;

    const score = [passValuation, passBookValue, passLiquidity, passLeverage].filter((p) => p === true).length;

    return {
      symbol: r.symbol,
      exchange: r.exchange,
      name: r.name,
      sector: r.sector,
      price: r.price,
      changePercent: r.changePercent,
      peRatio: r.peRatio,
      priceToBook: r.priceToBook,
      currentRatio: r.currentRatio,
      debtToEquity: r.debtToEquity,
      score,
      passes: { valuation: passValuation, bookValue: passBookValue, liquidity: passLiquidity, leverage: passLeverage },
    };
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.peRatio ?? Infinity) - (b.peRatio ?? Infinity);
  });

  return { legend: "GRAHAM", asOf: new Date().toISOString(), universeSize: rows.length, candidates: candidates.slice(0, topN) };
}

// ---------------------------------------------------------------------------

export type LegendScreen =
  | CanslimScreen
  | LynchScreen
  | BuffettScreen
  | MinerviniScreen
  | QullamaggieScreen
  | GrahamScreen;

export async function getLegendScreen(legend: LegendKey): Promise<LegendScreen> {
  switch (legend) {
    case "CANSLIM":
      return getCanslimScreen();
    case "LYNCH":
      return getLynchScreen();
    case "BUFFETT":
      return getBuffettScreen();
    case "MINERVINI":
      return getMinerviniScreen();
    case "QULLAMAGGIE":
      return getQullamaggieScreen();
    case "GRAHAM":
      return getGrahamScreen();
  }
}
