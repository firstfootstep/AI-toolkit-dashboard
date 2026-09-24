import type { Quote } from "@/types/market";
import { MARKET_PULSE_SYMBOLS } from "@/features/markets/pulseSymbols";
import { Sparkline } from "@/components/ui/Sparkline";
import { formatPercent } from "@/lib/format";

export function MarketPulse({ quotes }: { quotes: Quote[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {MARKET_PULSE_SYMBOLS.map((meta) => {
        const q = quotes.find((x) => x.symbol === meta.symbol);
        const up = (q?.change ?? 0) >= 0;
        return (
          <div key={meta.symbol} className="rounded-[var(--radius-sm)] border border-line p-3">
            <p className="text-xs font-medium text-muted" title={meta.hint}>
              {meta.label}
            </p>
            <p className={"mt-1 text-lg font-semibold " + (up ? "text-primary-bright" : "text-coral")}>
              {q ? formatPercent(q.changePercent) : "—"}
            </p>
            <p className="text-xs text-muted">{q?.price.toFixed(2) ?? "—"}</p>
            <div className="mt-2 h-8">
              <Sparkline data={q?.history ?? [0, 0]} tone={up ? "up" : "down"} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
