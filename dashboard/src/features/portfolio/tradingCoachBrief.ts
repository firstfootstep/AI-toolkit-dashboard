import fs from "fs";
import path from "path";

// trading-coach-agent (.claude/agents/trading-coach-agent.md) writes one
// markdown file per run here, named "<YYYY-MM-DD>.md" — so does the
// Portfolio page's "วิเคราะห์พฤติกรรมการเทรด" button, which calls
// src/lib/tradingCoachAgent.ts and writes here the same way. Same
// "just read whatever's on disk, no fallback tier" shape as
// market-briefs/ — there's no external call here, only a local folder
// that's empty until the agent or button runs.
const BRIEFS_DIR = path.join(process.cwd(), "trading-coach-briefs");

export interface TradingCoachBriefSection {
  heading: string;
  body: string;
}

export interface TradingCoachBrief {
  date: string; // YYYY-MM-DD, from the filename
  updatedAt: string;
  sections: TradingCoachBriefSection[];
}

function parseBrief(markdown: string): TradingCoachBriefSection[] {
  const sections: TradingCoachBriefSection[] = [];
  let current: TradingCoachBriefSection | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.*)/);
    if (heading) {
      if (current) sections.push(current);
      current = { heading: heading[1].trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);

  return sections.map((s) => ({ heading: s.heading, body: s.body.trim() }));
}

// Picks the newest file by filename (same reasoning as getLatestMarketBrief
// in features/markets/marketBrief.ts) — "latest available" degrades better
// than requiring an exact match on today's date.
export function getLatestTradingCoachBrief(): TradingCoachBrief | null {
  if (!fs.existsSync(BRIEFS_DIR)) return null;

  const files = fs
    .readdirSync(BRIEFS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();
  if (files.length === 0) return null;

  const file = files[0];
  const fullPath = path.join(BRIEFS_DIR, file);
  return {
    date: file.replace(/\.md$/, ""),
    updatedAt: fs.statSync(fullPath).mtime.toISOString(),
    sections: parseBrief(fs.readFileSync(fullPath, "utf-8")),
  };
}

export function writeTradingCoachBrief(dateKey: string, markdown: string): TradingCoachBrief {
  fs.mkdirSync(BRIEFS_DIR, { recursive: true });
  const fullPath = path.join(BRIEFS_DIR, `${dateKey}.md`);
  fs.writeFileSync(fullPath, markdown, "utf-8");

  return {
    date: dateKey,
    updatedAt: fs.statSync(fullPath).mtime.toISOString(),
    sections: parseBrief(markdown),
  };
}
