import Link from "next/link";
import clsx from "clsx";
import { ServerOff } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScannerTable } from "@/features/scanner/ScannerTable";
import { getScannerUniverse } from "@/features/scanner/data";
import { SCANNER_MARKETS } from "@/features/scanner/types";

export const dynamic = "force-dynamic";

export default async function ScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const { market: marketParam } = await searchParams;
  const market = SCANNER_MARKETS.some((m) => m.id === marketParam) ? marketParam! : "america";

  const { rows, source, fetchedAt } = await getScannerUniverse(market);
  const fetchedAtLabel = new Date(fetchedAt).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Bangkok",
  });

  return (
    <>
      <Topbar title="Scanner" />
      <main className="flex-1 space-y-6 overflow-y-auto p-8">
        <div className="flex flex-wrap gap-2">
          {SCANNER_MARKETS.map((m) => (
            <Link
              key={m.id}
              href={`/scanner?market=${m.id}`}
              className={clsx(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                m.id === market ? "bg-primary text-paper" : "bg-ink/6 text-muted hover:bg-ink/12"
              )}
            >
              {m.label}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ServerOff size={28} />}
              title="Live scanner data unavailable for this market"
              description="scanner-service (the unofficial TradingView screener/tvdatafeed wrapper) isn't reachable, and this market has no offline fallback. Start the service — see scanner-service/README.md — or switch to United States, which falls back to Yahoo Finance."
            />
          </Card>
        ) : (
          <Card
            title={`${SCANNER_MARKETS.find((m) => m.id === market)?.label} — ${rows.length} symbols`}
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">อัปเดตล่าสุด {fetchedAtLabel}</span>
                <DataSourceBadge source={source} />
              </div>
            }
          >
            <p className="mb-4 text-sm text-muted">
              Quotes for the whole tracked universe are loaded once up front (no cache — every visit to
              this page fetches fresh, unlike Watchlist/Market News) — filtering and sorting below happens
              instantly in your browser, no re-fetch per keystroke.
            </p>
            <ScannerTable rows={rows} />
          </Card>
        )}
      </main>
    </>
  );
}
