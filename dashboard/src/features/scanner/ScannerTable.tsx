"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Search, X, Zap } from "lucide-react";
import { formatCompact, formatCurrency, formatPercent } from "@/lib/format";
import type { ScannerRow } from "@/features/scanner/types";

type SortKey =
  | "symbol"
  | "price"
  | "change"
  | "changePercent"
  | "sector"
  | "volume"
  | "marketCap"
  | "fiftyTwoWeekHigh"
  | "pctFrom52wHigh"
  | "relativeVolume"
  | "revenueGrowthPercent"
  | "rsScore"
  | "perfYearPercent";
type SortDir = "asc" | "desc";

function sortValue(r: ScannerRow, key: SortKey): number | string {
  switch (key) {
    case "symbol":
      return r.symbol;
    case "sector":
      return r.sector;
    case "price":
      return r.price;
    case "change":
      return r.change;
    case "changePercent":
      return r.changePercent;
    case "volume":
      return r.volume ?? -Infinity;
    case "marketCap":
      return r.marketCap ?? -Infinity;
    case "fiftyTwoWeekHigh":
      return r.fiftyTwoWeekHigh ?? -Infinity;
    case "pctFrom52wHigh":
      return r.fiftyTwoWeekHigh ? (r.price / r.fiftyTwoWeekHigh - 1) * 100 : -Infinity;
    case "relativeVolume":
      return r.relativeVolume ?? -Infinity;
    case "revenueGrowthPercent":
      return r.revenueGrowthPercent ?? -Infinity;
    case "rsScore":
      return r.rsScore ?? -Infinity;
    case "perfYearPercent":
      return r.perfYearPercent ?? -Infinity;
  }
}

const inputClass =
  "rounded-[var(--radius-sm)] border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-primary-bright";

interface RangeFilterDef {
  key: string;
  label: string;
  unit?: string;
  // Values in the popover are typed in "display units" (e.g. millions for
  // volume/market cap); `scale` converts that back to the row's raw units.
  scale?: number;
  accessor: (r: ScannerRow) => number | undefined;
}

// Price/% change/volume come from every tier. Everything from P/E down is
// TradingView-only (see tvScreener.ts) — Yahoo/mock rows just have
// `undefined` there, so those rows drop out the moment one of these is used.
const RANGE_FILTERS: RangeFilterDef[] = [
  { key: "price", label: "Price", accessor: (r) => r.price },
  { key: "changePercent", label: "Chg %", unit: "%", accessor: (r) => r.changePercent },
  { key: "marketCap", label: "Mkt cap", unit: "M", scale: 1_000_000, accessor: (r) => r.marketCap },
  { key: "volume", label: "Volume", unit: "M", scale: 1_000_000, accessor: (r) => r.volume },
  { key: "peRatio", label: "P/E", accessor: (r) => r.peRatio },
  { key: "epsDilGrowthPercent", label: "EPS dil growth", unit: "%", accessor: (r) => r.epsDilGrowthPercent },
  { key: "divYieldPercent", label: "Div yield %", unit: "%", accessor: (r) => r.divYieldPercent },
  { key: "analystRating", label: "Analyst rating", accessor: (r) => r.analystRating },
  { key: "perfYearPercent", label: "Perf % (1Y)", unit: "%", accessor: (r) => r.perfYearPercent },
  { key: "revenueGrowthPercent", label: "Revenue growth", unit: "%", accessor: (r) => r.revenueGrowthPercent },
  { key: "pegRatio", label: "PEG", accessor: (r) => r.pegRatio },
  { key: "roePercent", label: "ROE", unit: "%", accessor: (r) => r.roePercent },
  { key: "beta", label: "Beta", accessor: (r) => r.beta },
  {
    key: "pctFrom52wHigh",
    label: "% from 52W high",
    unit: "%",
    accessor: (r) => (r.fiftyTwoWeekHigh ? (r.price / r.fiftyTwoWeekHigh - 1) * 100 : undefined),
  },
  { key: "relativeVolume", label: "Rel. volume (10d)", accessor: (r) => r.relativeVolume },
  { key: "rsScore", label: "RS score", accessor: (r) => r.rsScore },
];

