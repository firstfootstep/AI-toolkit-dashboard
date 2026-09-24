import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MarkdownBody } from "@/features/research/markdown";
import type { TradingCoachBrief } from "@/features/portfolio/tradingCoachBrief";

// Compact, read-only summary for the Dashboard overview — the run button
// and full section-by-section brief live on the Portfolio page
// (TradingCoachCard), where the underlying Trade Setup Journal table also
// is. This just shows the "ภาพรวม" (overview) section, if one exists, plus
// a link to see the rest.
export function TradingCoachSummary({ brief }: { brief: TradingCoachBrief | null }) {
  const overview = brief?.sections.find((s) => s.heading.includes("ภาพรวม"));

  return (
    <Card
      title="Trading Coach"
      action={brief && <Badge tone="blue">{brief.date}</Badge>}
    >
      {!brief || !overview ? (
        <p className="text-xs text-muted/70">
          ยังไม่มีบทวิเคราะห์พฤติกรรมการเทรด — ไปที่หน้า{" "}
          <Link href="/portfolio" className="font-medium text-primary-bright underline underline-offset-2">
            Portfolio
          </Link>{" "}
          แล้วกด &quot;วิเคราะห์พฤติกรรมการเทรด&quot;
        </p>
      ) : (
        <div className="space-y-3">
          <MarkdownBody body={overview.body} />
          <Link
            href="/portfolio"
            className="inline-block text-xs font-medium text-primary-bright underline underline-offset-2"
          >
            ดูบทวิเคราะห์ฉบับเต็มที่หน้า Portfolio →
          </Link>
        </div>
      )}
    </Card>
  );
}
