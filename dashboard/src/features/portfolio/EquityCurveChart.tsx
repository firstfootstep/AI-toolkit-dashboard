"use client";

import { Area, AreaChart, Line, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact, formatCurrency } from "@/lib/format";
import type { JournalDailyPoint } from "@/lib/tradingJournal";

const CLOSED_EQUITY_COLOR = "#3B82F6";
const TOTAL_NAV_COLOR = "#14B8A6";

export function EquityCurveChart({ series }: { series: JournalDailyPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TOTAL_NAV_COLOR} stopOpacity={0.22} />
              <stop offset="100%" stopColor={TOTAL_NAV_COLOR} stopOpacity={0} />
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
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => formatCompact(v)}
            tick={{ fontSize: 11, fill: "#66736C" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
            labelFormatter={(d) => new Date(String(d)).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="totalNav"
            name="Total Live NAV"
            stroke={TOTAL_NAV_COLOR}
            strokeWidth={2}
            fill="url(#navFill)"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="closedEquity"
            name="Closed Equity"
            stroke={CLOSED_EQUITY_COLOR}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