interface DateFilterDef {
  key: string;
  label: string;
  accessor: (r: ScannerRow) => string | undefined;
}

const DATE_FILTERS: DateFilterDef[] = [
  { key: "recentEarningsDate", label: "Recent earnings date", accessor: (r) => r.recentEarningsDate },
  { key: "upcomingEarningsDate", label: "Upcoming earnings date", accessor: (r) => r.upcomingEarningsDate },
];

type RangeValue = { min: string; max: string };
type DateRangeValue = { from: string; to: string };

type PresetKey = "near52w" | "volumeSurge" | "revenueGrowth" | "rsHigh" | "all";

interface PresetDef {
  key: PresetKey;
  label: string;
  test: (r: ScannerRow) => boolean;
}

// The scan-preset tab bar — each tab is a fixed threshold over one of the
// TradingView-only fields above, mutually exclusive with the others (only
// one preset narrows the table at a time), "Screener (Universe)" being the
// no-op "show everything fetched" tab. Counts badge each tab against the
// full `rows` set regardless of which preset is currently active.
const PRESETS: PresetDef[] = [
  {
    key: "near52w",
    label: "เบรค 52WH",
    test: (r) => r.fiftyTwoWeekHigh != null && (r.price / r.fiftyTwoWeekHigh - 1) * 100 >= -5,
  },
  {
    key: "volumeSurge",
    label: "โวลุ่มเข้า",
    test: (r) => (r.relativeVolume ?? 0) >= 1.5 && r.changePercent > 0,
  },
  { key: "revenueGrowth", label: "งบโต", test: (r) => (r.revenueGrowthPercent ?? -Infinity) >= 20 },
  { key: "rsHigh", label: "RS Score เยอะ", test: (r) => (r.rsScore ?? -1) >= 90 },
];

const PRESET_DESCRIPTIONS: Record<PresetKey, string> = {
  all: "",
  near52w: "ราคาปิดห่างจาก 52-week high ไม่เกิน 5%",
  volumeSurge: "วอลุ่มวันนี้ ≥ 1.5 เท่าของค่าเฉลี่ย 10 วัน และราคา % เปลี่ยนแปลงเป็นบวก",
  revenueGrowth: "รายได้เติบโต YoY ≥ 20%",
  rsHigh: "RS Score (percentile 3M/6M/1Y) ≥ 90",
};

const PRESET_DEFAULT_SORT: Record<PresetKey, { key: SortKey; dir: SortDir }> = {
  all: { key: "changePercent", dir: "desc" },
  near52w: { key: "pctFrom52wHigh", dir: "desc" },
  volumeSurge: { key: "relativeVolume", dir: "desc" },
  revenueGrowth: { key: "revenueGrowthPercent", dir: "desc" },
  rsHigh: { key: "rsScore", dir: "desc" },
};

interface ExtraColumn {
  key: string;
  label: string;
  sortKey: SortKey;
  render: (r: ScannerRow) => React.ReactNode;
}

