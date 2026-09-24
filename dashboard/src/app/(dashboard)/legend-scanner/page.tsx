import { Topbar } from "@/components/layout/Topbar";
import { getLegendBriefs } from "@/features/legend-scanner/data";
import { LegendBriefCard } from "@/features/legend-scanner/LegendBriefCard";
import { LegendScannerPanel } from "@/features/legend-scanner/LegendScannerPanel";

// Reads legend-scanner-briefs/ fresh on every request so a brief the
// legend-scanner-agent just wrote shows up without restarting the server —
// same reasoning as the Research page. The live scan itself (LegendScannerPanel)
// fetches its own data client-side and never touches this folder.
export const dynamic = "force-dynamic";

export default function LegendScannerPage() {
  const briefs = getLegendBriefs();

  return (
    <>
      <Topbar title="Legend Scanner" />
      <main className="flex-1 space-y-6 overflow-y-auto p-8">
        <LegendScannerPanel />

        {briefs.map((brief) => (
          <LegendBriefCard key={`${brief.legend}-${brief.date}-${brief.updatedAt}`} brief={brief} />
        ))}
      </main>
    </>
  );
}
