import type { Holding } from "@/types/market";
import { formatCurrency, formatSigned } from "@/lib/format";

export function HoldingsTable({ holdings }: { holdings: Holding[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-2 font-medium">Symbol</th>
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Asset class</th>
            <th className="py-2 font-medium text-right">Qty</th>
            <th className="py-2 font-medium text-right">Avg cost</th>
            <th className="py-2 font-medium text-right">Price</th>
            <th className="py-2 font-medium text-right">Market value</th>
            <th className="py-2 font-medium text-right">Unrealized P&L</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const marketValue = h.assetClass === "Cash" ? h.avgCost : h.quantity * h.price;
            const costBasis = h.assetClass === "Cash" ? h.avgCost : h.quantity * h.avgCost;
            const pnl = marketValue - costBasis;
            return (
              <tr key={h.symbol} className="border-b border-line last:border-0">
                <td className="py-2.5 font-medium text-ink">{h.symbol}</td>
                <td className="py-2.5 text-muted">{h.name}</td>
                <td className="py-2.5 text-muted">{h.assetClass}</td>
                <td className="py-2.5 text-right text-muted">
                  {h.assetClass === "Cash" ? "—" : h.quantity}
                </td>
                <td className="py-2.5 text-right text-muted">
                  {h.assetClass === "Cash" ? "—" : formatCurrency(h.avgCost)}
                </td>
                <td className="py-2.5 text-right text-muted">
                  {h.assetClass === "Cash" ? "—" : formatCurrency(h.price)}
                </td>
                <td className="py-2.5 text-right font-medium text-ink">
                  {formatCurrency(marketValue)}
                </td>
                <td
                  className={
                    "py-2.5 text-right font-medium " +
                    (pnl > 0
                      ? "text-primary-bright"
                      : pnl < 0
                        ? "text-coral"
                        : "text-muted")
                  }
                >
                  {h.assetClass === "Cash" ? "—" : formatSigned(pnl)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
