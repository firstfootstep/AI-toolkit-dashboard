"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function ResearchAgentForm() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim() || status === "loading") return;

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: symbol.trim() }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }

      setSymbol("");
      setStatus("idle");
      router.refresh(); // re-run the Research page's server component, picking up the new file
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Card title="Research a symbol">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-muted">
          Symbol
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="NVDA"
            disabled={status === "loading"}
            className="mt-1 w-32 rounded-[var(--radius-sm)] border border-line bg-paper px-2 py-1.5 text-sm uppercase text-ink"
          />
        </label>

        <button
          type="submit"
          disabled={status === "loading" || !symbol.trim()}
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary-bright px-3 py-1.5 text-sm font-medium text-paper transition-colors duration-200 hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Researching…
            </>
          ) : (
            <>
              <Search size={14} /> Research
            </>
          )}
        </button>

        {status === "loading" && (
          <p className="text-xs text-muted">
            Claude is web-searching and writing the brief — usually 30-90 seconds.
          </p>
        )}
        {status === "error" && error && <p className="text-xs text-coral">{error}</p>}
      </form>
    </Card>
  );
}
