import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/quotes";
import { getNews } from "@/lib/news";
import { dateKeyInCalendarZone } from "@/lib/economicCalendar";
import { generateMarketSummary } from "@/lib/marketCommentaryAgent";
import { writeMarketBrief } from "@/features/markets/marketBrief";
import { MARKET_REGIONS } from "@/features/markets/pulseSymbols";

export const dynamic = "force-dynamic";

// The Market & News page's "สร้างสรุปตลาดวันนี้" button. Like /api/research,
// this is one of the few routes in this app that calls Claude and costs
// real usage per request — see README's "Research: calling Claude live"
// section (this route runs the same way, via the `claude` CLI).
export async function POST() {
  try {
    const indexSymbols = MARKET_REGIONS.flatMap((r) => r.items.map((i) => i.symbol));
    const [quotes, news] = await Promise.all([getQuotes(indexSymbols), getNews()]);

    const quotesBySymbol = new Map(quotes.quotes.map((q) => [q.symbol, q]));
    const indexQuotes = MARKET_REGIONS.flatMap((r) => r.items).map((i) => ({
      label: i.label,
      quote: quotesBySymbol.get(i.symbol),
    }));

    const markdown = await generateMarketSummary(news.items, indexQuotes);
    const dateKey = dateKeyInCalendarZone(new Date());
    const brief = writeMarketBrief(dateKey, markdown);

    return NextResponse.json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Market summary agent failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
