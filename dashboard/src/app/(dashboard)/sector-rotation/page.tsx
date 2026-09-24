import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { RrgChart } from "@/features/sector-rotation/RrgChart";
import { QuadrantTable } from "@/features/sector-rotation/QuadrantTable";
import { getSectorRotation } from "@/lib/rrg";

export const dynamic = "force-dynamic";

export default async function SectorRotationPage() {
  const { source, benchmark, sectors } = await getSectorRotation();

  return (
    <>
      <Topbar title="Sector Rotation" />
      <main className="flex-1 space-y-6 overflow-y-auto p-8">
        <Card
          title={`Relative Rotation Graph vs ${benchmark}`}
          action={<DataSourceBadge source={source} />}
        >
          <p className="mb-4 text-sm text-muted">
            RS-Ratio (strength) vs RS-Momentum (acceleration) for each sector SPDR ETF against{" "}
            {benchmark}. The tail traces the last few trading days — Leading sectors are
            outperforming and accelerating, Lagging sectors are underperforming and still
            decelerating.
          </p>
          <RrgChart sectors={sectors} />
        </Card>

        <Card title="Quadrant snapshot">
          <QuadrantTable sectors={sectors} />
        </Card>
      </main>
    </>
  );
}
