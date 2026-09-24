import { Search } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { getResearchBriefs, getResearchHtmlReports } from "@/features/research/data";
import { ResearchBriefCard } from "@/features/research/ResearchBriefCard";
import { ResearchHtmlReportCard } from "@/features/research/ResearchHtmlReportCard";
import { ResearchAgentForm } from "@/features/research/ResearchAgentForm";
import { getQuoteDetail } from "@/lib/quotes";
import { getOhlc } from "@/lib/ohlc";
import { getEarningsHistory } from "@/lib/earnings";
import { getSymbolFundamentals } from "@/lib/symbolFundamentals";

// Reads research-briefs/ fresh on every request so a brief the
// earnings-preview-agent just wrote shows up without restarting the server.
export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const briefs = getResearchBriefs();
  const htmlReports = getResearchHtmlReports();

  // Briefs only store the bare ticker (see symbolToFilename in data.ts), so
  // this always looks it up as a US symbol — same limitation the agent's
  // brief itself has (it doesn't record an exchange). Both getQuoteDetail
  // and getOhlc already fall back to mock on any failure, so this never
  // throws even for a ticker Yahoo doesn't recognize.
  const briefsWithMarketData = await Promise.all(
    briefs.map(async (brief) => {
      const [
        { quote, source: quoteSource },
        { bars, source: ohlcSource },
        { quarters: earningsQuarters, source: earningsSource },
        { fundamentals, source: fundamentalsSource },
      ] = await Promise.all([
        getQuoteDetail(brief.ticker),
        getOhlc(brief.ticker),
        getEarningsHistory(brief.ticker),
        getSymbolFundamentals(brief.ticker),
      ]);
      return { brief, quote, quoteSource, bars, ohlcSource, earningsQuarters, earningsSource, fundamentals, fundamentalsSource };
    })
  );

  return (
    <>
      <Topbar title="Research" />
      <main className="flex-1 space-y-6 overflow-y-auto p-8">
        <ResearchAgentForm />

        {htmlReports.map((report) => (
          <ResearchHtmlReportCard key={report.ticker} ticker={report.ticker} updatedAt={report.updatedAt} />
        ))}

        {briefsWithMarketData.length === 0 && htmlReports.length === 0 ? (
          <Card>
            <ComingSoon
              icon={<Search size={28} />}
              title="No research briefs yet"
              description="Type a symbol above, run earnings-preview-agent from Claude Code, or run the earnings-preview-th skill (/earnings-preview-th) — all three land in research-briefs/ and show up here."
              hint='Try: "NVDA" in the box above, or "Use earnings-preview-agent to research NVDA." in Claude Code.'
            />
          </Card>
        ) : (
          briefsWithMarketData.map(
            ({ brief, quote, quoteSource, bars, ohlcSource, earningsQuarters, earningsSource, fundamentals, fundamentalsSource }) => (
              <ResearchBriefCard
                key={brief.ticker}
                brief={brief}
                quote={quote}
                quoteSource={quoteSource}
                bars={bars}
                ohlcSource={ohlcSource}
                earningsQuarters={earningsQuarters}
                earningsSource={earningsSource}
                fundamentals={fundamentals}
                fundamentalsSource={fundamentalsSource}
              />
            )
          )
        )}
      </main>
    </>
  );
}
