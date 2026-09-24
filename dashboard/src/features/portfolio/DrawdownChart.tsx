"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { JournalDailyPoint } from "@/lib/tradingJournal";

const DRAWDOWN_COLOR = "#EF4444";

export function DrawdownChart({ series }: { series: JournalDailyPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DRAWDOWN_COLOR} stopOpacity={0} />
              <stop offset="100%" stopColor={DRAWDOWN_COLOR} stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E9E6" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            tick={{ fontSize: 11, fill: "#66736C" }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={["dataMin", 0]}
            tickFormatter={(v: number) => `${v.toFixed(2)}%`}
            tick={{ fontSize: 11, fill: "#66736C" }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)}%`, "NAV Drawdown"]}
            labelFormatter={(d) => new Date(String(d)).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="drawdownPercent"
            name="NAV Drawdown %"
            stroke={DRAWDOWN_COLOR}
            strokeWidth={2}
            fill="url(#drawdownFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
