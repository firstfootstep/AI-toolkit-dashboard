import { NextResponse } from "next/server";
import { getLegendScreen, LEGEND_META, type LegendKey } from "@/lib/legendScanner";

export const dynamic = "force-dynamic";

function isLegendKey(value: string): value is LegendKey {
  return value in LEGEND_META;
}

// The Legend Scanner page's "สแกนหุ้น" button. No Claude call here at all
// (see legendScanner.ts's doc comment) — this just runs the fixed scoring
// formula for whichever legend is selected (?legend=, see LEGEND_META for
// the full list) over a fresh TradingView scan and hands the table straight
// back, so a click resolves in a few seconds instead of the ~30-40s a
// Claude round-trip would add.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const legendParam = (searchParams.get("legend") ?? "CANSLIM").toUpperCase();

  if (!isLegendKey(legendParam)) {
    return NextResponse.json(
      { error: `Unknown legend "${legendParam}". Valid options: ${Object.keys(LEGEND_META).join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    const screen = await getLegendScreen(legendParam);
    return NextResponse.json({ screen });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Legend scanner failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
