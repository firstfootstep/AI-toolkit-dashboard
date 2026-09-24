import { Stat } from "@/components/ui/Stat";
import { formatCurrency, formatPercent, formatSigned } from "@/lib/format";
import type { TradingJournalStats } from "@/lib/tradingJournal";

export function JournalStatsGrid({ stats }: { stats: TradingJournalStats }) {
  const profitFactorLabel = Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞";

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
      <Stat
        label="Equity"
        value={formatCurrency(stats.equity)}
        delta={`ROI ${formatPercent(stats.roiPercent)}`}
        tone={stats.roiPercent >= 0 ? "up" : "down"}
      />
      <Stat
        label="NAV"
        value={formatCurrency(stats.nav)}
        delta={`Unrealized ${formatSigned(stats.unrealizedPnl)}`}
        tone={stats.unrealizedPnl >= 0 ? "up" : "down"}
      />
      <Stat label="Exposure" value={String(stats.openPositions)} delta={`${stats.openPositions} open positions`} />
      <Stat
        label="Win Rate"
        value={formatPercent(stats.winRate)}
        delta={`${stats.closedTrades} closed trades`}
        tone={stats.winRate >= 50 ? "up" : "down"}
      />
      <Stat
        label="Profit Factor"
        value={profitFactorLabel}
        delta={`Net P&L ${formatSigned(stats.netPnl)}`}
        tone={stats.netPnl >= 0 ? "up" : "down"}
      />
      <Stat
        label="Max Drawdown"
        value={`${stats.maxDrawdownPercent.toFixed(2)}%`}
        delta={`Peak DD ${stats.maxDrawdownPercent.toFixed(2)}%`}
        tone="down"
      />
    </div>
  );
}
