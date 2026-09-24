"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";

const TABS = [
  { key: "overview", label: "ภาพรวม" },
  { key: "closed", label: "Closed Trades" },
  { key: "journal", label: "Journal" },
  { key: "coach", label: "Trading Coach" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function PortfolioTabs({
  overview,
  closed,
  journal,
  coach,
}: Record<TabKey, ReactNode>) {
  const [tab, setTab] = useState<TabKey>("overview");
  const panels: Record<TabKey, ReactNode> = { overview, closed, journal, coach };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200",
              tab === t.key ? "bg-primary-bright text-paper" : "bg-ink/6 text-muted hover:bg-ink/10"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="space-y-6">{panels[tab]}</div>
    </div>
  );
}
