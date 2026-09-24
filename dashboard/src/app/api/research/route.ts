import { NextResponse } from "next/server";
import { getQuoteDetail } from "@/lib/quotes";
import { getEarningsHistory } from "@/lib/earnings";
import { getSymbolFundamentals } from "@/lib/symbolFundamentals";
import { generateResearchBrief } from "@/lib/researchAgent";
import { writeResearchBrief, symbolToFilename } from "@/features/research/data";

export const dynamic = "force-dynamic";

// The one route in this app that calls Claude and costs real usage per
// request — see README's "Research: calling Claude live" section. Every
// other route in src/app/api/ wraps a keyless data.ts helper.
//
// Runs via the `claude` CLI (headless print mode) under whatever Claude
// Code login is active on this machine, not a separate ANTHROPIC_API_KEY —
// see generateResearchBrief's doc comment in src/lib/researchAgent.ts for
// the trade-offs (slower, draws on your personal usage/rate limit). Swap in
// generateResearchBriefViaApiKey there (needs ANTHROPIC_API_KEY) if this
// ever needs to run on a server with no Claude Code session logged in.
export async function POST(request: Request) {
  let symbol: unknown;
  try {
    ({ symbol } = await request.json());
  } catch {
    return NextResponse.json({ error: "Expected a JSON body with a 'symbol' field." }, { status: 400 });
  }

  if (typeof symbol !== "string" || !symbolToFilename(symbol)) {
    return NextResponse.json({ error: "Enter a stock symbol (letters/digits), e.g. NVDA." }, { status: 400 });
  }

  try {
    // Best-effort local context — an unrecognized symbol is a normal case
    // here (mock quotes cover a small fixture universe), not a failure.
    const [detail, earnings, fundamentalsRes] = await Promise.all([
      getQuoteDetail(symbol).catch(() => null),
      getEarningsHistory(symbol).catch(() => null),
      getSymbolFundamentals(symbol).catch(() => null),
    ]);
    // Only hand Claude real, live-sourced EPS numbers — a mock-fallback
    // table would otherwise be written into the brief as if it were fact.
    const earningsQuarters = earnings?.source !== "mock" ? earnings?.quarters ?? [] : [];
    const fundamentals = fundamentalsRes?.source !== "mock" ? fundamentalsRes?.fundamentals ?? null : null;

    const { markdown } = await generateResearchBrief(symbol, detail?.quote ?? null, earningsQuarters, fundamentals);
    const brief = writeResearchBrief(symbol, markdown);

    return NextResponse.json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research agent failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
