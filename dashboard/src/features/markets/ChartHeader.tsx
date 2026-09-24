import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import { CandlestickChart } from "@/features/markets/CandlestickChart";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { OhlcBar } from "@/types/market";

export function ChartHeader({
  symbol,
  name,
  exchangeLabel,
  sector,
  price,
  change,
  changePercent,
  currency,
  bars,
  tvUrl,
  sidebar,
}: {
  symbol: string;
  name?: string;
  exchangeLabel?: string;
  sector?: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  bars: OhlcBar[];
  tvUrl: string;
  // Server-rendered sidebar content (fundamentals/returns/EPS) — passed
  // through as children so this component's own layout owns the two-column
  // chart/sidebar grid.
  sidebar: React.ReactNode;
}) {
  const up = change >= 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary-bright/12 font-[family-name:var(--font-ui)] text-base font-bold text-primary-bright">
            {symbol.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-ui)] text-xl font-bold text-ink">{symbol}</span>
              {exchangeLabel && (
                <span className="rounded-full bg-ink/6 px-2 py-0.5 text-[11px] font-semibold text-muted">
                  {exchangeLabel}
                </span>
              )}
              <span className="font-[family-name:var(--font-ui)] text-lg font-semibold text-ink">
                {formatCurrency(price, currency)}
              </span>
              <span className={clsx("text-sm font-medium", up ? "text-primary-bright" : "text-coral")}>
                {formatPercent(changePercent)}
              </span>
            </div>
            {name && name !== symbol && <p className="mt-0.5 text-sm text-ink-soft">{name}</p>}
            {sector && <p className="mt-0.5 text-xs text-muted">{sector}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors duration-200 hover:bg-ink/6"
          >
            <ExternalLink size={13} aria-hidden />
            View on TradingView Web
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="min-h-[420px] overflow-hidden rounded-[var(--radius-md)] border border-line">
          <CandlestickChart bars={bars} className="h-full min-h-[420px] w-full" />
        </div>
        <div className="space-y-4">{sidebar}</div>
      </div>
    </div>
  );
}
