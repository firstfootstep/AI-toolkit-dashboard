import clsx from "clsx";
import { Sparkline } from "@/components/ui/Sparkline";
import { formatNumber, formatPercent } from "@/lib/format";
import type { Quote } from "@/types/market";
import type { MarketRegion } from "@/features/markets/pulseSymbols";

export function IndexGrid({
  regions,
  quotesBySymbol,
}: {
  regions: MarketRegion[];
  quotesBySymbol: Map<string, Quote>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {regions.map((group) => (
        <div key={group.region} className="rounded-[var(--radius-md)] border border-line bg-paper p-3">
          <h4 className="mb-2 border-b border-line pb-2 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
            {group.region}
          </h4>
          <div className="divide-y divide-line">
            {group.items.map((item) => {
              const quote = quotesBySymbol.get(item.symbol);
              if (!quote) return null;
              const up = quote.changePercent >= 0;

              return (
                <div key={item.symbol} className="flex items-center gap-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{item.label}</p>
                    <p className="text-[11px] text-muted">{item.code}</p>
                  </div>
                  <div className="h-6 w-12 flex-none">
                    <Sparkline data={quote.history} tone={up ? "up" : "down"} />
                  </div>
                  <div className="flex-none text-right">
                    <p className="font-[family-name:var(--font-ui)] text-[13px] font-semibold text-ink">
                      {formatNumber(quote.price)}
                    </p>
                    <p className={clsx("text-[11px] font-medium", up ? "text-primary-bright" : "text-coral")}>
                      {formatPercent(quote.changePercent)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
