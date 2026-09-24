import type { Holding, PortfolioSummary } from "@/types/market";
import { getTradingJournalStats } from "@/lib/tradingJournal";

/**
 * Portfolio data is intentionally mock-only (per project scope): this is a
 * personal demo dashboard, not a brokerage integration. Real market prices
 * for the Watchlist/Markets pages still come from the live/keyless quotes
 * API in src/app/api/quotes/route.ts.
 *
 * Derived from the same master journal (src/fixtures/trade-setups.csv, via
 * getTradingJournalStats()) that drives the Portfolio page, so the
 * Dashboard's "Portfolio" card never disagrees with it. There is
 * no margin/leverage concept in that journal, so buying power is just cash
 * on hand; day change comes from the last two days of the NAV series
 * instead of a live intraday feed.
 */
export function getPortfolioSummary(): PortfolioSummary {
  const stats = getTradingJournalStats();
  const cashHolding = stats.holdings.find((h) => h.assetClass === "Cash");
  const cash = cashHolding?.avgCost ?? 0;

  const openCostBasis = stats.holdings
    .filter((h) => h.assetClass !== "Cash")
    .reduce((sum, h) => sum + h.quantity * h.avgCost, 0);

  const series = stats.series;
  const prevNav = series.length > 1 ? series[series.length - 2].totalNav : stats.nav;
  const dayChange = stats.nav - prevNav;

  return {
    totalValue: stats.nav,
    dayChange,
    dayChangePercent: prevNav ? (dayChange / prevNav) * 100 : 0,
    unrealizedPnl: stats.unrealizedPnl,
    unrealizedPnlPercent: openCostBasis ? (stats.unrealizedPnl / openCostBasis) * 100 : 0,
    cash,
    buyingPower: cash,
    performanceSeries: series.map((p) => ({ date: p.date, value: p.totalNav })),
    holdings: stats.holdings,
  };
}

export function allocationFromHoldings(holdings: Holding[]) {
  const totals = new Map<string, number>();
  for (const h of holdings) {
    const value = h.assetClass === "Cash" ? h.avgCost : h.quantity * h.price;
    totals.set(h.assetClass, (totals.get(h.assetClass) ?? 0) + value);
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()].map(([name, value]) => ({
    name,
    value,
    percent: total ? (value / total) * 100 : 0,
  }));
}

export function allocationByAssetClass(summary: PortfolioSummary) {
  return allocationFromHoldings(summary.holdings);
}
