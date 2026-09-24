import clsx from "clsx";
import { AlertCircle, Globe2, Landmark, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { MarketSummaryRefreshButton } from "@/features/markets/MarketSummaryRefreshButton";
import { MarkdownBody } from "@/features/research/markdown";
import { formatNumber, formatPercent } from "@/lib/format";
import type { MarketBrief } from "@/features/markets/marketBrief";
import type { DataSourceStatus, Quote } from "@/types/market";

export interface SummaryIndex {
  label: string;
  quote?: Quote;
}

function IndexTile({ label, quote }: SummaryIndex) {
  const up = quote ? quote.changePercent >= 0 : true;
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-canvas p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-ui)] text-base font-semibold text-ink">
        {quote ? formatNumber(quote.price) : "—"}
      </p>
      {quote && (
        <p className={clsx("text-xs font-medium", up ? "text-primary-bright" : "text-coral")}>
          {formatPercent(quote.changePercent)}
        </p>
      )}
    </div>
  );
}

function sectionIcon(heading: string) {
  if (heading.includes("ขับเคลื่อน")) return <TrendingUp size={13} />;
  if (heading.includes("ไม่พบ")) return <AlertCircle size={13} />;
  if (heading.includes("เศรษฐกิจ") || heading.includes("การเมือง")) return <Landmark size={13} />;
  return <Globe2 size={13} />;
}

export function MarketSummaryCard({
  brief,
  usIndices,
  intlIndices,
  source,
}: {
  brief: MarketBrief | null;
  usIndices: SummaryIndex[];
  intlIndices: SummaryIndex[];
  source: DataSourceStatus;
}) {
  const dateLabel = brief
    ? new Date(brief.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <Card
      title="สรุปตลาดวันนี้"
      action={
        <div className="flex items-center gap-2">
          <DataSourceBadge source={source} />
          <MarketSummaryRefreshButton />
        </div>
      }
    >
      <div className="space-y-4">
        {dateLabel && <p className="text-xs text-muted">อัปเดตล่าสุด: ปิดตลาด {dateLabel}</p>}

        {brief?.headline && (
          <div className="rounded-[var(--radius-md)] border border-line bg-canvas p-4">
            <p className="text-sm leading-relaxed text-ink">{brief.headline}</p>
          </div>
        )}

        <div>
          <h4 className="mb-2 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
            ตลาดสหรัฐฯ
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {usIndices.map((idx) => (
              <IndexTile key={idx.label} label={idx.label} quote={idx.quote} />
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-2 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
            ยุโรป & เอเชีย (รวม SET ไทย)
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {intlIndices.map((idx) => (
              <IndexTile key={idx.label} label={idx.label} quote={idx.quote} />
            ))}
          </div>
        </div>

        {brief?.sections.map((section) => (
          <div key={section.heading} className="rounded-[var(--radius-md)] border border-line bg-canvas p-4">
            <h4 className="mb-2 flex items-center gap-1.5 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
              {sectionIcon(section.heading)}
              {section.heading}
            </h4>
            <MarkdownBody body={section.body} />
          </div>
        ))}

        {!brief && (
          <p className="text-xs text-muted">
            ยังไม่มีสรุปข่าวตลาดวันนี้ — กดปุ่ม &quot;สร้างสรุปตลาดวันนี้&quot; ด้านบน หรือรัน
            market-commentary-agent จาก Claude Code เอง แล้วมันจะขึ้นตรงนี้อัตโนมัติ
          </p>
        )}
      </div>
    </Card>
  );
}
