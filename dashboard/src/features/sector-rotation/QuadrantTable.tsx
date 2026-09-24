import { Badge } from "@/components/ui/Badge";
import type { Quadrant, SectorRotation } from "@/lib/rrg";

const QUADRANT_TONE: Record<Quadrant, "green" | "amber" | "red" | "blue"> = {
  Leading: "green",
  Weakening: "amber",
  Lagging: "red",
  Improving: "blue",
};

export function QuadrantTable({ sectors }: { sectors: SectorRotation[] }) {
  const sorted = [...sectors].sort((a, b) => b.current.momentum - a.current.momentum);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-muted">
          <th className="pb-2 font-medium">Sector</th>
          <th className="pb-2 font-medium">RS-Ratio</th>
          <th className="pb-2 font-medium">RS-Momentum</th>
          <th className="pb-2 font-medium">Quadrant</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {sorted.map((s) => (
          <tr key={s.symbol}>
            <td className="py-2.5 font-medium text-ink">
              {s.label} <span className="text-muted">({s.symbol})</span>
            </td>
            <td className="py-2.5 text-ink">{s.current.ratio.toFixed(2)}</td>
            <td className="py-2.5 text-ink">{s.current.momentum.toFixed(2)}</td>
            <td className="py-2.5">
              <Badge tone={QUADRANT_TONE[s.quadrant]}>{s.quadrant}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
