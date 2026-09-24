"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const CURRENCY_KEY = "investview.currency";

export function SettingsPanel() {
  const [currency, setCurrency] = useState("USD");
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    // One-time read of localStorage, unavailable during SSR — must happen post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrency(localStorage.getItem(CURRENCY_KEY) ?? "USD");
  }, []);

  function updateCurrency(value: string) {
    setCurrency(value);
    localStorage.setItem(CURRENCY_KEY, value);
  }

  function clearLocalData() {
    localStorage.removeItem("investview.tradingJournal");
    localStorage.removeItem("investview.alerts");
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  }

  return (
    <div className="space-y-6">
      <Card title="Display">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Display currency</span>
          <select
            value={currency}
            onChange={(e) => updateCurrency(e.target.value)}
            className="w-40 rounded-[var(--radius-sm)] border border-line bg-paper px-2 py-1.5 text-ink"
          >
            <option value="USD">USD ($)</option>
            <option value="THB">THB (฿)</option>
            <option value="EUR">EUR (€)</option>
          </select>
          <span className="text-xs text-muted/70">
            Stored in this browser only — used by future pages that read from localStorage.
          </span>
        </label>
      </Card>

      <Card title="Data sources">
        <ul className="space-y-2 text-sm text-muted">
          <li>
            Stock quotes: <span className="font-medium">Yahoo Finance chart API</span> (keyless) — falls back to{" "}
            <code className="rounded bg-ink/6 px-1 py-0.5 text-xs">
              src/fixtures/quotes.json
            </code>{" "}
            if unreachable.
          </li>
          <li>
            News: <span className="font-medium">Yahoo Finance RSS</span> (keyless) — falls back to{" "}
            <code className="rounded bg-ink/6 px-1 py-0.5 text-xs">
              src/fixtures/news.json
            </code>{" "}
            if unreachable.
          </li>
          <li>
            Portfolio &amp; holdings: <span className="font-medium">mock data</span> derived from{" "}
            <code className="rounded bg-ink/6 px-1 py-0.5 text-xs">
              src/fixtures/trade-setups.csv
            </code>
            , or your own imported trading journal on the Portfolio page.
          </li>
        </ul>
      </Card>

      <Card title="Local data">
        <p className="mb-3 text-sm text-muted">
          Clears your imported trading journal and price alerts from this browser&apos;s local storage.
        </p>
        <button
          onClick={clearLocalData}
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-coral/30 px-3 py-1.5 text-sm font-medium text-coral transition-colors duration-200 hover:bg-coral/10"
        >
          <Trash2 size={14} /> Clear imported journal &amp; alerts
        </button>
        {cleared && (
          <span className="ml-3">
            <Badge tone="green">Cleared</Badge>
          </span>
        )}
      </Card>
    </div>
  );
}
