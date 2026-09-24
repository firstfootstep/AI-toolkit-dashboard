import { readFileSync } from "node:fs";
import path from "node:path";

// Reads src/fixtures/trade-setups.csv — a setup-level trading journal
// (distinct from getTradingJournalStats() in tradingJournal.ts, which
// reads the raw FIFO order log for NAV/P&L math). This one exists to give
// a future trading-coach agent enough context to give real behavioral
// feedback: what setup was traded, how strong it looked at entry (RS
// rating, relative volume), how it was sized, and what happened — not
// just recomputed P&L a fixed formula already covers. See
// scripts/generate-trade-setups.mjs for the mock generator and the
// intentional bad-habit patterns baked into this fixture.
export type TradeSetupType = "Breakout" | "Pullback" | "VCP" | "VDU" | "Episodic Pivot";
export type TradeOutcome = "Win" | "Loss" | "Open";

export interface TradeSetup {
  date: string;
  symbol: string;
  setup: TradeSetupType;
  rsRating: number;
  relativeVolume: number;
  entryPrice: number;
  exitPrice: number | null;
  exitDate: string | null;
  qty: number;
  positionSizePercent: number;
  riskPercent: number;
  outcome: TradeOutcome;
  pnlPercent: number | null;
  notes: string;
}

// Minimal CSV line splitter that understands one quoted field with escaped
// `""` — enough for this fixture's `notes` column, no general CSV library
// needed for a single optional quoted field.
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

export function getTradeSetups(): TradeSetup[] {
  const csvPath = path.join(process.cwd(), "src", "fixtures", "trade-setups.csv");
  const raw = readFileSync(csvPath, "utf-8").trim();
  const [, ...lines] = raw.split(/\r?\n/);

  return lines
    .map((line): TradeSetup => {
      const [
        date,
        symbol,
        setup,
        rsRating,
        relativeVolume,
        entryPrice,
        exitPrice,
        exitDate,
        qty,
        positionSizePercent,
        riskPercent,
        outcome,
        pnlPercent,
        notes,
      ] = parseCsvLine(line);

      return {
        date,
        symbol,
        setup: setup as TradeSetupType,
        rsRating: Number(rsRating),
        relativeVolume: Number(relativeVolume),
        entryPrice: Number(entryPrice),
        exitPrice: exitPrice ? Number(exitPrice) : null,
        exitDate: exitDate || null,
        qty: Number(qty),
        positionSizePercent: Number(positionSizePercent),
        riskPercent: Number(riskPercent),
        outcome: outcome as TradeOutcome,
        pnlPercent: pnlPercent ? Number(pnlPercent) : null,
        notes,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
