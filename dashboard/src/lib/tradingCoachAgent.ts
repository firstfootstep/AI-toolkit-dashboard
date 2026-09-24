import { runClaudePrint } from "@/lib/claudeCli";
import type { TradingCoachStats } from "@/lib/tradingCoachStats";

// Server-side, on-demand version of .claude/agents/trading-coach-agent.md,
// triggered by the "วิเคราะห์พฤติกรรมการเทรด" button on the Portfolio page
// instead of run manually in a Claude Code session. Same output contract
// (trading-coach-briefs/<date>.md) — see that agent file for the reasoning
// on why this is an agent (interpreting *why* a pattern happened, not just
// restating stats) rather than a skill.
//
// Like marketCommentaryAgent.ts / legendScannerAgent.ts's button path, this
// gets NO tools: tradingCoachStats.ts already computed every real number
// with fixed, reviewed arithmetic over the trade-setups.csv fixture, so
// there's nothing left for Claude to go fetch or execute.
const SYSTEM_PROMPT = `You are a trading coach reviewing a trader's setup-level journal for InvestView, a course-demo investment dashboard. You are given pre-computed, real statistics below — treat every number as ground truth, you have no tools, so never attempt to search the web, run a command, or read/write a file. Your entire final response must be the markdown body itself, nothing else — no preamble, no "here is the analysis", no meta-commentary.

You are not a financial advisor and this is not real money — frame everything as behavioral/process feedback on the trading habits the data shows, not investment advice.

Write entirely in Thai (ภาษาไทย). Keep setup names (Breakout, Pullback, VCP, VDU, Episodic Pivot), tickers, and numbers in their original form.

Output EXACTLY this shape (Thai heading text, use exactly these headings):

# Trading Coach — <today's date, YYYY-MM-DD>

## ภาพรวม
2-3 ประโยค: win rate โดยรวม, win/loss ratio (ขนาดกำไรเฉลี่ยเทียบขนาดขาดทุนเฉลี่ย), และสรุปว่าพฤติกรรมโดยรวมเป็นยังไง — ใช้ตัวเลขจริงจากด้านล่าง ห้ามเดา

## จุดที่ทำได้ดี
1-3 bullet point อ้างอิงตัวเลขจริง (เช่น setup ไหน win rate สูง, RS rating เฉลี่ยที่เข้าไม้สูงพอไหม) — ถ้าไม่มีจุดเด่นจริงๆ ให้บอกตรงๆ ว่ายังไม่มี แทนการชมเกินจริง

## จุดที่ควรปรับปรุง
2-4 bullet point ชี้ pattern พฤติกรรมที่เป็นปัญหาจริงจากตัวเลขที่ให้มา (เช่น ขนาด position ไม่สอดคล้องกับคุณภาพ setup, กำไรเฉลี่ยเล็กกว่าขาดทุนเฉลี่ยมาก, setup ไหนที่ win rate ต่ำผิดปกติ) — อธิบายว่าทำไมมันเป็นปัญหา ไม่ใช่แค่บอกตัวเลข

## คำแนะนำที่ทำได้ทันที
2-3 bullet point เชิงปฏิบัติ เจาะจงกับ pattern ที่เจอด้านบน (เช่น "ลดขนาด position ใน setup ที่ RS ต่ำกว่า 80 ลง เพราะข้อมูลแสดงว่า...") ไม่ใช่คำแนะนำทั่วไปที่ใช้กับใครก็ได้

Keep it tight and specific — every claim must trace back to a number given below. Never invent a statistic not present in the context.`;

function fmt(value: number | null, suffix = ""): string {
  return value == null ? "n/a" : `${value}${suffix}`;
}

function buildPrompt(stats: TradingCoachStats): string {
  const setupLines = stats.bySetup
    .map(
      (s) =>
        `- ${s.setup}: ${s.count} closed trades, win rate ${fmt(s.winRate, "%")}, avg P&L ${fmt(s.avgPnlPercent, "%")}, avg RS rating at entry ${s.avgRsRating}`
    )
    .join("\n");

  const rsBucketLines = stats.byRsBucket
    .map((b) => `- ${b.label}: ${b.count} trades, win rate ${fmt(b.winRate, "%")}, avg P&L ${fmt(b.avgPnlPercent, "%")}, avg size ${fmt(b.avgSizePercent, "%")}`)
    .join("\n");

  const relVolBucketLines = stats.byRelVolBucket
    .map((b) => `- ${b.label}: ${b.count} trades, win rate ${fmt(b.winRate, "%")}, avg P&L ${fmt(b.avgPnlPercent, "%")}, avg size ${fmt(b.avgSizePercent, "%")}`)
    .join("\n");

  return `Trade journal statistics (${stats.closedTrades} closed trades, ${stats.openTrades} still open):

Overall win rate: ${stats.winRate}%
Average win: ${fmt(stats.avgWinPercent, "%")}, average loss: ${fmt(stats.avgLossPercent, "%")}, win/loss ratio: ${fmt(stats.winLossRatio)}
Biggest single win: ${fmt(stats.biggestWinPercent, "%")}, biggest single loss: ${fmt(stats.biggestLossPercent, "%")}

Average position size on winning trades: ${fmt(stats.avgSizePercentOnWins, "%")} of equity
Average position size on losing trades: ${fmt(stats.avgSizePercentOnLosses, "%")} of equity
Average position size on high-RS entries (RS>=85): ${fmt(stats.avgSizePercentHighRs, "%")} of equity
Average position size on low-RS entries (RS<80): ${fmt(stats.avgSizePercentLowRs, "%")} of equity

By setup type:
${setupLines}

By RS rating at entry:
${rsBucketLines}

By relative volume at entry:
${relVolBucketLines}

Write the coaching brief now.`;
}

export async function generateTradingCoachBrief(stats: TradingCoachStats): Promise<string> {
  const prompt = buildPrompt(stats);
  // No tool round-trips — one completion over stats already computed —
  // finishes fast, same class as marketCommentaryAgent.ts.
  return runClaudePrint(prompt, SYSTEM_PROMPT, { timeoutMs: 90_000 });
}
