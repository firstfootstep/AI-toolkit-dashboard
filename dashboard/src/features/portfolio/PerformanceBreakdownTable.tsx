import clsx from "clsx";

export interface BreakdownRow {
  label: string;
  count: number;
  winRate: number | null;
  avgPnlPercent: number | null;
  extraLabel: string;
  extraValue: string;
}

// Generic "win rate / avg P&L broken down by X" table — used for setup
// type, RS-rating bucket, and relative-volume bucket on the Portfolio page,
// so a student can see win rate move up or down across each dimension
// directly, not just as prose inside the Trading Coach brief.
export function PerformanceBreakdownTable({ rows }: { rows: BreakdownRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-2 pr-4 font-medium" />
            <th className="py-2 pr-4 text-right font-medium">Trades</th>
            <th className="py-2 pr-4 text-right font-medium">Win rate</th>
            <th className="py-2 pr-4 text-right font-medium">Avg P&L</th>
            <th className="py-2 text-right font-medium">{rows[0]?.extraLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-line last:border-0">
              <td className="py-2.5 pr-4 font-medium text-ink">{r.label}</td>
              <td className="py-2.5 pr-4 text-right text-muted">{r.count}</td>
              <td
                className={clsx(
                  "py-2.5 pr-4 text-right font-medium",
                  r.winRate == null ? "text-muted" : r.winRate >= 50 ? "text-primary-bright" : "text-coral"
                )}
              >
                {r.winRate == null ? "–" : `${r.winRate.toFixed(1)}%`}
              </td>
              <td
                className={clsx(
                  "py-2.5 pr-4 text-right font-medium",
                  r.avgPnlPercent == null ? "text-muted" : r.avgPnlPercent >= 0 ? "text-primary-bright" : "text-coral"
                )}
              >
                {r.avgPnlPercent == null ? "–" : `${r.avgPnlPercent >= 0 ? "+" : ""}${r.avgPnlPercent.toFixed(1)}%`}
              </td>
              <td className="py-2.5 text-right text-muted">{r.extraValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
