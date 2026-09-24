import { Building2, Clock, ExternalLink, HelpCircle, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { CandlestickChart } from "@/features/markets/CandlestickChart";
import { EpsChart } from "@/features/research/EpsChart";
import { FundamentalsStrip } from "@/features/research/FundamentalsStrip";
import { MarkdownBody, Table, parseChartFenceBody, splitIntoBlocks } from "@/features/research/markdown";
import type { Block } from "@/features/research/markdown";
import { MiniBarChart, MiniLineChart } from "@/features/research/MiniChart";
import { formatCurrency, formatPercent, formatSigned } from "@/lib/format";
import type { ResearchBrief, ResearchBriefSection } from "@/features/research/data";
import type { EarningsQuarter } from "@/lib/earnings";
import type { SymbolFundamentals } from "@/lib/symbolFundamentals";
import type { DataSourceStatus, OhlcBar, QuoteDetail } from "@/types/market";

interface ResearchBriefCardProps {
  brief: ResearchBrief;
  quote?: QuoteDetail;
  quoteSource?: DataSourceStatus;
  bars?: OhlcBar[];
  ohlcSource?: DataSourceStatus;
  earningsQuarters?: EarningsQuarter[];
  earningsSource?: DataSourceStatus;
  fundamentals?: SymbolFundamentals | null;
  fundamentalsSource?: DataSourceStatus;
}

type SectionKind = "snapshot" | "bull" | "bear" | "timeline" | "questions" | "sources" | "earningsHistory" | "default";

function kindOf(heading: string): SectionKind {
  const h = heading.toLowerCase();
  if (h.includes("snapshot")) return "snapshot";
  if (h.includes("bull")) return "bull";
  if (h.includes("bear")) return "bear";
  if (h.includes("recent") || h.includes("development")) return "timeline";
  // "Open questions" (English, symbol-research-agent) / "factors to watch"
  // (current heading) plus the Thai headings both old briefs on disk
  // ("คำถามที่ยังไม่มีคำตอบ") and new ones ("ปัจจัยที่ต้องติดตามต่อ") use —
  // renamed to read as forward-looking catalysts rather than research gaps.
  if (
    h.includes("open question") ||
    h.includes("factors to watch") ||
    heading.includes("คำถามที่ยังไม่มีคำตอบ") ||
    heading.includes("ติดตามต่อ")
  )
    return "questions";
  if (h.includes("source")) return "sources";
  if (heading.includes("ผลประกอบการย้อนหลัง")) return "earningsHistory";
  return "default";
}

function MiniCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-[var(--radius-md)] border border-line bg-canvas p-3">
      <h5 className="mb-2 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h5>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// Every prose section renders inside the same bordered box, regardless of
// kind — a page mixing boxed and un-boxed sections read as inconsistent
// (some content "important enough" for a card, some not), so every section
// here is a card of one flavor or another. Only bull/bear keep their own
// distinctly-colored CaseCard below, since that color contrast is itself
// the point of putting them side by side.
function SectionBox({
  heading,
  icon,
  children,
}: {
  heading: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-canvas p-4">
      <SectionHeading icon={icon}>{heading}</SectionHeading>
      {children}
    </div>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SourceLinks({ body }: { body: string }) {
  const urls = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (urls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink-soft transition-colors duration-200 hover:border-primary-bright hover:text-primary-bright"
        >
          <ExternalLink size={11} className="text-muted" aria-hidden />
          {hostnameOf(url)}
        </a>
      ))}
    </div>
  );
}

function CaseCard({
  section,
  tone,
}: {
  section: ResearchBriefSection;
  tone: "bull" | "bear";
}) {
  const isBull = tone === "bull";
  return (
    <div
      className={
        "rounded-[var(--radius-md)] border p-4 " +
        (isBull ? "border-primary-bright/25 bg-primary-bright/6" : "border-coral/25 bg-coral/6")
      }
    >
      <div className="mb-2.5 flex items-center gap-2">
        {isBull ? (
          <TrendingUp size={15} className="text-primary-bright" aria-hidden />
        ) : (
          <TrendingDown size={15} className="text-coral" aria-hidden />
        )}
        <h4
          className={
            "font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide " +
            (isBull ? "text-primary-bright" : "text-coral")
          }
        >
          {section.heading}
        </h4>
      </div>
      <MarkdownBody body={section.body} />
    </div>
  );
}

