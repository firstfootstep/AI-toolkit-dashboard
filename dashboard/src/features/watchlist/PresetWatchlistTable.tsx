import Link from "next/link";
import clsx from "clsx";
import type { ScannerRow } from "@/features/scanner/types";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { WatchlistPreset } from "@/features/watchlist/scanPresets";

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

// The one metric that explains why a row made this preset's top 10 — same
// field/threshold as ScannerTable.tsx's EXTRA_COLUMNS primary column for
// the matching preset. Compact list only has room for one, not the 1-2
// columns the full Scanner table shows.
function primaryMetric(key: WatchlistPreset["key"], r: ScannerRow): string {
  switch (key) {
    case "near52w":
      return r.fiftyTwoWeekHigh ? `${((r.price / r.fiftyTwoWeekHigh - 1) * 100).toFixed(2)}%` : "—";
    case "volumeSurge":
      return r.relativeVolume ? `${r.relativeVolume.toFixed(2)}x` : "—";
    case "revenueGrowth":
      return r.revenueGrowthPercent != null ? formatPercent(r.revenueGrowthPercent) : "—";
    case "rsHigh":
      return r.rsScore != null ? String(Math.round(r.rsScore)) : "—";
    case "valueQuality":
      return r.roePercent != null ? formatPercent(r.roePercent) : "—";
    case "analystBuy":
      return r.analystRating != null ? r.analystRating.toFixed(2) : "—";
    case "momentum1M":
      return r.perf1MPercent != null ? formatPercent(r.perf1MPercent) : "—";
    case "dividendValue":
      return r.divYieldPercent != null ? formatPercent(r.divYieldPercent) : "—";
    case "earningsSoon":
      return r.upcomingEarningsDate ? formatShortDate(r.upcomingEarningsDate) : "—";
  }
}

// Column header for the metric column — names what the number in each row
// actually means, since "0.85%"/"92" alone (with no header) reads as
// unlabeled noise.
function metricLabel(key: WatchlistPreset["key"]): string {
  switch (key) {
    case "near52w":
      return "ห่างจากจุดสูงสุด";
    case "volumeSurge":
      return "โวลุ่ม/ค่าเฉลี่ย 10 วัน";
    case "revenueGrowth":
      return "รายได้โต YoY";
    case "rsHigh":
      return "RS Score";
    case "valueQuality":
      return "ROE";
    case "analystBuy":
      return "Analyst rating";
    case "momentum1M":
      return "Perf % (1M)";
    case "dividendValue":
      return "Div yield %";
    case "earningsSoon":
      return "วันประกาศงบ";
  }
}

export function PresetWatchlistTable({ rows, presetKey }: { rows: ScannerRow[]; presetKey: WatchlistPreset["key"] }) {
  if (rows.length === 0) {
    return <p className="py-2 text-xs text-muted">ไม่มีหุ้นที่เข้าเงื่อนไขนี้ตอนนี้</p>;
  }

  return (
    <div className="divide-y divide-line">
      <div className="flex items-center gap-2 pb-1.5 text-[11px] font-medium text-muted">
        <span className="w-1.5 flex-none" />
        <span className="min-w-0 flex-1">หุ้น</span>
        <span className="w-16 flex-none text-right">ราคา</span>
        <span className="w-14 flex-none text-right">%chg</span>
        <span className="flex-none text-right">{metricLabel(presetKey)}</span>
      </div>
      {rows.map((r) => {
        const up = r.change >= 0;
        return (
          <Link
            key={r.ticker}
            href={`/chart?symbol=${r.symbol}${r.exchange ? `&exchange=${r.exchange}` : ""}`}
            className="flex items-center gap-2 py-1.5 hover:bg-ink/4"
            title={r.name}
          >
            <span className={clsx("h-1.5 w-1.5 flex-none rounded-full", up ? "bg-primary-bright" : "bg-coral")} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{r.symbol}</span>
            <span className="w-16 flex-none text-right text-[13px] text-ink">
              {formatCurrency(r.price, r.currency)}
            </span>
            <span className={clsx("w-14 flex-none text-right text-[13px] font-medium", up ? "text-primary-bright" : "text-coral")}>
              {formatPercent(r.changePercent)}
            </span>
            <span className="flex-none text-right text-[13px] font-semibold text-ink">{primaryMetric(presetKey, r)}</span>
          </Link>
        );
      })}
    </div>
  );
}
