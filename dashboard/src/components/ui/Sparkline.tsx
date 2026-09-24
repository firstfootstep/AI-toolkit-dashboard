"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

const strokes = {
  up: "#1D7252",
  down: "#D86D4D",
  neutral: "#66736C",
};

export function Sparkline({
  data,
  tone = "neutral",
}: {
  data: number[];
  tone?: "up" | "down" | "neutral";
}) {
  // A single data point renders as a dot, not a line — pad it into a flat
  // 2-point line instead (happens for thinly-traded tickers where the live
  // upstream only returns one valid close in the requested range).
  const safeData = data.length >= 2 ? data : [data[0] ?? 0, data[0] ?? 0];
  const points = safeData.map((value, i) => ({ i, value }));

  // Guard the degenerate case (all values identical) — an equal min/max
  // domain renders nothing at all, so pad it into a tiny visible range.
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const domain: [number, number] = min === max ? [min - 1, max + 1] : [min, max];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points}>
        {/* Without an explicit domain, recharts defaults the value axis to
            start at 0 — invisible movement for a large absolute value with a
            small daily swing (e.g. an index at 7,700 moving 1.5%). Zoom to
            the actual data range instead so the shape is always visible. */}
        <YAxis hide domain={domain} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={strokes[tone]}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
