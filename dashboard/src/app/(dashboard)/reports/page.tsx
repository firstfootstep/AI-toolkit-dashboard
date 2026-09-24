import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { DownloadCsvButton } from "@/features/reports/DownloadCsvButton";
import { getMonthlyReport } from "@/features/reports/reportData";
import { formatCurrency, formatPercent, formatSigned } from "@/lib/format";

function formatDate(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ReportsPage() {
  const report = getMonthlyReport();
  const up = report.periodChange >= 0;

  return (
    <>
      <Topbar title="Reports" />
      <main className="flex-1 space-y-6 overflow-y-auto p-8">
        <Card
          title={`Monthly Performance Report — ${formatDate(report.periodStart)} to ${formatDate(report.periodEnd)}`}
        >
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label="Starting value" value={formatCurrency(report.startValue)} />
            <Stat label="Ending value" value={formatCurrency(report.endValue)} />
            <Stat
              label="Period change"
              value={formatSigned(report.periodChange)}
              delta={formatPercent(report.periodChangePercent)}
              tone={up ? "up" : "down"}
            />
            <Stat
              label="Best / worst performer"
              value={`${report.bestPerformer.symbol} / ${report.worstPerformer.symbol}`}
              delta={`${formatPercent(report.bestPerformer.unrealizedPnlPercent)} / ${formatPercent(report.worstPerformer.unrealizedPnlPercent)}`}
            />
          </div>
        </Card>

        <Card title="Holdings breakdown" action={<DownloadCsvButton rows={report.rows} filename="monthly-performance-report.csv" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="pb-2 font-medium">Symbol</th>
                  <th className="pb-2 font-medium">Asset class</th>
                  <th className="pb-2 font-medium text-right">Market value</th>
                  <th className="pb-2 font-medium text-right">Weight</th>
                  <th className="pb-2 font-medium text-right">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.rows.map((r) => (
                  <tr key={r.symbol}>
                    <td className="py-2.5">
                      <span className="font-medium text-ink">{r.symbol}</span>{" "}
                      <span className="text-muted">{r.name}</span>
                    </td>
                    <td className="py-2.5 text-muted">{r.assetClass}</td>
                    <td className="py-2.5 text-right text-ink">{formatCurrency(r.marketValue)}</td>
                    <td className="py-2.5 text-right text-ink">{r.weightPercent.toFixed(1)}%</td>
                    <td className={`py-2.5 text-right font-medium ${r.unrealizedPnl >= 0 ? "text-primary-bright" : "text-coral"}`}>
                      {formatSigned(r.unrealizedPnl)} ({formatPercent(r.unrealizedPnlPercent)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
