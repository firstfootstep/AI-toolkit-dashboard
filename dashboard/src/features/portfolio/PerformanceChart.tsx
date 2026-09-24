"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact, formatCurrency } from "@/lib/format";

export function PerformanceChart({ series }: { series: { date: string; value: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="performanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D7252" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#1D7252" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
            tick={{ fontSize: 12, fill: "#66736C" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatCompact(v)}
            tick={{ fontSize: 12, fill: "#66736C" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            labelFormatter={(d) => new Date(String(d)).toLocaleDateString("en-US", { day: "numeric", month: "long" })}
          />
          <Area type="monotone" dataKey="value" stroke="#1D7252" strokeWidth={2} fill="url(#performanceFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
