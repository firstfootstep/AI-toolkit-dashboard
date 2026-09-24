import clsx from "clsx";
import { formatCurrency, formatPercent, formatSigned } from "@/lib/format";
import type { ClosedTrade } from "@/lib/tradingJournal";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function TradeHistoryTable({ trades }: { trades: ClosedTrade[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-2 pr-4 font-medium">Symbol</th>
            <th className="py-2 pr-4 font-medium">Entry</th>
            <th className="py-2 pr-4 text-right font-medium">Entry price</th>
            <th className="py-2 pr-4 font-medium">Exit</th>
            <th className="py-2 pr-4 text-right font-medium">Exit price</th>
            <th className="py-2 pr-4 text-right font-medium">Qty</th>
            <th className="py-2 pr-4 text-right font-medium">Held</th>
            <th className="py-2 pr-4 text-right font-medium">P&L</th>
            <th className="py-2 text-right font-medium">P&L %</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => {
            const win = t.pnl >= 0;
            return (
              <tr key={`${t.symbol}-${t.exitDate}-${i}`} className="border-b border-line last:border-0">
                <td className="py-2.5 pr-4 font-medium text-ink">{t.symbol}</td>
                <td className="py-2.5 pr-4 text-muted">{formatDate(t.entryDate)}</td>
                <td className="py-2.5 pr-4 text-right text-muted">{formatCurrency(t.entryPrice)}</td>
                <td className="py-2.5 pr-4 text-muted">{formatDate(t.exitDate)}</td>
                <td className="py-2.5 pr-4 text-right text-muted">{formatCurrency(t.exitPrice)}</td>
                <td className="py-2.5 pr-4 text-right text-muted">{t.qty}</td>
                <td className="py-2.5 pr-4 text-right text-muted">{t.holdingDays}d</td>
                <td className={clsx("py-2.5 pr-4 text-right font-medium", win ? "text-primary-bright" : "text-coral")}>
                  {formatSigned(t.pnl)}
                </td>
                <td className={clsx("py-2.5 text-right font-medium", win ? "text-primary-bright" : "text-coral")}>
                  {formatPercent(t.pnlPercent)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
