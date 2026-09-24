"use client";

import { useEffect, useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import watchlistFixture from "@/fixtures/watchlist.json";

interface AlertRule {
  id: string;
  symbol: string;
  direction: "above" | "below";
  price: number;
}

const STORAGE_KEY = "investview.alerts";

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [symbol, setSymbol] = useState(watchlistFixture.symbols[0]?.symbol ?? "");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [price, setPrice] = useState("");

  useEffect(() => {
    // One-time read of localStorage, unavailable during SSR — must happen post-mount.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setAlerts(JSON.parse(raw));
    } catch {
      // ignore corrupted local storage
    }
  }, []);

  function persist(next: AlertRule[]) {
    setAlerts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function addAlert() {
    const numeric = Number(price);
    if (!symbol || !Number.isFinite(numeric) || numeric <= 0) return;
    const next = [...alerts, { id: crypto.randomUUID(), symbol, direction, price: numeric }];
    persist(next);
    setPrice("");
  }

  function removeAlert(id: string) {
    persist(alerts.filter((a) => a.id !== id));
  }

  return (
    <Card title="Price alerts">
      <p className="mb-4 text-sm text-muted">
        Alerts are stored locally in this browser (no backend) — a starting point for wiring real
        notifications later.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-muted">
          Symbol
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="mt-1 rounded-[var(--radius-sm)] border border-line bg-paper px-2 py-1.5 text-sm text-ink"
          >
            {watchlistFixture.symbols.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-xs text-muted">
          Condition
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "above" | "below")}
            className="mt-1 rounded-[var(--radius-sm)] border border-line bg-paper px-2 py-1.5 text-sm text-ink"
          >
            <option value="above">Price goes above</option>
            <option value="below">Price goes below</option>
          </select>
        </label>

        <label className="flex flex-col text-xs text-muted">
          Price
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            className="mt-1 w-28 rounded-[var(--radius-sm)] border border-line bg-paper px-2 py-1.5 text-sm text-ink"
          />
        </label>

        <button
          onClick={addAlert}
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary-bright px-3 py-1.5 text-sm font-medium text-paper transition-colors duration-200 hover:bg-primary"
        >
          <Plus size={14} /> Add alert
        </button>
      </div>

      {alerts.length === 0 ? (
        <EmptyState icon={<Bell size={24} />} title="No alerts yet" description="Add one above to get started." />
      ) : (
        <ul className="divide-y divide-line">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
              <span>
                <span className="font-medium text-ink">{a.symbol}</span>{" "}
                <span className="text-muted">
                  {a.direction === "above" ? "goes above" : "goes below"} ${a.price.toFixed(2)}
                </span>
              </span>
              <button
                onClick={() => removeAlert(a.id)}
                className="text-muted hover:text-coral"
                aria-label={`Remove alert for ${a.symbol}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
