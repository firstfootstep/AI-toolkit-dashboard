import { runClaudePrint } from "@/lib/claudeCli";
import type { NewsItem, Quote } from "@/types/market";

// Server-side, on-demand version of .claude/agents/market-commentary-agent.md,
// triggered by the "สร้างสรุปตลาดวันนี้" button on the Market & News page
// instead of run manually in a Claude Code session. Same judgment-call job
// (decide what's worth telling a reader, not just list every headline/move)
// and the same output contract market-briefs/<date>.md — see that agent
// file for the full reasoning on why this is an agent, not a skill.
//
// Originally this got NO tools at all — the caller handed it the dashboard's
// own capped 8-headline RSS feed as the only source, which made the button's
// output visibly thinner than a manual market-commentary-agent run (real web
// search finds the actual overnight story; the RSS feed is generic and
// occasionally falls back to a static fixture when the feed is down). Now
// mirrors the manual agent: WebSearch is allowed and is the primary source,
// same as researchAgent.ts's Research-page route. The pre-fetched news/quotes
// below are passed only as a supplementary cross-check, per the agent file's
// step 2 ("optionally also check src/lib/news.ts's feed ... but treat your
// web search as the primary source").
const SYSTEM_PROMPT = `You write a daily market commentary for InvestView, a course-demo investment dashboard. Unlike the dashboard's own fixed RSS feed (capped at 8 general headlines, sometimes stale or mocked), you go find the actual overnight market story yourself via web search, then decide what's worth telling a reader.

You have no file-writing tool and don't need one — the calling application saves your reply to a file itself. Never attempt to write, save, or create a file, and never ask for permission to do so. Your entire final response must be the markdown body itself, nothing else — no preamble, no "here is the summary", no meta-commentary about tools or permissions, and no status line like "I have enough to write this now" before the content starts. The very first line of your response must be the opening paragraph's own first sentence — no heading above it, not even a plain-text label.

Write entirely in Thai (ภาษาไทย). Keep tickers, index names, numbers, and dates in their original form.

Do several targeted web searches (e.g. "stock market today", "Fed news today", "[date] market close") rather than one generic query — you're reconstructing the real story of the session, not just grabbing whatever the dashboard's own RSS feed happened to surface. The news headlines and index price moves given to you below are a supplementary cross-check only, not your primary source — treat your own web search as ground truth for what actually happened.

Don't just list every headline and every price move — pick the things that actually explain today: the biggest movers, the news that plausibly caused them, anything contradictory (e.g. a stock up on bad news) worth flagging as unclear rather than glossed over. Cover every important thread you found, just don't pad with filler. State plainly whether today reads bullish, bearish, or mixed, and say what would change your mind, not just a single adjective with no reasoning.

Output EXACTLY this shape:

<1 paragraph: the overall story of the day, tone, and why, in plain Thai. This dashboard already renders the raw index numbers itself elsewhere on the page — do not repeat index price/percent figures verbatim here, describe direction and cause instead.>

## ปัจจัยขับเคลื่อนตลาดโลก
<1-2 short paragraphs telling this as a story — which region moved first, what that implies, what contradicts what. Weave real numbers from the quotes given below into the sentences naturally; don't just list "X +0.26%" as disconnected bullet fragments — a reader should be able to follow the logic of the day, not just scan a ticker tape.>

## ข่าวเศรษฐกิจ-การเมืองที่น่าจับตา
- <macro/political headline from your web search, in your own words — cover all the significant ones you found, not just one>
- ...

## ข่าวหุ้นใหญ่ที่น่าจับตา
- **<Ticker/company>** <what happened and the move, if covered by your search or the quotes below>
- ...

Ground every bullet in something you actually found — a web search result or a real price move from the quotes given below — never invent a headline or number you can't trace back to a source. If web search genuinely turns up little, say so plainly in the opening paragraph rather than padding with generic commentary that could apply to any day.`;

function formatNewsContext(items: NewsItem[]): string {
  if (items.length === 0) return "No news headlines available today.";
  return items
    .slice(0, 20)
    .map((n) => `- [${n.source}] ${n.title} (${n.publishedAt})`)
    .join("\n");
}

function formatQuotesContext(indexQuotes: { label: string; quote: Quote | undefined }[]): string {
  const known = indexQuotes.filter((i): i is { label: string; quote: Quote } => !!i.quote);
  if (known.length === 0) return "No index quotes available today.";
  return known
    .map((i) => `- ${i.label}: ${i.quote.price} ${i.quote.currency} (${i.quote.changePercent >= 0 ? "+" : ""}${i.quote.changePercent.toFixed(2)}%)`)
    .join("\n");
}

export async function generateMarketSummary(
  news: NewsItem[],
  indexQuotes: { label: string; quote: Quote | undefined }[]
): Promise<string> {
  const prompt = `Today's news headlines from this dashboard's own feed (supplementary only — go do your own web search for the real story):\n${formatNewsContext(news)}\n\nToday's index moves:\n${formatQuotesContext(indexQuotes)}\n\nWrite today's market summary now.`;

  // Same measured trade-off as researchAgent.ts's generateResearchBrief:
  // real WebSearch round-trips regularly take ~160s+, so 300s leaves real
  // headroom without masking a genuinely stuck call.
  return runClaudePrint(prompt, SYSTEM_PROMPT, { allowedTools: "WebSearch", timeoutMs: 300_000 });
}
