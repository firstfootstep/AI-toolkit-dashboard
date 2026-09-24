import type { DataSourceStatus } from "@/types/market";

export interface ScannerRow {
  ticker: string; // "NASDAQ:AAPL" (TradingView-sourced) or bare symbol (Yahoo fallback)
  symbol: string;
  name: string;
  exchange?: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  volume?: number;
  marketCap?: number;
  history?: number[]; // sparkline — only available from the Yahoo fallback tier
  // Fundamentals — only available from the TradingView tier (see tvScreener.ts).
  // Undefined on the Yahoo/mock fallback tiers; filters treat "undefined" as
  // "unknown", not "fails the filter", so those rows just stay unaffected.
  peRatio?: number;
  epsDilGrowthPercent?: number;
  divYieldPercent?: number;
  analystRating?: number; // -1 (strong sell) .. +1 (strong buy)
  perfYearPercent?: number;
  revenueGrowthPercent?: number;
  pegRatio?: number;
  roePercent?: number;
  beta?: number;
  recentEarningsDate?: string; // ISO date
  upcomingEarningsDate?: string; // ISO date
  fiftyTwoWeekHigh?: number;
  relativeVolume?: number; // today's volume / 10-day average volume
  perf3MPercent?: number;
  perf6MPercent?: number;
  perfWeekPercent?: number;
  perf1MPercent?: number;
  // Percentile rank (0-100) of a blended 3M/6M/1Y price-performance score
  // within the current fetch's universe — a lightweight proxy for an
  // IBD-style Relative Strength rating, not that registered metric.
  // Computed server-side in data.ts after all TradingView rows are in, so
  // it's undefined on the Yahoo/mock fallback tiers like the other
  // TradingView-only fields above.
  rsScore?: number;
}

export interface ScannerMarket {
  id: string;
  label: string;
  currency: string;
}

export const SCANNER_MARKETS: ScannerMarket[] = [
  { id: "america", label: "United States", currency: "USD" },
  { id: "thailand", label: "Thailand", currency: "THB" },
  { id: "hongkong", label: "Hong Kong", currency: "HKD" },
  { id: "japan", label: "Japan", currency: "JPY" },
  { id: "uk", label: "United Kingdom", currency: "GBP" },
  { id: "germany", label: "Germany", currency: "EUR" },
  { id: "australia", label: "Australia", currency: "AUD" },
];

export interface ScannerUniverseResult {
  rows: ScannerRow[];
  source: DataSourceStatus;
  market: string;
  fetchedAt: string; // ISO timestamp — scanner has no cache, so this is
  // always "right now" as of this request, unlike quotes/news which may
  // be serving a cached value up to their TTL old.
}
