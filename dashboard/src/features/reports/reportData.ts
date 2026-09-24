import { getPortfolioSummary } from "@/features/portfolio/data";

export interface HoldingReportRow {
  symbol: string;
  name: string;
  assetClass: string;
  marketValue: number;
  weightPercent: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

export interface MonthlyReport {
  periodStart: string;
  periodEnd: string;
  startValue: number;
  endValue: number;
  periodChange: number;
  periodChangePercent: number;
  bestPerformer: HoldingReportRow;
  worstPerformer: HoldingReportRow;
  rows: HoldingReportRow[];
}

export function getMonthlyReport(): MonthlyReport {
  const summary = getPortfolioSummary();
  const series = summary.performanceSeries;
  const startValue = series[0]?.value ?? summary.totalValue;
  const endValue = series[series.length - 1]?.value ?? summary.totalValue;

  const investedHoldings = summary.holdings.filter((h) => h.assetClass !== "Cash");
  const totalMarketValue = summary.holdings.reduce(
    (sum, h) => sum + (h.assetClass === "Cash" ? h.avgCost : h.quantity * h.price),
    0
  );

  const rows: HoldingReportRow[] = summary.holdings.map((h) => {
    const marketValue = h.assetClass === "Cash" ? h.avgCost : h.quantity * h.price;
    const costBasis = h.assetClass === "Cash" ? h.avgCost : h.quantity * h.avgCost;
    const unrealizedPnl = marketValue - costBasis;
    return {
      symbol: h.symbol,
      name: h.name,
      assetClass: h.assetClass,
      marketValue,
      weightPercent: totalMarketValue ? (marketValue / totalMarketValue) * 100 : 0,
      unrealizedPnl,
      unrealizedPnlPercent: costBasis ? (unrealizedPnl / costBasis) * 100 : 0,
    };
  });

  const rankable = rows.filter((r) => investedHoldings.some((h) => h.symbol === r.symbol));
  const bestPerformer = rankable.reduce((a, b) => (b.unrealizedPnlPercent > a.unrealizedPnlPercent ? b : a));
  const worstPerformer = rankable.reduce((a, b) => (b.unrealizedPnlPercent < a.unrealizedPnlPercent ? b : a));

  return {
    periodStart: series[0]?.date ?? "",
    periodEnd: series[series.length - 1]?.date ?? "",
    startValue,
    endValue,
    periodChange: endValue - startValue,
    periodChangePercent: startValue ? ((endValue - startValue) / startValue) * 100 : 0,
    bestPerformer,
    worstPerformer,
    rows,
  };
}
