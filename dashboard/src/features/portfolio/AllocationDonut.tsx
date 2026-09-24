"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const COLORS = ["#1D7252", "#D9E99D", "#D86D4D", "#66736C", "#12382B"];

export function AllocationDonut({ data }: { data: { name: string; value: number; percent: number }[] }) {
  return (
    <div className="flex items-center gap-6">
      <div className="h-36 w-36 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={40} outerRadius={64} paddingAngle={2}>
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={COLORS[i % COLORS.length]} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {data.map((entry, i) => (
          <li key={entry.name} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-muted">{entry.name}</span>
            <span className="font-medium text-ink">{entry.percent.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