export function ResearchBriefCard({
  brief,
  quote,
  quoteSource,
  bars,
  ohlcSource,
  earningsQuarters,
  earningsSource,
  fundamentals,
  fundamentalsSource,
}: ResearchBriefCardProps) {
  const dateLabel = new Date(brief.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const up = quote ? quote.change >= 0 : true;
  const hasChart = Boolean(bars && bars.length > 1);

  const sections = brief.sections;
  const rendered: React.ReactNode[] = [];

  let earningsTableBlock: Extract<Block, { type: "table" }> | undefined;
  let earningsDiffChartBlock: Extract<Block, { type: "chart" }> | undefined;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const kind = kindOf(section.heading);

    if (kind === "earningsHistory") {
      const blocks = splitIntoBlocks(section.body);
      earningsTableBlock = blocks.find((b): b is Extract<Block, { type: "table" }> => b.type === "table");
      earningsDiffChartBlock = blocks.find((b): b is Extract<Block, { type: "chart" }> => b.type === "chart");
      continue;
    }

    if (kind === "bull" && kindOf(sections[i + 1]?.heading ?? "") === "bear") {
      const bear = sections[i + 1];
      rendered.push(
        <div key={section.heading} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CaseCard section={section} tone="bull" />
          <CaseCard section={bear} tone="bear" />
        </div>
      );
      i++; // consumed the bear section too
      continue;
    }

    if (kind === "bull" || kind === "bear") {
      rendered.push(<CaseCard key={section.heading} section={section} tone={kind} />);
      continue;
    }

    if (kind === "snapshot") {
      rendered.push(
        <SectionBox key={section.heading} heading={section.heading} icon={<Building2 size={13} />}>
          <p className="text-[15px] leading-relaxed text-ink">{section.body}</p>
        </SectionBox>
      );
      continue;
    }

    if (kind === "timeline") {
      rendered.push(
        <SectionBox key={section.heading} heading={section.heading} icon={<Clock size={13} />}>
          <MarkdownBody body={section.body} />
        </SectionBox>
      );
      continue;
    }

    if (kind === "questions") {
      rendered.push(
        <SectionBox key={section.heading} heading={section.heading} icon={<HelpCircle size={13} />}>
          <MarkdownBody body={section.body} />
        </SectionBox>
      );
      continue;
    }

    if (kind === "sources") {
      rendered.push(
        <SectionBox key={section.heading} heading={section.heading} icon={<ExternalLink size={13} />}>
          <SourceLinks body={section.body} />
        </SectionBox>
      );
      continue;
    }

    rendered.push(
      <SectionBox key={section.heading} heading={section.heading}>
        <MarkdownBody body={section.body} />
      </SectionBox>
    );
  }

  return (
    <Card
      title={
        <span className="flex items-baseline gap-2">
          <span className="text-base">{brief.ticker}</span>
          {quote && quote.name !== brief.ticker && (
            <span className="text-xs font-normal text-muted">{quote.name}</span>
          )}
        </span>
      }
      action={<span className="text-xs text-muted">Updated {dateLabel}</span>}
    >
      <div className="space-y-5">
        {quote && (
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Stat label="Price" value={formatCurrency(quote.price, quote.currency)} />
              <Stat
                label="Change"
                value={formatSigned(quote.change, quote.currency)}
                delta={formatPercent(quote.changePercent)}
                tone={up ? "up" : "down"}
              />
              {quote.dayHigh !== undefined && <Stat label="Day high" value={formatCurrency(quote.dayHigh, quote.currency)} />}
              {quote.dayLow !== undefined && <Stat label="Day low" value={formatCurrency(quote.dayLow, quote.currency)} />}
            </div>
            {quoteSource && <DataSourceBadge source={quoteSource} />}
          </div>
        )}

        {fundamentals && (
          <FundamentalsStrip fundamentals={fundamentals} source={fundamentalsSource ?? "tradingview"} />
        )}

        {hasChart && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
                Price chart
              </h4>
              {ohlcSource && <DataSourceBadge source={ohlcSource} />}
            </div>
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-line">
              <CandlestickChart bars={bars!} />
            </div>
          </div>
        )}

        {earningsQuarters && earningsQuarters.length > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <h4 className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
                ผลประกอบการ EPS
              </h4>
              {earningsSource && <DataSourceBadge source={earningsSource} />}
            </div>
            <p className="mb-3 text-xs text-muted">
              Trailing reported quarters from Yahoo Finance, plus the next unreported quarter&apos;s analyst estimate.
            </p>
            <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-3">
              <MiniCard title="EPS — Estimate vs Actual">
                <EpsChart quarters={earningsQuarters} />
              </MiniCard>
              {earningsTableBlock && (
                <MiniCard title="ผลประกอบการย้อนหลัง">
                  <Table header={earningsTableBlock.header} rows={earningsTableBlock.rows} keyBase="earnings-history-table" />
                </MiniCard>
              )}
              {earningsDiffChartBlock && (() => {
                const { title, points } = parseChartFenceBody(earningsDiffChartBlock.body);
                if (points.length === 0) return null;
                return (
                  <MiniCard title={title ?? "ผลต่าง EPS จริง vs คาดการณ์ (%)"}>
                    {earningsDiffChartBlock.kind === "bar" ? (
                      <MiniBarChart points={points} />
                    ) : (
                      <MiniLineChart points={points} />
                    )}
                  </MiniCard>
                );
              })()}
            </div>
          </div>
        )}

        {rendered}
      </div>
    </Card>
  );
}

function SectionHeading({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h4 className="mb-2 flex items-center gap-1.5 font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
      {icon}
      {children}
    </h4>
  );
}