// The columns after Market Cap change to match whichever preset tab is
// active — "all" (Screener/Universe) shows the general trading columns,
// each scan tab instead surfaces the 1-2 columns that explain why a row
// made that particular cut.
const EXTRA_COLUMNS: Record<PresetKey, ExtraColumn[]> = {
  all: [
    {
      key: "change",
      label: "Change",
      sortKey: "change",
      render: (r) => (
        <span className={r.change >= 0 ? "text-primary-bright" : "text-coral"}>
          {r.change >= 0 ? "+" : ""}
          {r.change.toFixed(2)}
        </span>
      ),
    },
    { key: "volume", label: "Volume", sortKey: "volume", render: (r) => (r.volume ? formatCompact(r.volume) : "—") },
    {
      key: "rsScore",
      label: "RS",
      sortKey: "rsScore",
      render: (r) => (r.rsScore != null ? String(Math.round(r.rsScore)) : "—"),
    },
  ],
  near52w: [
    {
      key: "fiftyTwoWeekHigh",
      label: "52W High",
      sortKey: "fiftyTwoWeekHigh",
      render: (r) => (r.fiftyTwoWeekHigh ? formatCurrency(r.fiftyTwoWeekHigh, r.currency) : "—"),
    },
    {
      key: "pctFrom52wHigh",
      label: "ห่างจากจุดสูงสุด",
      sortKey: "pctFrom52wHigh",
      render: (r) => (r.fiftyTwoWeekHigh ? `${((r.price / r.fiftyTwoWeekHigh - 1) * 100).toFixed(2)}%` : "—"),
    },
  ],
  volumeSurge: [
    { key: "volume", label: "Volume", sortKey: "volume", render: (r) => (r.volume ? formatCompact(r.volume) : "—") },
    {
      key: "relativeVolume",
      label: "Rel. volume (10d)",
      sortKey: "relativeVolume",
      render: (r) => (r.relativeVolume ? `${r.relativeVolume.toFixed(2)}x` : "—"),
    },
  ],
  revenueGrowth: [
    {
      key: "revenueGrowthPercent",
      label: "Revenue growth (YoY)",
      sortKey: "revenueGrowthPercent",
      render: (r) => (r.revenueGrowthPercent != null ? formatPercent(r.revenueGrowthPercent) : "—"),
    },
  ],
  rsHigh: [
    {
      key: "rsScore",
      label: "RS Score",
      sortKey: "rsScore",
      render: (r) => (r.rsScore != null ? String(Math.round(r.rsScore)) : "—"),
    },
    {
      key: "perfYearPercent",
      label: "Perf % (1Y)",
      sortKey: "perfYearPercent",
      render: (r) => (r.perfYearPercent != null ? formatPercent(r.perfYearPercent) : "—"),
    },
  ],
};

