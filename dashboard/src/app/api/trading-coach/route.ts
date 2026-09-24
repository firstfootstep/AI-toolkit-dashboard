import { NextResponse } from "next/server";
import { computeTradingCoachStats } from "@/lib/tradingCoachStats";
import { generateTradingCoachBrief } from "@/lib/tradingCoachAgent";
import { writeTradingCoachBrief } from "@/features/portfolio/tradingCoachBrief";
import { dateKeyInCalendarZone } from "@/lib/economicCalendar";

export const dynamic = "force-dynamic";

// The Portfolio page's "วิเคราะห์พฤติกรรมการเทรด" button. Like
// /api/market-summary and /api/research, this calls Claude live (real
// usage per request) but with no tools — see tradingCoachAgent.ts's doc
// comment for why.
export async function POST() {
  try {
    const stats = computeTradingCoachStats();
    const markdown = await generateTradingCoachBrief(stats);
    const dateKey = dateKeyInCalendarZone(new Date());
    const brief = writeTradingCoachBrief(dateKey, markdown);

    return NextResponse.json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Trading coach agent failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
