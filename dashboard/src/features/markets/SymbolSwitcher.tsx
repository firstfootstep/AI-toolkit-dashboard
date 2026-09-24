"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

// Jump-to-symbol search box above the chart — the ticker-chip row that used
// to sit next to it was removed per request; this is just the "type a
// symbol, hit enter" input that was bundled in the same component.
export function SymbolSwitcher() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function jumpToSymbol(e: React.FormEvent) {
    e.preventDefault();
    const symbol = query.trim().toUpperCase();
    if (symbol) router.push(`/chart?symbol=${encodeURIComponent(symbol)}`);
  }

  return (
    <form onSubmit={jumpToSymbol} className="flex items-center">
      <div className="flex w-full max-w-sm items-center gap-2 rounded-[var(--radius-md)] border border-line bg-paper px-4 py-2.5 shadow-[var(--shadow-sm)] transition-shadow duration-200 focus-within:border-primary-bright focus-within:shadow-[var(--shadow-md)]">
        <Search size={16} className="text-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jump to symbol…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
      </div>
    </form>
  );
}