export function ScannerTable({ rows }: { rows: ScannerRow[] }) {
  const [query, setQuery] = useState("");
  const [sectors, setSectors] = useState<Set<string>>(new Set());
  const [ranges, setRanges] = useState<Record<string, RangeValue>>({});
  const [dateRanges, setDateRanges] = useState<Record<string, DateRangeValue>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("changePercent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [preset, setPreset] = useState<PresetKey>("all");

  const presetCounts = useMemo(() => {
    const counts: Record<PresetKey, number> = { all: rows.length, near52w: 0, volumeSurge: 0, revenueGrowth: 0, rsHigh: 0 };
    for (const r of rows) {
      for (const p of PRESETS) {
        if (p.test(r)) counts[p.key]++;
      }
    }
    return counts;
  }, [rows]);

  // Sector taxonomy differs by data source (TradingView's "Electronic
  // Technology" vs. the Yahoo-fallback fixture's "Technology"), so the chip
  // list is derived from whatever rows were actually loaded, not hardcoded.
  const sectorOptions = useMemo(() => [...new Set(rows.map((r) => r.sector))].sort(), [rows]);

  function toggleSector(sector: string) {
    setSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  }

  function setRange(key: string, patch: Partial<RangeValue>) {
    setRanges((prev) => {
      const current = prev[key] ?? { min: "", max: "" };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  }

  function setDateRange(key: string, patch: Partial<DateRangeValue>) {
    setDateRanges((prev) => {
      const current = prev[key] ?? { from: "", to: "" };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Switching preset also switches the sort to whatever that preset is
  // actually scanning for (e.g. closest-to-52W-high first), since the old
  // sort key's column may not even be visible in the new column set.
  function activatePreset(key: PresetKey) {
    setPreset(key);
    const defaultSort = PRESET_DEFAULT_SORT[key];
    setSortKey(defaultSort.key);
    setSortDir(defaultSort.dir);
  }

  function resetFilters() {
    setQuery("");
    setSectors(new Set());
    setRanges({});
    setDateRanges({});
    activatePreset("all");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const presetDef = preset === "all" ? undefined : PRESETS.find((p) => p.key === preset);

    const result = rows.filter((r) => {
      if (presetDef && !presetDef.test(r)) return false;
      if (q && !r.symbol.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false;
      if (sectors.size > 0 && !sectors.has(r.sector)) return false;

      for (const f of RANGE_FILTERS) {
        const range = ranges[f.key];
        if (!range || (range.min.trim() === "" && range.max.trim() === "")) continue;
        const scale = f.scale ?? 1;
        const min = range.min.trim() === "" ? -Infinity : Number(range.min) * scale;
        const max = range.max.trim() === "" ? Infinity : Number(range.max) * scale;
        const v = f.accessor(r);
        if (v === undefined || v < min || v > max) return false;
      }

      for (const f of DATE_FILTERS) {
        const range = dateRanges[f.key];
        if (!range || (!range.from && !range.to)) continue;
        const v = f.accessor(r);
        if (!v) return false;
        const t = new Date(v).getTime();
        if (range.from && t < new Date(range.from).getTime()) return false;
        if (range.to && t > new Date(range.to).getTime()) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [rows, query, sectors, ranges, dateRanges, sortKey, sortDir, preset]);

  const activeFilterCount =
    (query ? 1 : 0) +
    sectors.size +
    (preset !== "all" ? 1 : 0) +
    Object.values(ranges).reduce((n, r) => n + (r.min.trim() !== "" ? 1 : 0) + (r.max.trim() !== "" ? 1 : 0), 0) +
    Object.values(dateRanges).reduce((n, r) => n + (r.from ? 1 : 0) + (r.to ? 1 : 0), 0);

  const changeRange = ranges.changePercent ?? { min: "", max: "" };
  const extraColumns = EXTRA_COLUMNS[preset];

  return (
    <div className="space-y-4">
      {openFilter && <div className="fixed inset-0 z-10" onClick={() => setOpenFilter(null)} />}

      <div className="rounded-[var(--radius-md)] border-2 border-primary-bright/30 bg-primary-bright/6 p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Zap size={14} className="text-primary-bright" aria-hidden />
          <h4 className="font-[family-name:var(--font-ui)] text-xs font-bold uppercase tracking-wide text-primary-bright">
            เลือกสแกนด่วน — กดตรงนี้ก่อน
          </h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <PresetTab
              key={p.key}
              label={p.label}
              count={presetCounts[p.key]}
              active={preset === p.key}
              onClick={() => activatePreset(preset === p.key ? "all" : p.key)}
            />
          ))}
          <PresetTab
            label="Screener (Universe)"
            count={presetCounts.all}
            active={preset === "all"}
            onClick={() => activatePreset("all")}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5">
          <Search size={14} className="text-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol or name…"
            className="w-40 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </div>

        <SectorFilterPill
          options={sectorOptions}
          selected={sectors}
          onToggle={toggleSector}
          open={openFilter === "sector"}
          onToggleOpen={() => setOpenFilter((k) => (k === "sector" ? null : "sector"))}
        />

        {RANGE_FILTERS.map((f) => {
          const value = ranges[f.key] ?? { min: "", max: "" };
          return (
            <RangeFilterPill
              key={f.key}
              label={f.label}
              unit={f.unit}
              value={value}
              open={openFilter === f.key}
              onToggleOpen={() => setOpenFilter((k) => (k === f.key ? null : f.key))}
              onChange={(patch) => setRange(f.key, patch)}
            />
          );
        })}

        {DATE_FILTERS.map((f) => {
          const value = dateRanges[f.key] ?? { from: "", to: "" };
          return (
            <DateFilterPill
              key={f.key}
              label={f.label}
              value={value}
              open={openFilter === f.key}
              onToggleOpen={() => setOpenFilter((k) => (k === f.key ? null : f.key))}
              onChange={(patch) => setDateRange(f.key, patch)}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <QuickFilterChip
          active={changeRange.min === "0" && changeRange.max === ""}
          activeTone="up"
          onClick={() => setRange("changePercent", { min: "0", max: "" })}
        >
          Gainers only
        </QuickFilterChip>
        <QuickFilterChip
          active={changeRange.max === "0" && changeRange.min === ""}
          activeTone="down"
          onClick={() => setRange("changePercent", { min: "", max: "0" })}
        >
          Losers only
        </QuickFilterChip>

        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs font-medium text-muted hover:text-coral"
          >
            <X size={12} /> Clear filters ({activeFilterCount})
          </button>
        )}
      </div>

      <p className="text-xs text-muted">
        {preset !== "all" && (
          <>
            <span className="font-medium text-ink-soft">เงื่อนไข:</span> {PRESET_DESCRIPTIONS[preset]} ·{" "}
          </>
        )}
        Showing {filtered.length} of {rows.length} symbols
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <SortableHeader label="Symbol" sortKey="symbol" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
              <th className="py-2 font-medium">Name</th>
              <SortableHeader label="Sector" sortKey="sector" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Price" sortKey="price" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <SortableHeader
                label="% Change"
                sortKey="changePercent"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                align="right"
              />
              <SortableHeader
                label="Market cap"
                sortKey="marketCap"
                activeKey={sortKey}
                dir={sortDir}
                onSort={toggleSort}
                align="right"
              />
              {extraColumns.map((c) => (
                <SortableHeader
                  key={c.key}
                  label={c.label}
                  sortKey={c.sortKey}
                  activeKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                  align="right"
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const up = r.change >= 0;
              return (
                <tr key={r.ticker} className="border-b border-line last:border-0">
                  <td className="py-2.5">
                    <Link
                      href={`/chart?symbol=${r.symbol}${r.exchange ? `&exchange=${r.exchange}` : ""}`}
                      className="flex items-center gap-2 font-medium text-ink hover:underline"
                    >
                      <span className={"h-1.5 w-1.5 rounded-full " + (up ? "bg-primary-bright" : "bg-coral")} />
                      {r.symbol}
                    </Link>
                  </td>
                  <td className="py-2.5 text-muted">{r.name}</td>
                  <td className="py-2.5 text-muted">{r.sector}</td>
                  <td className="py-2.5 text-right text-ink">{formatCurrency(r.price, r.currency)}</td>
                  <td className={"py-2.5 text-right " + (up ? "text-primary-bright" : "text-coral")}>
                    {formatPercent(r.changePercent)}
                  </td>
                  <td className="py-2.5 text-right text-muted">
                    {r.marketCap ? formatCurrency(r.marketCap, r.currency).replace(/\.\d+$/, "") : "—"}
                  </td>
                  {extraColumns.map((c) => (
                    <td key={c.key} className="py-2.5 text-right text-muted">
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6 + extraColumns.length} className="py-8 text-center text-sm text-muted">
                  No symbols match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterPillButton({
  label,
  active,
  open,
  onClick,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      className={clsx(
        "flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200",
        active ? "bg-primary text-paper" : "bg-ink/6 text-muted hover:bg-ink/12"
      )}
    >
      {label}
      <ChevronDown size={12} className={clsx("transition-transform duration-200", open && "rotate-180")} />
    </button>
  );
}

function RangeFilterPill({
  label,
  unit,
  value,
  open,
  onToggleOpen,
  onChange,
}: {
  label: string;
  unit?: string;
  value: RangeValue;
  open: boolean;
  onToggleOpen: () => void;
  onChange: (patch: Partial<RangeValue>) => void;
}) {
  const active = value.min.trim() !== "" || value.max.trim() !== "";

  return (
    <div className="relative">
      <FilterPillButton label={label} active={active} open={open} onClick={onToggleOpen} />
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-20 mt-1 flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line bg-paper p-2 shadow-md"
        >
          <input
            value={value.min}
            onChange={(e) => onChange({ min: e.target.value })}
            placeholder="min"
            inputMode="decimal"
            className={clsx(inputClass, "w-16")}
          />
          <span className="text-muted">–</span>
          <input
            value={value.max}
            onChange={(e) => onChange({ max: e.target.value })}
            placeholder="max"
            inputMode="decimal"
            className={clsx(inputClass, "w-16")}
          />
          {unit && <span className="text-xs text-muted">{unit}</span>}
        </div>
      )}
    </div>
  );
}

function DateFilterPill({
  label,
  value,
  open,
  onToggleOpen,
  onChange,
}: {
  label: string;
  value: DateRangeValue;
  open: boolean;
  onToggleOpen: () => void;
  onChange: (patch: Partial<DateRangeValue>) => void;
}) {
  const active = value.from !== "" || value.to !== "";

  return (
    <div className="relative">
      <FilterPillButton label={label} active={active} open={open} onClick={onToggleOpen} />
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-20 mt-1 flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-line bg-paper p-2 shadow-md"
        >
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ from: e.target.value })}
            className={clsx(inputClass, "w-36")}
          />
          <span className="text-muted">–</span>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ to: e.target.value })}
            className={clsx(inputClass, "w-36")}
          />
        </div>
      )}
    </div>
  );
}

function PresetTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all duration-200",
        active
          ? "border-primary-bright bg-primary-bright text-paper shadow-[var(--shadow-sm)]"
          : "border-line bg-paper text-ink hover:border-primary-bright/40 hover:bg-primary-bright/6"
      )}
    >
      {label}
      <span
        className={clsx(
          "rounded-full px-2 py-0.5 text-xs font-bold",
          active ? "bg-paper/20 text-paper" : "bg-ink/6 text-muted"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SectorFilterPill({
  options,
  selected,
  onToggle,
  open,
  onToggleOpen,
}: {
  options: string[];
  selected: Set<string>;
  onToggle: (sector: string) => void;
  open: boolean;
  onToggleOpen: () => void;
}) {
  return (
    <div className="relative">
      <FilterPillButton
        label={selected.size > 0 ? `Sector (${selected.size})` : "Sector"}
        active={selected.size > 0}
        open={open}
        onClick={onToggleOpen}
      />
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-20 mt-1 flex max-h-64 w-56 flex-col gap-1 overflow-y-auto rounded-[var(--radius-sm)] border border-line bg-paper p-2 shadow-md"
        >
          {options.map((sector) => (
            <label key={sector} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-ink hover:bg-ink/6">
              <input
                type="checkbox"
                checked={selected.has(sector)}
                onChange={() => onToggle(sector)}
                className="accent-[var(--color-primary)]"
              />
              {sector}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickFilterChip({
  active,
  activeTone,
  onClick,
  children,
}: {
  active: boolean;
  activeTone: "up" | "down";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200",
        active
          ? activeTone === "up"
            ? "bg-primary-bright/12 text-primary-bright"
            : "bg-coral/14 text-coral"
          : "bg-ink/6 text-muted hover:bg-ink/12"
      )}
    >
      {children}
    </button>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "right";
}) {
  const active = sortKey === activeKey;
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className={clsx("py-2 font-medium", align === "right" && "text-right")}>
      <button
        onClick={() => onSort(sortKey)}
        className={clsx(
          "inline-flex items-center gap-1 transition-colors duration-200 hover:text-ink",
          align === "right" && "flex-row-reverse",
          active && "text-ink"
        )}
      >
        {label}
        <Icon size={12} className={active ? "text-primary-bright" : "text-muted/60"} aria-hidden />
      </button>
    </th>
  );
}
