"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SectorRotation } from "@/lib/rrg";

// Distinct, stable color per sector so the tail lines stay readable across 11 series.
const COLORS = [
  "#1D7252", "#B4571F", "#2662A8", "#8A4FBF", "#C0392B",
  "#178A73", "#B08900", "#5B6B73", "#A2472F", "#3F6B4A", "#7A5C2E",
];

const STEP_MS = 900;

function round(value: number, step: number, dir: "floor" | "ceil"): number {
  return Math[dir](value / step) * step;
}

export function RrgChart({ sectors }: { sectors: SectorRotation[] }) {
  // Full history (unaffected by playback) drives a fixed axis domain, so the
  // chart doesn't rescale/jitter as the animation reveals more points.
  const allPoints = sectors.flatMap((s) => s.points);
  const ratios = allPoints.map((p) => p.ratio);
  const momenta = allPoints.map((p) => p.momentum);
  const xDomain: [number, number] = [round(Math.min(...ratios) - 0.5, 0.5, "floor"), round(Math.max(...ratios) + 0.5, 0.5, "ceil")];
  const yDomain: [number, number] = [round(Math.min(...momenta) - 0.5, 0.5, "floor"), round(Math.max(...momenta) + 0.5, 0.5, "ceil")];
  const numberFmt = (v: number) => v.toFixed(1);

  const maxSteps = Math.max(1, ...sectors.map((s) => s.points.length));
  const [step, setStep] = useState(maxSteps - 1);
  const [playing, setPlaying] = useState(false);

  // Animates the tail growing frame-by-frame from the oldest point up to
  // today, looping back to the start — the classic RRG "play the rotation"
  // view instead of a single static frame.
  useEffect(() => {
    if (!playing || maxSteps <= 1) return;
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % maxSteps);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [playing, maxSteps]);

  const dateLabel = useMemo(() => {
    const withDate = sectors.find((s) => s.points[step]?.date);
    const raw = withDate?.points[step]?.date;
    if (!raw) return "";
    return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [sectors, step]);

  const visibleSectors = sectors.map((sector) => {
    const visiblePoints = sector.points.slice(0, step + 1);
    return {
      ...sector,
      points: visiblePoints,
      head: visiblePoints[visiblePoints.length - 1] ?? sector.current,
    };
  });

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={() => setPlaying((p) => !p)}
          disabled={maxSteps <= 1}
          className="flex items-center gap-1.5 rounded-full bg-primary-bright px-3 py-1.5 text-xs font-semibold text-paper transition-colors duration-200 hover:bg-primary-bright/90 disabled:opacity-40"
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
          {playing ? "Pause" : "Play rotation"}
        </button>
        <input
          type="range"
          min={0}
          max={maxSteps - 1}
          step={1}
          value={step}
          onChange={(e) => {
            setPlaying(false);
            setStep(Number(e.target.value));
          }}
          className="h-1.5 flex-1 accent-[var(--color-primary-bright)]"
        />
        <span className="w-16 flex-none text-right font-[family-name:var(--font-ui)] text-xs text-muted">
          {dateLabel}
        </span>
      </div>

      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <XAxis
              type="number"
              dataKey="ratio"
              domain={xDomain}
              tickFormatter={numberFmt}
              tick={{ fontSize: 12, fill: "#66736C" }}
              label={{ value: "RS-Ratio", position: "insideBottom", offset: -4, fontSize: 12, fill: "#66736C" }}
            />
            <YAxis
              type="number"
              dataKey="momentum"
              domain={yDomain}
              tickFormatter={numberFmt}
              tick={{ fontSize: 12, fill: "#66736C" }}
              label={{ value: "RS-Momentum", angle: -90, position: "insideLeft", fontSize: 12, fill: "#66736C" }}
            />
            <ZAxis range={[110, 110]} />
            <ReferenceLine x={100} stroke="#C7CFC9" strokeDasharray="4 4" />
            <ReferenceLine y={100} stroke="#C7CFC9" strokeDasharray="4 4" />
            <Tooltip
              formatter={(value, name) => [Number(value).toFixed(2), String(name)]}
              labelFormatter={() => ""}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />

            {visibleSectors.map((sector, i) => (
              <Line
                key={sector.symbol}
                data={sector.points}
                dataKey="momentum"
                name={sector.label}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={1.25}
                strokeOpacity={0.55}
                dot={{ r: 1.5, fill: COLORS[i % COLORS.length], strokeWidth: 0 }}
                activeDot={false}
                isAnimationActive={false}
                legendType="none"
              />
            ))}

            {visibleSectors.map((sector, i) => (
              <Scatter
                key={`${sector.symbol}-head`}
                data={[sector.head]}
                dataKey="momentum"
                name={sector.label}
                fill={COLORS[i % COLORS.length]}
                shape="circle"
                isAnimationActive={false}
                legendType="circle"
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
