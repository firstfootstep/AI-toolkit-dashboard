import Anthropic from "@anthropic-ai/sdk";
import { runClaudePrint } from "@/lib/claudeCli";
import type { Quote } from "@/types/market";
import type { EarningsQuarter } from "@/lib/earnings";
import type { SymbolFundamentals } from "@/lib/symbolFundamentals";

// Server-side, on-demand call to Claude that powers the Research page's
// "research a symbol" box. It intentionally does NOT give Claude
// filesystem/bash tools: this runs from a public form submission, so the
// only tool it gets is web search — no local tool execution to sandbox.
// (The interactive counterpart with Bash/yfinance access for deeper,
// judgment-driven pre-earnings research is the earnings-preview-agent in
// .claude/agents/, run live in a Claude Code session — same output contract
// as this route, just with real local data-pulling instead of only
// WebSearch. See that agent's file for the trade-off.)
//
// This route pre-fetches real EPS data itself (src/lib/earnings.ts, same
// Yahoo tier the Research page's own EPS chart uses) and hands it to Claude
// as ground truth for the "ผลประกอบการย้อนหลัง" section — same principle as
// earnings-preview-agent's "prefer a real data pull over a web-search
// summary for anything numeric", just sourced from this app's own lib
// instead of yfinance. It does the same for valuation/analyst fundamentals
// (src/lib/symbolFundamentals.ts, TradingView tier) — the server fetches
// these with a fixed, reviewed function call, Claude never runs a tool to
// get them itself, so a public form submission still can't reach a live
// code-execution surface. ResearchBriefCard also renders these numbers
// directly as a stat strip, so the prose below doesn't need to restate them
// verbatim — just stay consistent with them.

const SYSTEM_PROMPT = `You write research briefs for stocks in a course-demo investment dashboard. You are not a financial advisor — never phrase anything as a recommendation to buy or sell, describe the case for and against instead.

You have no file-writing tool and don't need one — the calling application saves your reply to a file itself. Never attempt to write, save, or create a file, and never ask for permission to do so. Your entire final response must be the markdown brief itself, nothing else — no preamble, no "here is the brief", no meta-commentary about tools or permissions.

Write the entire brief in Thai (ภาษาไทย) — headings, prose, and bullet points all in Thai. Keep ticker symbols, company names, numbers, dates, and source URLs in their original form (don't translate "NVIDIA" or "$96.2B", for example).

Given a ticker, whatever price/quote context is provided, and (when given) a real trailing-EPS data table, use web search to find recent news, company background, the last earnings result, and analyst sentiment, then write a markdown brief with EXACTLY these "## " sections, in this order (Thai heading text shown — use exactly these headings). The brief supports a few extra markdown shapes beyond plain prose — GFM pipe tables, and a \`\`\`chart:bar\`\`\` fenced block containing "Label: number" lines (one per line, optional first line "title: ...") for a simple one-series chart — use them where noted below.

## ภาพรวมบริษัท
3-4 ประโยค: บริษัททำธุรกิจอะไร กลุ่มลูกค้า/รายได้หลักมาจากไหน และทำไมตอนนี้ถึงน่าสนใจ

## ผลประกอบการย้อนหลัง
ถ้ามีตาราง EPS จริงให้ในบริบท (context ด้านล่าง) ให้ใช้ตัวเลขนั้นตรงๆ ห้ามเดาหรือค้นหาตัวเลขใหม่มาแทน — เขียนเป็นตาราง markdown (คอลัมน์: ไตรมาส, EPS จริง, EPS คาดการณ์, ผลต่าง %) ตามด้วย \`\`\`chart:bar\`\`\` ของผลต่าง % รายไตรมาส (ไตรมาสที่ยังไม่ประกาศผลให้ข้ามจากกราฟ ใส่ค่า 0 หรือไม่ต้องใส่แถวนั้นในกราฟ) ถ้าไม่มีตารางให้ในบริบท ให้ค้นหาแล้วเขียนว่าค้นไม่พบตัวเลขที่ยืนยันได้แทนการเดา

## มุมมองเชิงบวก (Bull case)
2-4 bullet point อ้างอิงจากสิ่งที่ค้นเจอ

## มุมมองเชิงลบ (Bear case)
2-4 bullet point อ้างอิงจากสิ่งที่ค้นเจอ

## มุมมองนักวิเคราะห์
ถ้ามีตัวเลข analyst rating ให้ในบริบทด้านล่าง ให้ตีความค่านั้นตรงๆ (เช่น ค่าเข้าใกล้ +1 คือ buy หนัก, ใกล้ 0 คือ hold, ติดลบคือ sell) แทนการค้นหาเรตติ้งเอง แล้วเสริมด้วยช่วงราคาเป้าหมายและบริบทจากเว็บถ้าค้นเจอ — ถ้าไม่มีตัวเลขให้ในบริบทและค้นไม่เจอ ให้บอกตรงๆ ว่าไม่พบ

## ตัวชี้วัดสำคัญที่ต้องจับตา
3-5 bullet point เจาะจงตามประเภทธุรกิจ (เช่น SaaS ดู ARR/NRR, ค้าปลีกดู same-store sales, อุตสาหกรรมหนักดู backlog) ไม่ใช่ generic list ที่ใช้กับหุ้นไหนก็ได้

## ความเคลื่อนไหวล่าสุด
Bullet point พร้อมวันที่ ย้อนหลังประมาณ 90 วัน

## ปัจจัยที่ต้องติดตามต่อ
สิ่งที่ยังไม่ชัดเจน ยังไม่เกิดขึ้น หรือยังตรวจสอบไม่ได้ แต่อาจส่งผลต่อหุ้นในอนาคต — เขียนแต่ละข้อในกรอบ "สิ่งที่ต้องรอดูผล" ไม่ใช่แค่บอกว่าค้นไม่เจอเฉยๆ (เช่น "ยอดขาย iPhone Duo หลังเปิดจำหน่ายจริง จะยืนยันได้ว่าความต้องการตรงกับกระแสข่าวหรือไม่") ถ้าเป็นตัวเลขที่ตรวจสอบไม่ได้จริงๆ ให้บอกตรงๆ ว่า "ไม่พบข้อมูล" แทนการเดา

## แหล่งอ้างอิง
URL ที่ใช้จริง บรรทัดละ 1 ลิงก์

When real fundamentals (P/E, revenue growth, ROE, beta, analyst rating, etc.) are provided in the context below, treat them as ground truth for valuation/quality framing anywhere in the brief (bull/bear case, analyst view, key metrics) — never search for or guess a different P/E or growth figure when a real one is already given. The app displays these numbers as their own stat strip on the page, so don't dedicate a whole section to re-listing them — weave the relevant ones into your prose naturally instead.

Keep each section tight — this is a brief, not a report. If web search turns up little for this symbol, say so plainly in the open-questions section rather than padding with generic commentary that could apply to any stock. Never invent a chart or table row you don't have a real number for.`;

