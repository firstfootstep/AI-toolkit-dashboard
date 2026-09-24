import { Card } from "@/components/ui/Card";
import { MarkdownBody } from "@/features/research/markdown";
import { TradingCoachRunButton } from "@/features/portfolio/TradingCoachRunButton";
import type { TradingCoachBrief } from "@/features/portfolio/tradingCoachBrief";

export function TradingCoachCard({ brief }: { brief: TradingCoachBrief | null }) {
  const dateLabel = brief
    ? new Date(brief.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <Card title="Trading Coach" action={<TradingCoachRunButton />}>
      <p className="mb-4 text-sm text-muted">
        อ่านสถิติจริงจาก Trade Setup Journal ด้านล่าง (win/loss ratio, ขนาด position ต่อคุณภาพ setup, ผล
        แยกตามวิธีเทรด) แล้วให้ Claude ชี้จุดที่ควรปรับปรุงเป็นภาษาไทย — ไม่มี tool ใดๆ ให้ Claude ใช้
        ในขั้นนี้ ตัวเลขทั้งหมดคำนวณด้วยโค้ดตายตัวก่อนส่งให้อ่านเท่านั้น
      </p>

      {dateLabel && <p className="mb-3 text-xs text-muted">วิเคราะห์ล่าสุด: {dateLabel}</p>}

      {!brief ? (
        <p className="text-xs text-muted/70">
          ยังไม่มีบทวิเคราะห์ — กดปุ่ม &quot;วิเคราะห์พฤติกรรมการเทรด&quot; ด้านบน หรือรัน
          trading-coach-agent จาก Claude Code
        </p>
      ) : (
        <div className="space-y-4">
          {brief.sections.map((section, i) => (
            <div key={i} className="rounded-[var(--radius-md)] border border-line bg-canvas p-4">
              <h4 className="mb-2 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
                {section.heading}
              </h4>
              <MarkdownBody body={section.body} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
