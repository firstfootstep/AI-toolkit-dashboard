import type { ReactNode } from "react";
import { MiniBarChart, MiniLineChart } from "@/features/research/MiniChart";

// symbol-research-agent / earnings-preview-agent's brief prose uses a small,
// fixed set of markdown shapes — **bold**, [text](url) links, "- " bullets,
// "1. " ordered items, GFM pipe tables, and a ```chart:bar/line``` fence for
// simple single-series charts — so a tiny custom renderer covers it without
// pulling in a full markdown library.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      nodes.push(
        <a
          key={`${keyPrefix}-${i++}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary-bright underline decoration-primary-bright/30 underline-offset-2 hover:decoration-primary-bright"
        >
          {match[1]}
        </a>
      );
    } else {
      nodes.push(
        <strong key={`${keyPrefix}-${i++}`} className="font-semibold text-ink">
          {match[3]}
        </strong>
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());
}

export function Table({ header, rows, keyBase }: { header: string[]; rows: string[][]; keyBase: string }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
            {header.map((h, i) => (
              <th key={i} className="px-3 py-2 font-medium">
                {renderInline(h, `${keyBase}-th-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-line last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-ink-soft">
                  {renderInline(cell, `${keyBase}-td-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ```chart:bar or ```chart:line fences: an optional "title: ..." line, then
// one "Label: number" pair per line. Kept deliberately tiny — one series,
// no axes config — since the agents only ever need a quick visual, not a
// full chart spec.
export function parseChartFenceBody(body: string): { title?: string; points: { label: string; value: number }[] } {
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let title: string | undefined;
  const points: { label: string; value: number }[] = [];

  for (const line of lines) {
    const titleMatch = line.match(/^title:\s*(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      continue;
    }
    const pointMatch = line.match(/^(.+?):\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (pointMatch) {
      points.push({ label: pointMatch[1].trim(), value: Number(pointMatch[2]) });
    }
  }

  return { title, points };
}

export function ChartFence({ kind, body }: { kind: "bar" | "line"; body: string }) {
  const { title, points } = parseChartFenceBody(body);

  if (points.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-canvas p-3">
      {title && <p className="mb-2 text-xs font-medium text-muted">{title}</p>}
      {kind === "bar" ? <MiniBarChart points={points} /> : <MiniLineChart points={points} />}
    </div>
  );
}

export type Block =
  | { type: "para"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "chart"; kind: "bar" | "line"; body: string }
  | { type: "code"; body: string };

export function splitIntoBlocks(body: string): Block[] {
  const rawLines = body.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    // Fenced code / chart block
    const fenceMatch = trimmed.match(/^```(\S*)/);
    if (fenceMatch) {
      const info = fenceMatch[1] ?? "";
      const bodyLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith("```")) {
        bodyLines.push(rawLines[i]);
        i++;
      }
      i++; // skip closing fence
      const fenceBody = bodyLines.join("\n");
      if (info === "chart:bar") blocks.push({ type: "chart", kind: "bar", body: fenceBody });
      else if (info === "chart:line") blocks.push({ type: "chart", kind: "line", body: fenceBody });
      else blocks.push({ type: "code", body: fenceBody });
      continue;
    }

    // GFM table: a "|...|" row followed by a separator row
    if (trimmed.startsWith("|") && rawLines[i + 1] && isTableSeparator(rawLines[i + 1])) {
      const header = parseTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith("|")) {
        rows.push(parseTableRow(rawLines[i]));
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    // Unordered list
    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith("- ")) {
        items.push(rawLines[i].trim().slice(2).trim());
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < rawLines.length && /^\d+\.\s/.test(rawLines[i].trim())) {
        items.push(rawLines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph: consume until a blank line or a line starting a new block type
    const paraLines: string[] = [];
    while (
      i < rawLines.length &&
      rawLines[i].trim() !== "" &&
      !rawLines[i].trim().startsWith("- ") &&
      !/^\d+\.\s/.test(rawLines[i].trim()) &&
      !rawLines[i].trim().startsWith("```") &&
      !(rawLines[i].trim().startsWith("|") && rawLines[i + 1] && isTableSeparator(rawLines[i + 1]))
    ) {
      paraLines.push(rawLines[i].trim());
      i++;
    }
    blocks.push({ type: "para", lines: paraLines });
  }

  return blocks;
}

export function MarkdownBody({ body, className }: { body: string; className?: string }) {
  const blocks = splitIntoBlocks(body);

  return (
    <div className={className ? `space-y-3 ${className}` : "space-y-3"}>
      {blocks.map((block, bi) => {
        const key = `block-${bi}`;

        if (block.type === "para") {
          const text = block.lines.join(" ").trim();
          if (!text) return null;
          return (
            <p key={key} className="text-sm leading-relaxed text-ink-soft">
              {renderInline(text, key)}
            </p>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={key} className="space-y-2">
              {block.items.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                  <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-muted" aria-hidden />
                  <span>{renderInline(item, `${key}-${i}`)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={key} className="space-y-2">
              {block.items.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                  <span className="flex-none text-xs font-semibold text-muted">{i + 1}.</span>
                  <span>{renderInline(item, `${key}-${i}`)}</span>
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "table") {
          return <Table key={key} header={block.header} rows={block.rows} keyBase={key} />;
        }

        if (block.type === "chart") {
          return <ChartFence key={key} kind={block.kind} body={block.body} />;
        }

        return (
          <pre key={key} className="overflow-x-auto rounded-[var(--radius-sm)] bg-canvas p-3 text-xs text-ink-soft">
            <code>{block.body}</code>
          </pre>
        );
      })}
    </div>
  );
}