export interface ResearchAgentResult {
  markdown: string;
}

function formatEarningsContext(quarters: EarningsQuarter[]): string {
  const rows = quarters
    .map((q) => `${q.label} (${q.date}): actual ${q.epsActual ?? "not yet reported"}, estimate ${q.epsEstimate ?? "n/a"}`)
    .join("; ");
  return `Real trailing EPS data (from this dashboard's own Yahoo Finance tier, use verbatim for the "ผลประกอบการย้อนหลัง" section, do not re-search or alter these numbers): ${rows}.`;
}

function formatFundamentalsContext(f: SymbolFundamentals): string {
  const parts: string[] = [];
  if (f.peRatio != null) parts.push(`P/E ${f.peRatio.toFixed(1)}x`);
  if (f.pegRatio != null) parts.push(`PEG ${f.pegRatio.toFixed(2)}`);
  if (f.revenueGrowthPercent != null) parts.push(`revenue growth YoY ${f.revenueGrowthPercent.toFixed(1)}%`);
  if (f.epsDilGrowthPercent != null) parts.push(`diluted EPS growth YoY ${f.epsDilGrowthPercent.toFixed(1)}%`);
  if (f.roePercent != null) parts.push(`ROE ${f.roePercent.toFixed(1)}%`);
  if (f.divYieldPercent != null) parts.push(`dividend yield ${f.divYieldPercent.toFixed(2)}%`);
  if (f.beta != null) parts.push(`beta ${f.beta.toFixed(2)}`);
  if (f.perfYearPercent != null) parts.push(`1Y price performance ${f.perfYearPercent.toFixed(1)}%`);
  if (f.analystRating != null) parts.push(`aggregate analyst rating ${f.analystRating.toFixed(2)} (scale -1 strong sell to +1 strong buy)`);
  if (f.marketCap != null) parts.push(`market cap $${(f.marketCap / 1e9).toFixed(1)}B`);
  if (f.sector) parts.push(`sector "${f.sector}"`);

  if (parts.length === 0) return "No real fundamentals data is available for this symbol from this dashboard's TradingView tier.";
  return `Real fundamentals (from this dashboard's own TradingView tier, use verbatim rather than re-searching or estimating): ${parts.join(", ")}.`;
}

