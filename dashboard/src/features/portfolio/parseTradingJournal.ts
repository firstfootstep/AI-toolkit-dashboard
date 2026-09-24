import ExcelJS from "exceljs";

export interface JournalRow {
  date: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees: number;
  notes: string;
}

export interface ParseResult {
  rows: JournalRow[];
  errors: { row: number; message: string }[];
}

const EXPECTED_HEADERS = ["date", "symbol", "side", "quantity", "price", "fees", "notes"];

function normalizeHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase();
}

function parseRecord(record: Record<string, unknown>, rowNumber: number, errors: ParseResult["errors"]): JournalRow | null {
  const date = String(record.date ?? "").trim();
  const symbol = String(record.symbol ?? "").trim().toUpperCase();
  const sideRaw = String(record.side ?? "").trim().toUpperCase();
  const quantity = Number(record.quantity);
  const price = Number(record.price);
  const fees = record.fees === undefined || record.fees === "" ? 0 : Number(record.fees);
  const notes = String(record.notes ?? "").trim();

  if (!date || Number.isNaN(new Date(date).getTime())) {
    errors.push({ row: rowNumber, message: "date is missing or unparseable" });
    return null;
  }
  if (!symbol) {
    errors.push({ row: rowNumber, message: "symbol is required" });
    return null;
  }
  if (sideRaw !== "BUY" && sideRaw !== "SELL") {
    errors.push({ row: rowNumber, message: `side must be BUY or SELL (got "${sideRaw}")` });
    return null;
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.push({ row: rowNumber, message: "quantity must be a positive number" });
    return null;
  }
  if (!Number.isFinite(price) || price <= 0) {
    errors.push({ row: rowNumber, message: "price must be a positive number" });
    return null;
  }

  return {
    date: new Date(date).toISOString().slice(0, 10),
    symbol,
    side: sideRaw,
    quantity,
    price,
    fees: Number.isFinite(fees) ? fees : 0,
    notes,
  };
}

export async function parseTradingJournalXlsx(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  const errors: ParseResult["errors"] = [];
  const rows: JournalRow[] = [];

  if (!sheet) {
    return { rows, errors: [{ row: 0, message: "No worksheet found in file" }] };
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = normalizeHeader(cell.value);
  });

  const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    errors.push({ row: 1, message: `Missing expected column(s): ${missing.join(", ")}` });
  }

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber];
      if (key) record[key] = cell.value;
    });
    if (Object.values(record).every((v) => v === undefined || v === null || v === "")) return;

    const parsed = parseRecord(record, rowNumber, errors);
    if (parsed) rows.push(parsed);
  });

  return { rows, errors };
}

export function parseTradingJournalCsv(text: string): ParseResult {
  const errors: ParseResult["errors"] = [];
  const rows: JournalRow[] = [];

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows, errors: [{ row: 0, message: "File is empty" }] };

  const headers = lines[0].split(",").map(normalizeHeader);
  const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    errors.push({ row: 1, message: `Missing expected column(s): ${missing.join(", ")}` });
  }

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const record: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      record[h] = cells[idx]?.trim();
    });
    const parsed = parseRecord(record, i + 1, errors);
    if (parsed) rows.push(parsed);
  }

  return { rows, errors };
}
