import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { getPortfolioSummary, allocationByAssetClass } from "@/features/portfolio/data";
import { AllocationDonut } from "@/features/portfolio/AllocationDonut";
import { PerformanceChart } from "@/features/portfolio/PerformanceChart";
import { ThesisPanel } from "@/features/portfolio/ThesisPanel";
import { TradingCoachSummary } from "@/features/portfolio/TradingCoachSummary";
import { getLatestTradingCoachBrief } from "@/features/portfolio/tradingCoachBrief";
import { MarketPulse } from "@/features/markets/MarketPulse";
import { PresetWatchlistTable } from "@/features/watchlist/PresetWatchlistTable";
import { WATCHLIST_PRESETS, topByPreset } from "@/features/watchlist/scanPresets";
import { getScannerUniverse } from "@/features/scanner/data";
import { NewsList } from "@/features/news/NewsList";
import { getQuotes } from "@/lib/quotes";
import { getNews } from "@/lib/news";
import { MARKET_PULSE_SYMBOLS } from "@/features/markets/pulseSymbols";
import { formatCurrency, formatPercent, formatSigned } from "@/lib/format";

export const dynamic = "force-dynamic";

const RS_HIGH_PRESET = WATCHLIST_PRESETS.find((p) => p.key === "rsHigh")!;

export default async function DashboardPage() {
  const summary = getPortfolioSummary();
  const allocation = allocationByAssetClass(summary);
  const coachBrief = getLatestTradingCoachBrief();

  const [pulseQuotes, scannerUniverse, news] = await Promise.all([
    getQuotes(MARKET_PULSE_SYMBOLS.map((s) => s.symbol)),
    getScannerUniverse("america"),
    getNews(),
  ]);
  const rsHighRows = topByPreset(scannerUniverse.rows, RS_HIGH_PRESET);

  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 space-y-6 overflow-y-auto p-8">
        <Card
          title="Portfolio"
          action={<DataSourceBadge source="mock" />}
        >
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Total value" value={formatCurrency(summary.totalValue)} delta={`${formatSigned(summary.dayChange)} (${formatPercent(summary.dayChangePercent)})`} tone={summary.dayChange >= 0 ? "up" : "down"} />
            <Stat label="Day change" value={formatSigned(summary.dayChange)} delta={formatPercent(summary.dayChangePercent)} tone={summary.dayChange >= 0 ? "up" : "down"} />
            <Stat label="Unrealized P&L" value={formatSigned(summary.unrealizedPnl)} delta={formatPercent(summary.unrealizedPnlPercent)} tone={summary.unrealizedPnl >= 0 ? "up" : "down"} />
            <Stat label="Cash" value={formatCurrency(summary.cash)} delta={`${((summary.cash / summary.totalValue) * 100).toFixed(2)}%`} tone="neutral" />
            <Stat label="Buying power" value={formatCurrency(summary.buyingPower)} delta={`${((summary.buyingPower / summary.totalValue) * 100).toFixed(2)}%`} tone="neutral" />
          </div>
          <div className="mt-6 border-t border-line pt-6">
            <AllocationDonut data={allocation} />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Market Pulse" action={<DataSourceBadge source={pulseQuotes.source} />} className="lg:col-span-1">
            <MarketPulse quotes={pulseQuotes.quotes} />
          </Card>

          <Card title="Portfolio Performance" className="lg:col-span-1">
            <PerformanceChart series={summary.performanceSeries} />
          </Card>

          <Card title="Thesis & Risk" className="lg:col-span-1">
            <ThesisPanel />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Watchlist — RS Score เยอะ" action={<DataSourceBadge source={scannerUniverse.source} />}>
            <PresetWatchlistTable rows={rsHighRows} presetKey="rsHigh" />
          </Card>

          <Card title="Recent News" action={<DataSourceBadge source={news.source} />}>
            <NewsList items={news.items} />
          </Card>
        </div>

        <TradingCoachSummary brief={coachBrief} />
      </main>
    </>
  );
}