function buildPrompt(
  symbol: string,
  quoteContext: Quote | null,
  earningsQuarters: EarningsQuarter[],
  fundamentals: SymbolFundamentals | null
): string {
  const contextLine = quoteContext
    ? `This dashboard already has: price ${quoteContext.price} ${quoteContext.currency}, change ${quoteContext.change} (${quoteContext.changePercent}%), name "${quoteContext.name}".`
    : "This dashboard has no existing quote data for this symbol.";
  const earningsLine = earningsQuarters.length > 0 ? formatEarningsContext(earningsQuarters) : "No real EPS data table is available for this symbol — search for it, and say plainly if you can't confirm it.";
  const fundamentalsLine = fundamentals ? formatFundamentalsContext(fundamentals) : "No real fundamentals data is available for this symbol from this dashboard's TradingView tier.";
  return `Research ${symbol}. ${contextLine} ${earningsLine} ${fundamentalsLine} Write the brief now.`;
}

/**
 * Shells out to the `claude` CLI in headless print mode instead of calling
 * the Anthropic API directly — this runs under whatever account is logged
 * into Claude Code on this machine (`claude auth login` / a Pro-Max
 * subscription), not a separate metered API key. Trade-off, measured live:
 * every call reloads this project's CLAUDE.md/system-prompt context
 * (~12K cache-creation tokens on a cold cache) and takes 20-30s+ even for a
 * short reply — noticeably slower than a direct API call. Fine for a
 * single-person demo; revisit (switch back to generateResearchBriefViaApiKey)
 * before this serves real concurrent traffic, since it draws on your
 * personal Claude Code usage/rate limit, not an app-scoped API budget.
 *
 * CLI resolution/env plumbing lives in src/lib/claudeCli.ts, shared with
 * generateMarketSummary in src/lib/marketCommentaryAgent.ts.
 */
export async function generateResearchBrief(
  symbol: string,
  quoteContext: Quote | null,
  earningsQuarters: EarningsQuarter[] = [],
  fundamentals: SymbolFundamentals | null = null
): Promise<ResearchAgentResult> {
  const prompt = buildPrompt(symbol, quoteContext, earningsQuarters, fundamentals);
  // Measured live: a full multi-section Thai brief with real WebSearch
  // calls (not just a short reply) regularly takes ~160s and sometimes
  // more, so 180s left almost no margin — timed out mid-run often enough
  // to be the normal failure mode, not an edge case. 300s gives real
  // headroom without masking a genuinely stuck call.
  const markdown = await runClaudePrint(prompt, SYSTEM_PROMPT, { allowedTools: "WebSearch", timeoutMs: 300_000 });
  return { markdown };
}

/**
 * Original implementation via the Anthropic API/SDK — needs
 * ANTHROPIC_API_KEY and bills per token against API console credits
 * (separate from any Claude.ai/Claude Code subscription). Kept for when
 * this needs to run on a server without a logged-in Claude Code session,
 * or once real multi-user traffic makes the CLI approach above unsuitable.
 */
export async function generateResearchBriefViaApiKey(
  symbol: string,
  quoteContext: Quote | null,
  earningsQuarters: EarningsQuarter[] = [],
  fundamentals: SymbolFundamentals | null = null
): Promise<ResearchAgentResult> {
  const client = new Anthropic();

  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildPrompt(symbol, quoteContext, earningsQuarters, fundamentals) },
  ];

  const tools: Anthropic.Messages.ToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", max_uses: 6 },
  ];

  // web_search is a server-executed tool — Claude searches and reads results
  // within the same request. The only loop we need to handle ourselves is
  // pause_turn (the model hit its own per-turn search budget and wants to
  // keep going) — a plain content block, not a client tool_use, so there's
  // nothing to execute, just resume.
  let response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    output_config: { effort: "medium" },
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  let guard = 0;
  while (response.stop_reason === "pause_turn" && guard < 3) {
    messages = [...messages, { role: "assistant", content: response.content }];
    response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
    guard++;
  }

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to research this symbol.");
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!textBlock?.text) {
    throw new Error("No brief text in the model's response.");
  }

  return { markdown: textBlock.text };
}
