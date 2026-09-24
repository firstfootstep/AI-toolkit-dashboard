"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EarningsQuarter } from "@/lib/earnings";

const ESTIMATE_COLOR = "#C7CFC8";
const BEAT_COLOR = "#1D7252";
const MISS_COLOR = "#D86D4D";

export function EpsChart({ quarters }: { quarters: EarningsQuarter[] }) {
  return (
    <div className="mx-auto h-56 w-full max-w-md">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={quarters} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%" barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#66736C" }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            tick={{ fontSize: 11, fill: "#66736C" }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip
            formatter={(value, name) => [
              typeof value === "number" ? `$${value.toFixed(2)}` : "Not yet reported",
              String(name),
            ]}
            labelFormatter={(label, payload) => {
              const date = payload?.[0]?.payload?.date;
              return date ? new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : label;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="epsEstimate" name="Estimate" fill={ESTIMATE_COLOR} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Bar
            dataKey="epsActual"
            name="Actual"
            fill={BEAT_COLOR}
            radius={[3, 3, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          >
            {quarters.map((q, i) => (
              <Cell
                key={i}
                fill={q.epsActual == null ? "transparent" : q.epsActual >= (q.epsEstimate ?? 0) ? BEAT_COLOR : MISS_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
