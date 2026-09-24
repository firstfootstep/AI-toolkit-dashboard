"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

export function MarketSummaryRefreshButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (status === "loading") return;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/market-summary", { method: "POST" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }

      setStatus("idle");
      router.refresh(); // re-run the Market & News page's server component, picking up the new file
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={status === "loading"}
        className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary-bright px-3 py-1.5 text-xs font-medium text-paper transition-colors duration-200 hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? (
          <>
            <Loader2 size={13} className="animate-spin" /> กำลังสรุป…
          </>
        ) : (
          <>
            <Sparkles size={13} /> สร้างสรุปตลาดวันนี้
          </>
        )}
      </button>
      {status === "loading" && <p className="text-xs text-muted">กำลังค้นเว็บหาข่าวจริง อาจใช้เวลา 1-3 นาที</p>}
      {status === "error" && error && <p className="max-w-56 text-right text-xs text-coral">{error}</p>}
    </div>
  );
}
