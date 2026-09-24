import { Crown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MarkdownBody } from "@/features/research/markdown";
import type { LegendBrief } from "@/features/legend-scanner/data";
import { LEGEND_META, type LegendKey } from "@/lib/legendScanner";
import { LegendAvatar } from "@/features/legend-scanner/LegendAvatar";

function isLegendKey(value: string): value is LegendKey {
  return value in LEGEND_META;
}

export function LegendBriefCard({ brief }: { brief: LegendBrief }) {
  const knownLegend = isLegendKey(brief.legend) ? brief.legend : null;
  const label = knownLegend ? LEGEND_META[knownLegend].label : brief.legend;

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {knownLegend ? <LegendAvatar legend={knownLegend} size="sm" /> : <Crown size={16} className="text-primary-bright" />}
          {label}
        </span>
      }
      action={<Badge tone="blue">{brief.date || "ไม่ทราบวันที่"}</Badge>}
    >
      <div className="space-y-5">
        {brief.sections.map((section, i) => (
          <div key={`${brief.legend}-${i}`} className="rounded-[var(--radius-md)] border border-line bg-canvas p-4">
            <h4 className="mb-2 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
              {section.heading}
            </h4>
            <MarkdownBody body={section.body} />
          </div>
        ))}
      </div>
    </Card>
  );
}
