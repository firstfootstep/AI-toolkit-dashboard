import { getTradeSetups, type TradeSetup, type TradeSetupType } from "@/lib/tradeSetups";

// Fixed, deterministic aggregation over trade-setups.csv — the same
// "server computes the real numbers, Claude only writes the prose"
// pattern as legendScanner.ts / marketCommentaryAgent.ts. This never
// changes between runs (same fixture), so it's cheap to recompute on
// every request rather than cache.

export interface SetupTypeStats {
  setup: TradeSetupType;
  count: number;
  winRate: number | null;
  avgPnlPercent: number | null;
  avgRsRating: number;
}

export interface BucketStats {
  label: string;
  count: number;
  winRate: number | null;
  avgPnlPercent: number | null;
  avgSizePercent: number | null;
}

export interface TradingCoachStats {
  closedTrades: number;
  openTrades: number;
  winRate: number;
  avgWinPercent: number | null;
  avgLossPercent: number | null; // negative
  winLossRatio: number | null; // avgWin / abs(avgLoss)
  biggestWinPercent: number | null;
  biggestLossPercent: number | null;
  avgSizePercentOnWins: number | null;
  avgSizePercentOnLosses: number | null;
  avgSizePercentHighRs: number | null; // RS >= 85
  avgSizePercentLowRs: number | null; // RS < 80
  bySetup: SetupTypeStats[];
  byRsBucket: BucketStats[]; // "90-99", "80-89", "70-79", "<70"
  byRelVolBucket: BucketStats[]; // ">=2.0x", "1.5-2.0x", "1.0-1.5x", "<1.0x"
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round1(n: number | null): number | null {
  return n == null ? null : Math.round(n * 10) / 10;
}

function bucketStats(label: string, rows: TradeSetup[]): BucketStats {
  const wins = rows.filter((t) => t.outcome === "Win");
  return {
    label,
    count: rows.length,
    winRate: rows.length > 0 ? round1((wins.length / rows.length) * 100) : null,
    avgPnlPercent: round1(avg(rows.map((t) => t.pnlPercent as number))),
    avgSizePercent: round1(avg(rows.map((t) => t.positionSizePercent))),
  };
}

export function computeTradingCoachStats(trades: TradeSetup[] = getTradeSetups()): TradingCoachStats {
  const closed = trades.filter((t) => t.outcome !== "Open" && t.pnlPercent != null);
  const open = trades.filter((t) => t.outcome === "Open");
  const wins = closed.filter((t) => t.outcome === "Win");
  const losses = closed.filter((t) => t.outcome === "Loss");

  const winPercents = wins.map((t) => t.pnlPercent as number);
  const lossPercents = losses.map((t) => t.pnlPercent as number);

  const avgWin = avg(winPercents);
  const avgLoss = avg(lossPercents);

  const bySetup: SetupTypeStats[] = (
    ["Breakout", "Pullback", "VCP", "VDU", "Episodic Pivot"] as TradeSetupType[]
  ).map((setup) => {
    const rows = closed.filter((t) => t.setup === setup);
    const setupWins = rows.filter((t) => t.outcome === "Win");
    return {
      setup,
      count: rows.length,
      winRate: rows.length > 0 ? round1((setupWins.length / rows.length) * 100) : null,
      avgPnlPercent: round1(avg(rows.map((t) => t.pnlPercent as number))),
      avgRsRating: Math.round(avg(rows.map((t) => t.rsRating)) ?? 0),
    };
  });

  const byRsBucket: BucketStats[] = [
    bucketStats("RS 90-99", closed.filter((t) => t.rsRating >= 90)),
    bucketStats("RS 80-89", closed.filter((t) => t.rsRating >= 80 && t.rsRating < 90)),
    bucketStats("RS 70-79", closed.filter((t) => t.rsRating >= 70 && t.rsRating < 80)),
    bucketStats("RS <70", closed.filter((t) => t.rsRating < 70)),
  ];

  const byRelVolBucket: BucketStats[] = [
    bucketStats(">=2.0x", closed.filter((t) => t.relativeVolume >= 2)),
    bucketStats("1.5-2.0x", closed.filter((t) => t.relativeVolume >= 1.5 && t.relativeVolume < 2)),
    bucketStats("1.0-1.5x", closed.filter((t) => t.relativeVolume >= 1 && t.relativeVolume < 1.5)),
    bucketStats("<1.0x", closed.filter((t) => t.relativeVolume < 1)),
  ];

  return {
    closedTrades: closed.length,
    openTrades: open.length,
    winRate: closed.length > 0 ? Math.round((wins.length / closed.length) * 1000) / 10 : 0,
    avgWinPercent: round1(avgWin),
    avgLossPercent: round1(avgLoss),
    winLossRatio: avgWin != null && avgLoss != null && avgLoss !== 0 ? Math.round((avgWin / Math.abs(avgLoss)) * 100) / 100 : null,
    biggestWinPercent: winPercents.length > 0 ? round1(Math.max(...winPercents)) : null,
    biggestLossPercent: lossPercents.length > 0 ? round1(Math.min(...lossPercents)) : null,
    avgSizePercentOnWins: round1(avg(wins.map((t) => t.positionSizePercent))),
    avgSizePercentOnLosses: round1(avg(losses.map((t) => t.positionSizePercent))),
    avgSizePercentHighRs: round1(avg(closed.filter((t) => t.rsRating >= 85).map((t) => t.positionSizePercent))),
    avgSizePercentLowRs: round1(avg(closed.filter((t) => t.rsRating < 80).map((t) => t.positionSizePercent))),
    bySetup,
    byRsBucket,
    byRelVolBucket,
  };
}
