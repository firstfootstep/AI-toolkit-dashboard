import fs from "fs";
import path from "path";

// legend-scanner-agent (.claude/agents/legend-scanner-agent.md) writes one
// markdown file per run here, named "<LEGEND>-<YYYY-MM-DD>.md" (e.g.
// "CANSLIM-2026-09-16.md") when a student runs it manually in Claude Code —
// the curated, narrative counterpart to the page's own "สแกนหุ้น" button,
// which computes its table live (src/lib/legendScanner.ts) and never
// touches this folder. This just reads whatever the agent has written to
// disk, no fallback tier, because there's no external call here — only a
// local folder that's empty until a student runs the agent.
const BRIEFS_DIR = path.join(process.cwd(), "legend-scanner-briefs");

export interface LegendBriefSection {
  heading: string;
  body: string;
}

export interface LegendBrief {
  legend: string; // e.g. "CANSLIM"
  date: string; // e.g. "2026-09-16"
  updatedAt: string;
  title: string; // the brief's own "# " heading, e.g. "Legend Scanner — William O'Neil (CANSLIM) — 2026-09-16"
  sections: LegendBriefSection[];
}

const FILENAME_PATTERN = /^(.+)-(\d{4}-\d{2}-\d{2})\.md$/;

// Same splitting rule as research/data.ts's parseSections — duplicated
// rather than imported to keep this feature folder independent of
// research/, per this project's ui/features split convention. Also strips
// a leading "# " title line, since the page renders the legend name as the
// Card's own title instead of repeating it inside the markdown body.
function parseBrief(markdown: string): { title: string; sections: LegendBriefSection[] } {
  const lines = markdown.split(/\r?\n/);
  let title = "";
  let startIndex = 0;
  const h1 = lines[0]?.match(/^#\s+(.*)/);
  if (h1) {
    title = h1[1].trim();
    startIndex = 1;
  }

  const sections: LegendBriefSection[] = [];
  let current: LegendBriefSection | null = null;

  for (const line of lines.slice(startIndex)) {
    const heading = line.match(/^##\s+(.*)/);
    if (heading) {
      if (current) sections.push(current);
      current = { heading: heading[1].trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);

  return { title, sections: sections.map((s) => ({ heading: s.heading, body: s.body.trim() })) };
}

export function getLegendBriefs(): LegendBrief[] {
  if (!fs.existsSync(BRIEFS_DIR)) return [];

  return fs
    .readdirSync(BRIEFS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const match = file.match(FILENAME_PATTERN);
      const fullPath = path.join(BRIEFS_DIR, file);
      const { title, sections } = parseBrief(fs.readFileSync(fullPath, "utf-8"));
      return {
        legend: match ? match[1] : file.replace(/\.md$/, ""),
        date: match ? match[2] : "",
        updatedAt: fs.statSync(fullPath).mtime.toISOString(),
        title,
        sections,
      };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
