"use client";

import { Download } from "lucide-react";
import type { HoldingReportRow } from "@/features/reports/reportData";

function toCsv(rows: HoldingReportRow[]): string {
  const header = ["Symbol", "Name", "Asset Class", "Market Value", "Weight %", "Unrealized P&L", "Unrealized P&L %"];
  const lines = rows.map((r) =>
    [
      r.symbol,
      `"${r.name.replace(/"/g, '""')}"`,
      r.assetClass,
      r.marketValue.toFixed(2),
      r.weightPercent.toFixed(2),
      r.unrealizedPnl.toFixed(2),
      r.unrealizedPnlPercent.toFixed(2),
    ].join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function DownloadCsvButton({ rows, filename }: { rows: HoldingReportRow[]; filename: string }) {
  function handleClick() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-ink/6"
    >
      <Download size={14} />
      Download CSV
    </button>
  );
}
