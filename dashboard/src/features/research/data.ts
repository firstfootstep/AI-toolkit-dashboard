import fs from "fs";
import path from "path";

// symbol-research-agent (.claude/agents/symbol-research-agent.md) writes one
// markdown file per ticker here. This just reads whatever's on disk — there's
// no "never break live" fallback tier because there's no external call, only
// a local folder that's empty until a student runs the agent.
const BRIEFS_DIR = path.join(process.cwd(), "research-briefs");

export interface ResearchBriefSection {
  heading: string;
  body: string;
}

export interface ResearchBrief {
  ticker: string;
  updatedAt: string;
  sections: ResearchBriefSection[];
}

// Exported so both the file-based agent flow and the on-page
// generateResearchBrief() flow (src/app/api/research/route.ts) parse briefs
// identically — one heading-splitting rule, not two.
//
// The agent's prompt asks for "## Heading" sections (Snapshot, Bull case,
// Bear case, ...) but doesn't lock down exact wording or a machine-parseable
// header block — so this only relies on the one thing guaranteed to be
// stable: markdown h2s split the document into sections.
export function parseSections(markdown: string): ResearchBriefSection[] {
  const sections: ResearchBriefSection[] = [];
  let current: ResearchBriefSection | null = null;

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

// Bare symbol only (e.g. "NVDA") — a colon-containing ticker like
// "NASDAQ:NVDA" is an illegal filename on Windows.
export function symbolToFilename(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9._-]/g, "");
}

export function writeResearchBrief(symbol: string, markdown: string): ResearchBrief {
  fs.mkdirSync(BRIEFS_DIR, { recursive: true });
  const ticker = symbolToFilename(symbol);
  if (!ticker) throw new Error("Symbol must contain at least one letter or digit.");

  const fullPath = path.join(BRIEFS_DIR, `${ticker}.md`);
  fs.writeFileSync(fullPath, markdown, "utf-8");

  return {
    ticker,
    updatedAt: fs.statSync(fullPath).mtime.toISOString(),
    sections: parseSections(markdown),
  };
}

export interface ResearchHtmlReport {
  ticker: string;
  updatedAt: string;
}

// earnings-preview-th (.claude/skills/earnings-preview-th) writes a
// self-contained HTML "earnings ledger" doc here as a fallback save
// alongside publishing it as an Artifact — see that skill's "Design"
// section — so it shows up on this page too, not only on claude.ai.
// Sibling convention to the .md briefs above: same folder, same
// symbolToFilename() naming, just a different extension the Research page
// renders in an iframe instead of parsing as markdown.
export function getResearchHtmlReports(): ResearchHtmlReport[] {
  if (!fs.existsSync(BRIEFS_DIR)) return [];

  return fs
    .readdirSync(BRIEFS_DIR)
    .filter((file) => file.endsWith(".html"))
    .map((file) => {
      const fullPath = path.join(BRIEFS_DIR, file);
      return { ticker: file.replace(/\.html$/, ""), updatedAt: fs.statSync(fullPath).mtime.toISOString() };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function readResearchHtmlReport(ticker: string): string | null {
  const clean = symbolToFilename(ticker);
  if (!clean) return null;
  const fullPath = path.join(BRIEFS_DIR, `${clean}.html`);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, "utf-8");
}

export function getResearchBriefs(): ResearchBrief[] {
  if (!fs.existsSync(BRIEFS_DIR)) return [];

  return fs
    .readdirSync(BRIEFS_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const fullPath = path.join(BRIEFS_DIR, file);
      return {
        ticker: file.replace(/\.md$/, ""),
        updatedAt: fs.statSync(fullPath).mtime.toISOString(),
        sections: parseSections(fs.readFileSync(fullPath, "utf-8")),
      };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
