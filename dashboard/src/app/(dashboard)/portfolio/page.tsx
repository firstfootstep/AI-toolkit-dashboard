import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { allocationFromHoldings } from "@/features/portfolio/data";
import { AllocationDonut } from "@/features/portfolio/AllocationDonut";
import { HoldingsTable } from "@/features/portfolio/HoldingsTable";
import { ImportJournal } from "@/features/portfolio/ImportJournal";
import { JournalStatsGrid } from "@/features/portfolio/JournalStatsGrid";
import { EquityCurveChart } from "@/features/portfolio/EquityCurveChart";
import { DrawdownChart } from "@/features/portfolio/DrawdownChart";
import { TradeHistoryTable } from "@/features/portfolio/TradeHistoryTable";
import { TradeSetupsTable } from "@/features/portfolio/TradeSetupsTable";
import { TradingCoachCard } from "@/features/portfolio/TradingCoachCard";
import { PerformanceBreakdownTable, type BreakdownRow } from "@/features/portfolio/PerformanceBreakdownTable";
import { PortfolioTabs } from "@/features/portfolio/PortfolioTabs";
import { getTradingJournalStats } from "@/lib/tradingJournal";
import { getTradeSetups } from "@/lib/tradeSetups";
import { computeTradingCoachStats } from "@/lib/tradingCoachStats";
import { getLatestTradingCoachBrief } from "@/features/portfolio/tradingCoachBrief";
import { formatPercent, formatSigned } from "@/lib/format";

// Reads trading-coach-briefs/ fresh on every request so a brief the
// trading-coach-agent (or the "วิเคราะห์พฤติกรรมการเทรด" button) just wrote
// shows up without restarting the server — same reasoning as the Research
// and Legend Scanner pages.
export const dynamic = "force-dynamic";

export default function PortfolioPage() {
  const journal = getTradingJournalStats();
  const allocation = allocationFromHoldings(journal.holdings);
  const profitFactorLabel = Number.isFinite(journal.profitFactor) ? journal.profitFactor.toFixed(2) : "∞";
  const setupTrades = getTradeSetups();
  const coachBrief = getLatestTradingCoachBrief();
  const coachStats = computeTradingCoachStats(setupTrades);

  const bySetupRows: BreakdownRow[] = coachStats.bySetup.map((s) => ({
    label: s.setup,
    count: s.count,
    winRate: s.winRate,
    avgPnlPercent: s.avgPnlPercent,
    extraLabel: "Avg RS",
    extraValue: String(s.avgRsRating),
  }));
  const byRsRows: BreakdownRow[] = coachStats.byRsBucket.map((b) => ({
    label: b.label,
    count: b.count,
    winRate: b.winRate,
    avgPnlPercent: b.avgPnlPercent,
    extraLabel: "Avg size",
    extraValue: b.avgSizePercent == null ? "–" : `${b.avgSizePercent.toFixed(1)}%`,
  }));
  const byRelVolRows: BreakdownRow[] = coachStats.byRelVolBucket.map((b) => ({
    label: b.label,
    count: b.count,
    winRate: b.winRate,
    avgPnlPercent: b.avgPnlPercent,
    extraLabel: "Avg size",
    extraValue: b.avgSizePercent == null ? "–" : `${b.avgSizePercent.toFixed(1)}%`,
  }));

  const overviewPanel = (
    <>
      <Card title="Trading Journal Performance">
        <div className="space-y-6">
          <JournalStatsGrid stats={journal} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                Equity Curve &amp; NAV Performance
              </h4>
              <EquityCurveChart series={journal.series} />
            </div>
            <div>
              <h4 className="mb-2 font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">
                NAV Drawdown (%)
              </h4>
              <DrawdownChart series={journal.series} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Holdings" className="lg:col-span-2">
          <HoldingsTable holdings={journal.holdings} />
        </Card>
        <Card title="Allocation">
          <AllocationDonut data={allocation} />
        </Card>
      </div>

      <ImportJournal />
    </>
  );

  const closedTradesPanel = (
    <>
      <Card title="Closed trades summary">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Closed trades" value={String(journal.closedTrades)} />
          <Stat
            label="Win rate"
            value={formatPercent(journal.winRate)}
            tone={journal.winRate >= 50 ? "up" : "down"}
          />
          <Stat label="Profit factor" value={profitFactorLabel} />
          <Stat
            label="Net P&L"
            value={formatSigned(journal.netPnl)}
            tone={journal.netPnl >= 0 ? "up" : "down"}
          />
        </div>
      </Card>

      <Card title={`Matched trades (${journal.closedTradesList.length})`}>
        <TradeHistoryTable trades={journal.closedTradesList} />
      </Card>
    </>
  );

  const journalPanel = (
    <>
      <Card title={`Trade Setup Journal (mock, ${setupTrades.length})`}>
        <p className="mb-4 text-sm text-muted">
          ไฟล์ master ของทุกแท็บ (<code className="rounded bg-ink/6 px-1 py-0.5 text-xs">src/fixtures/trade-setups.csv</code>)
          — 1 แถวต่อ 1 ไม้ บันทึกวิธีเทรด (setup), RS rating, relative volume, ขนาด position และเหตุผล
          แท็บภาพรวมและ Closed Trades คำนวณ NAV/P&amp;L จากไฟล์นี้ ส่วนการ์ด &quot;Trading Coach&quot;
          ให้ agent วิเคราะห์พฤติกรรมจริงจากไฟล์เดียวกัน ข้อมูลนี้เป็น mockup
        </p>
        <TradeSetupsTable trades={setupTrades} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="ผลตามวิธีเทรด (Setup)">
          <PerformanceBreakdownTable rows={bySetupRows} />
        </Card>
        <Card title="ผลตาม RS Rating ตอนเข้าไม้">
          <PerformanceBreakdownTable rows={byRsRows} />
        </Card>
        <Card title="ผลตาม Relative Volume ตอนเข้าไม้">
          <PerformanceBreakdownTable rows={byRelVolRows} />
        </Card>
      </div>
    </>
  );

  return (
    <>
      <Topbar title="Portfolio" />
      <main className="flex-1 overflow-y-auto p-8">
        <PortfolioTabs
          overview={overviewPanel}
          closed={closedTradesPanel}
          journal={journalPanel}
          coach={<TradingCoachCard brief={coachBrief} />}
        />
      </main>
    </>
  );
}
