import { Badge } from "@/components/ui/Badge";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import type { SymbolFundamentals } from "@/lib/symbolFundamentals";
import type { DataSourceStatus } from "@/types/market";

// TradingView's aggregate rating thresholds (-1 strong sell .. +1 strong
// buy) — same bands TradingView's own site uses for the Strong Buy/Buy/
// Neutral/Sell/Strong Sell label. "neutral" (gray) for Hold keeps it
// visually distinct from Sell — Badge's "amber" tone is actually the same
// coral as "red", so it wouldn't read as a middle ground.
function ratingLabel(v: number): { label: string; tone: "green" | "neutral" | "red" } {
  if (v >= 0.5) return { label: "Strong Buy", tone: "green" };
  if (v >= 0.1) return { label: "Buy", tone: "green" };
  if (v > -0.1) return { label: "Hold", tone: "neutral" };
  if (v > -0.5) return { label: "Sell", tone: "red" };
  return { label: "Strong Sell", tone: "red" };
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-canvas px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

export function FundamentalsStrip({
  fundamentals,
  source,
}: {
  fundamentals: SymbolFundamentals;
  source: DataSourceStatus;
}) {
  const tiles: { label: string; value: string }[] = [];
  if (fundamentals.peRatio != null) tiles.push({ label: "P/E", value: `${fundamentals.peRatio.toFixed(1)}x` });
  if (fundamentals.pegRatio != null) tiles.push({ label: "PEG", value: fundamentals.pegRatio.toFixed(2) });
  if (fundamentals.revenueGrowthPercent != null)
    tiles.push({ label: "Revenue growth (YoY)", value: `${fundamentals.revenueGrowthPercent.toFixed(1)}%` });
  if (fundamentals.epsDilGrowthPercent != null)
    tiles.push({ label: "EPS growth (YoY)", value: `${fundamentals.epsDilGrowthPercent.toFixed(1)}%` });
  if (fundamentals.roePercent != null) tiles.push({ label: "ROE", value: `${fundamentals.roePercent.toFixed(1)}%` });
  if (fundamentals.divYieldPercent != null)
    tiles.push({ label: "Div yield", value: `${fundamentals.divYieldPercent.toFixed(2)}%` });
  if (fundamentals.beta != null) tiles.push({ label: "Beta", value: fundamentals.beta.toFixed(2) });
  if (fundamentals.perfYearPercent != null)
    tiles.push({ label: "Perf (1Y)", value: `${fundamentals.perfYearPercent.toFixed(1)}%` });
  if (fundamentals.marketCap != null)
    tiles.push({ label: "Market cap", value: `$${(fundamentals.marketCap / 1e9).toFixed(1)}B` });

  const rating = fundamentals.analystRating != null ? ratingLabel(fundamentals.analystRating) : null;
  if (tiles.length === 0 && !rating) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
          ข้อมูลพื้นฐาน
        </h4>
        <div className="flex items-center gap-2">
          {rating && <Badge tone={rating.tone}>Analyst: {rating.label}</Badge>}
          <DataSourceBadge source={source} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tiles.map((t) => (
          <Tile key={t.label} label={t.label} value={t.value} />
        ))}
      </div>
    </div>
  );
}
