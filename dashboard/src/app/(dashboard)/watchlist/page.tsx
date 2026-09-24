import { ServerOff } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PresetWatchlistTable } from "@/features/watchlist/PresetWatchlistTable";
import { WATCHLIST_PRESETS, topByPreset } from "@/features/watchlist/scanPresets";
import { getScannerUniverse } from "@/features/scanner/data";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const { rows, source } = await getScannerUniverse("america");

  return (
    <>
      <Topbar title="Watchlist" />
      <main className="flex-1 space-y-6 overflow-y-auto p-8">
        {rows.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ServerOff size={28} />}
              title="Live scanner data unavailable"
              description="scanner-service (the unofficial TradingView screener wrapper) isn't reachable, so there's no universe to rank into a watchlist right now. Try again shortly, or see Scanner for the same fallback status."
            />
          </Card>
        ) : (
          <Card title="Watchlist — Top 10 per scan" action={<DataSourceBadge source={source} />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {WATCHLIST_PRESETS.map((preset) => (
                <div key={preset.key} className="rounded-[var(--radius-md)] border border-line bg-canvas p-3">
                  <h4 className="font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-wide text-muted">
                    {preset.label}
                  </h4>
                  <p className="mb-2 text-[11px] text-muted">{preset.description}</p>
                  <PresetWatchlistTable rows={topByPreset(rows, preset)} presetKey={preset.key} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
