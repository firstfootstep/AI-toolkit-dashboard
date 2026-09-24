import clsx from "clsx";
import { Badge } from "@/components/ui/Badge";
import { EpsChart } from "@/features/research/EpsChart";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { EarningsQuarter } from "@/lib/earnings";
import type { ScannerRow } from "@/features/scanner/types";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-canvas p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-ui)] text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

function ReturnTile({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-canvas p-2.5 text-center">
      <p className="text-[11px] text-muted">{label}</p>
      <p
        className={clsx(
          "mt-1 text-sm font-semibold",
          value == null ? "text-muted" : value >= 0 ? "text-primary-bright" : "text-coral"
        )}
      >
        {value != null ? formatPercent(value) : "—"}
      </p>
    </div>
  );
}

// "ภาพรวมพื้นฐาน" — RS score, market cap, P/E, dividend yield, all from
// the TradingView-tier ScannerRow the Chart page looks up for this symbol
// (same fields/RS methodology as Scanner). `row` is undefined whenever the
// symbol isn't in the top-1000-by-market-cap universe fetched for its
// exchange, or the TradingView tier is unavailable — every tile just shows
// "—" rather than a wrong number.
export function FundamentalsOverview({ row, currency }: { row?: ScannerRow; currency: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-paper p-4">
      <h4 className="mb-3 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
        ภาพรวมพื้นฐาน
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="RS (1-99)" value={row?.rsScore != null ? String(Math.round(row.rsScore)) : "—"} />
        <StatTile
          label="มูลค่าตลาด"
          value={row?.marketCap != null ? formatCurrency(row.marketCap, currency).replace(/\.\d+$/, "") : "—"}
        />
        <StatTile label="P/E" value={row?.peRatio != null ? row.peRatio.toFixed(2) : "—"} />
        <StatTile
          label="ปันผล"
          value={row?.divYieldPercent != null ? `${row.divYieldPercent.toFixed(2)}%` : "—"}
        />
      </div>
    </div>
  );
}

export function PriceReturns({ row }: { row?: ScannerRow }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-paper p-4">
      <h4 className="mb-3 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
        ผลตอบแทนราคา
      </h4>
      <div className="grid grid-cols-5 gap-1.5">
        <ReturnTile label="1W" value={row?.perfWeekPercent} />
        <ReturnTile label="1M" value={row?.perf1MPercent} />
        <ReturnTile label="3M" value={row?.perf3MPercent} />
        <ReturnTile label="6M" value={row?.perf6MPercent} />
        <ReturnTile label="1Y" value={row?.perfYearPercent} />
      </div>
    </div>
  );
}

// "งบล่าสุด" — this app has no source for Thai-broker-style net-profit
// figures (บาท), only EPS actual/estimate per quarter (src/lib/earnings.ts,
// same Yahoo tier the Research page's EPS chart uses), so this shows QoQ
// change and beat/miss-vs-estimate on that instead of a net-profit number
// we can't source. True YoY isn't computable either — the trailing window
// here is sequential quarters, not same-quarter-last-year.
export function LatestEarnings({ quarters }: { quarters: EarningsQuarter[] }) {
  const reported = quarters.filter((q) => q.epsActual != null);
  const latest = reported[reported.length - 1];
  const prev = reported[reported.length - 2];
  if (!latest) return null;

  const qoq = prev?.epsActual ? ((latest.epsActual! - prev.epsActual) / Math.abs(prev.epsActual)) * 100 : undefined;
  const surprise = latest.epsEstimate
    ? ((latest.epsActual! - latest.epsEstimate) / Math.abs(latest.epsEstimate)) * 100
    : undefined;

  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-paper p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
          EPS รายไตรมาสล่าสุด
        </h4>
        <span className="text-[11px] text-muted">{latest.label}</span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="font-[family-name:var(--font-ui)] text-lg font-semibold text-ink">
          ${latest.epsActual!.toFixed(2)}
        </p>
        {qoq != null && (
          <Badge tone={qoq >= 0 ? "green" : "red"}>
            QoQ {qoq >= 0 ? "+" : ""}
            {qoq.toFixed(1)}%
          </Badge>
        )}
        {surprise != null && (
          <Badge tone={surprise >= 0 ? "green" : "red"}>
            {surprise >= 0 ? "Beat" : "Miss"} {surprise >= 0 ? "+" : ""}
            {surprise.toFixed(1)}%
          </Badge>
        )}
      </div>
      <EpsChart quarters={quarters} />
    </div>
  );
}
