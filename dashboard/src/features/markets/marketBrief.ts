import fs from "fs";
import path from "path";

// market-commentary-agent (.claude/agents/market-commentary-agent.md) writes
// one markdown file per day here — same "just read whatever's on disk, no
// live fallback tier" shape as research-briefs/data.ts, since there's no
// external call, only a local folder that's empty until someone runs the
// agent (or the Market & News page's "สร้างสรุปตลาดวันนี้" button, which
// calls src/lib/marketCommentaryAgent.ts and writes here the same way).
const BRIEFS_DIR = path.join(process.cwd(), "market-briefs");

export interface MarketBriefSection {
  heading: string;
  body: string;
}

export interface MarketBrief {
  date: string; // YYYY-MM-DD, from the filename
  updatedAt: string;
  headline: string; // everything before the first "## " heading
  sections: MarketBriefSection[];
}

function parseMarketBrief(markdown: string): { headline: string; sections: MarketBriefSection[] } {
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  const headlineLines: string[] = [];
  // Tolerate a leading "# " title line from the old agent spec, but don't
  // treat it as part of the headline paragraph.
  while (i < lines.length && !/^##\s+/.test(lines[i])) {
    if (!/^#\s+/.test(lines[i])) headlineLines.push(lines[i]);
    i++;
  }
  const headline = headlineLines.join("\n").trim();

  const sections: MarketBriefSection[] = [];
  let current: MarketBriefSection | null = null;
  for (; i < lines.length; i++) {
    const heading = lines[i].match(/^##\s+(.*)/);
    if (heading) {
      if (current) sections.push(current);
      current = { heading: heading[1].trim(), body: "" };
    } else if (current) {
      current.body += lines[i] + "\n";
    }
  }
  if (current) sections.push(current);

  return { headline, sections: sections.map((s) => ({ heading: s.heading, body: s.body.trim() })) };
}

// Picks the newest file by filename (YYYY-MM-DD.md sorts chronologically as
// a plain string) rather than requiring an exact match on today's date —
// the agent runs on its own schedule, not necessarily before every page
// load, so "latest available" degrades better than "today's or nothing".
export function getLatestMarketBrief(): MarketBrief | null {
  if (!fs.existsSync(BRIEFS_DIR)) return null;

  const files = fs
    .readdirSync(BRIEFS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();
  if (files.length === 0) return null;

  const file = files[0];
  const fullPath = path.join(BRIEFS_DIR, file);
  const { headline, sections } = parseMarketBrief(fs.readFileSync(fullPath, "utf-8"));

  return {
    date: file.replace(/\.md$/, ""),
    updatedAt: fs.statSync(fullPath).mtime.toISOString(),
    headline,
    sections,
  };
}

// dateKey must be "YYYY-MM-DD" (see dateKeyInCalendarZone in
// src/lib/economicCalendar.ts) — this is the filename getLatestMarketBrief
// sorts on.
export function writeMarketBrief(dateKey: string, markdown: string): MarketBrief {
  fs.mkdirSync(BRIEFS_DIR, { recursive: true });
  const fullPath = path.join(BRIEFS_DIR, `${dateKey}.md`);
  fs.writeFileSync(fullPath, markdown, "utf-8");

  const { headline, sections } = parseMarketBrief(markdown);
  return {
    date: dateKey,
    updatedAt: fs.statSync(fullPath).mtime.toISOString(),
    headline,
    sections,
  };
}
