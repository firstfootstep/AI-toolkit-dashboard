"use client";

import { useRef, useState } from "react";
import { UploadCloud, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  parseTradingJournalCsv,
  parseTradingJournalXlsx,
  type ParseResult,
} from "@/features/portfolio/parseTradingJournal";

const STORAGE_KEY = "investview.tradingJournal";

export function ImportJournal() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setFileName(file.name);
    try {
      let parsed: ParseResult;
      if (file.name.toLowerCase().endsWith(".csv")) {
        parsed = parseTradingJournalCsv(await file.text());
      } else {
        parsed = await parseTradingJournalXlsx(await file.arrayBuffer());
      }
      setResult(parsed);
      if (parsed.rows.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.rows));
      }
    } catch {
      setResult({ rows: [], errors: [{ row: 0, message: "Could not read this file — is it a valid .xlsx or .csv?" }] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Import trading journal"
      action={
        <a
          href="/templates/trading-journal-template.xlsx"
          download
          className="flex items-center gap-1.5 text-xs font-medium text-primary-bright hover:underline"
        >
          <Download size={14} /> Download template
        </a>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Already track trades yourself? Import your own .xlsx or .csv journal — columns:{" "}
        <code className="rounded bg-ink/6 px-1 py-0.5 text-xs">
          date, symbol, side, quantity, price, fees, notes
        </code>
        . Parsing runs entirely in your browser; nothing is uploaded anywhere.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-line py-8 text-center transition-colors duration-200 hover:border-primary-bright"
      >
        <UploadCloud className="text-muted" size={24} />
        <p className="text-sm text-muted">
          {busy ? "Parsing…" : "Click to choose, or drag a .xlsx / .csv file here"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">{fileName}</span>
            {result.rows.length > 0 && (
              <Badge tone="green">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={12} /> {result.rows.length} row(s) imported
                </span>
              </Badge>
            )}
            {result.errors.length > 0 && (
              <Badge tone="amber">
                <span className="flex items-center gap-1">
                  <AlertTriangle size={12} /> {result.errors.length} issue(s)
                </span>
              </Badge>
            )}
          </div>

          {result.errors.length > 0 && (
            <ul className="max-h-32 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] bg-coral/10 p-3 text-xs text-coral">
              {result.errors.map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}

          {result.rows.length > 0 && (
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-paper">
                  <tr className="text-left text-muted">
                    <th className="py-1 pr-3">Date</th>
                    <th className="py-1 pr-3">Symbol</th>
                    <th className="py-1 pr-3">Side</th>
                    <th className="py-1 pr-3 text-right">Qty</th>
                    <th className="py-1 pr-3 text-right">Price</th>
                    <th className="py-1">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="py-1 pr-3">{r.date}</td>
                      <td className="py-1 pr-3 font-medium">{r.symbol}</td>
                      <td className="py-1 pr-3">{r.side}</td>
                      <td className="py-1 pr-3 text-right">{r.quantity}</td>
                      <td className="py-1 pr-3 text-right">{r.price}</td>
                      <td className="py-1 truncate">{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
