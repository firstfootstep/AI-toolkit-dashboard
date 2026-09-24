import type { NextRequest } from "next/server";
import { readResearchHtmlReport } from "@/features/research/data";

// Serves an earnings-preview-th HTML report (research-briefs/<TICKER>.html)
// as a plain document — used both as the Research page's iframe src and as
// a direct "open full screen" link, so the self-contained doc's own
// CSS/JS runs unmodified instead of being inlined into the dashboard's DOM.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const html = readResearchHtmlReport(ticker);
  if (!html) return new Response("Not found", { status: 404 });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
