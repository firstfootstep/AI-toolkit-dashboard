import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function ResearchHtmlReportCard({ ticker, updatedAt }: { ticker: string; updatedAt: string }) {
  const src = `/api/research/report/${ticker}`;
  const dateLabel = new Date(updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card
      title={
        <span className="flex items-baseline gap-2">
          <span className="text-base">{ticker}</span>
          <span className="text-xs font-normal text-muted">Earnings preview — full report</span>
        </span>
      }
      action={
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium text-primary-bright hover:underline"
        >
          <ExternalLink size={12} aria-hidden />
          เปิดแบบเต็มหน้าจอ
        </a>
      }
    >
      <p className="mb-2 text-xs text-muted">Updated {dateLabel} · earnings-preview-th skill</p>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-line">
        <iframe src={src} className="h-[900px] w-full" title={`${ticker} earnings preview report`} />
      </div>
    </Card>
  );
}
