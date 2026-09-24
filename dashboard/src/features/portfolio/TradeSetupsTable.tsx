import clsx from "clsx";
import { Badge } from "@/components/ui/Badge";
import type { TradeSetup, TradeSetupType } from "@/lib/tradeSetups";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

const SETUP_TONE: Record<TradeSetupType, "green" | "blue" | "neutral" | "amber"> = {
  Breakout: "green",
  VCP: "green",
  Pullback: "blue",
  "Episodic Pivot": "blue",
  VDU: "amber",
};

function OutcomeBadge({ outcome }: { outcome: TradeSetup["outcome"] }) {
  if (outcome === "Open") return <Badge tone="neutral">Open</Badge>;
  return <Badge tone={outcome === "Win" ? "green" : "red"}>{outcome}</Badge>;
}

export function TradeSetupsTable({ trades }: { trades: TradeSetup[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="py-2 pr-4 font-medium">Symbol</th>
            <th className="py-2 pr-4 font-medium">Setup</th>
            <th className="py-2 pr-4 font-medium">Entry</th>
            <th className="py-2 pr-4 text-right font-medium">RS</th>
            <th className="py-2 pr-4 text-right font-medium">Rel Vol</th>
            <th className="py-2 pr-4 text-right font-medium">Size %</th>
            <th className="py-2 pr-4 text-right font-medium">Risk %</th>
            <th className="py-2 pr-4 font-medium">Result</th>
            <th className="py-2 pr-4 text-right font-medium">P&L %</th>
            <th className="py-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => (
            <tr key={`${t.symbol}-${t.date}-${i}`} className="border-b border-line last:border-0">
              <td className="py-2.5 pr-4 font-medium text-ink">{t.symbol}</td>
              <td className="py-2.5 pr-4">
                <Badge tone={SETUP_TONE[t.setup]}>{t.setup}</Badge>
              </td>
              <td className="py-2.5 pr-4 text-muted">{formatDate(t.date)}</td>
              <td className={clsx("py-2.5 pr-4 text-right", t.rsRating >= 85 ? "font-medium text-primary-bright" : "text-muted")}>
                {t.rsRating}
              </td>
              <td className="py-2.5 pr-4 text-right text-muted">{t.relativeVolume.toFixed(1)}x</td>
              <td className={clsx("py-2.5 pr-4 text-right", t.positionSizePercent >= 7 ? "font-medium text-coral" : "text-muted")}>
                {t.positionSizePercent.toFixed(1)}%
              </td>
              <td className="py-2.5 pr-4 text-right text-muted">{t.riskPercent.toFixed(1)}%</td>
              <td className="py-2.5 pr-4">
                <OutcomeBadge outcome={t.outcome} />
              </td>
              <td
                className={clsx(
                  "py-2.5 pr-4 text-right font-medium",
                  t.pnlPercent == null ? "text-muted" : t.pnlPercent >= 0 ? "text-primary-bright" : "text-coral"
                )}
              >
                {t.pnlPercent == null ? "–" : `${t.pnlPercent >= 0 ? "+" : ""}${t.pnlPercent.toFixed(1)}%`}
              </td>
              <td className="max-w-xs truncate py-2.5 text-muted" title={t.notes}>
                {t.notes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
