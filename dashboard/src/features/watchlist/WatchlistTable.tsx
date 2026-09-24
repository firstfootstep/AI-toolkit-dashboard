import Link from "next/link";
import type { Quote } from "@/types/market";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Sparkline } from "@/components/ui/Sparkline";

export function WatchlistTable({ quotes }: { quotes: Quote[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-2 font-medium">Symbol</th>
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium text-right">Price</th>
            <th className="py-2 font-medium text-right">Change</th>
            <th className="py-2 font-medium text-right">% Change</th>
            <th className="py-2 font-medium text-right">Trend</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => {
            const up = q.change >= 0;
            return (
              <tr key={q.symbol} className="border-b border-line last:border-0">
                <td className="py-2.5">
                  <Link
                    href={`/chart?symbol=${q.symbol}`}
                    className="flex items-center gap-2 font-medium text-ink hover:underline"
                  >
                    <span className={"h-1.5 w-1.5 rounded-full " + (up ? "bg-primary-bright" : "bg-coral")} />
                    {q.symbol}
                  </Link>
                </td>
                <td className="py-2.5 text-muted">{q.name}</td>
                <td className="py-2.5 text-right text-ink">
                  {formatCurrency(q.price, q.currency)}
                </td>
                <td className={"py-2.5 text-right " + (up ? "text-primary-bright" : "text-coral")}>
                  {up ? "+" : ""}
                  {q.change.toFixed(2)}
                </td>
                <td className={"py-2.5 text-right " + (up ? "text-primary-bright" : "text-coral")}>
                  {formatPercent(q.changePercent)}
                </td>
                <td className="py-2.5">
                  <div className="ml-auto h-6 w-20">
                    <Sparkline data={q.history} tone={up ? "up" : "down"} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
