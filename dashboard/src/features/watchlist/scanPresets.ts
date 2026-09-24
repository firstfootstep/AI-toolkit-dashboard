import type { ScannerRow } from "@/features/scanner/types";

// The first 4 (near52w/volumeSurge/revenueGrowth/rsHigh) mirror the scan-preset
// thresholds in src/features/scanner/ScannerTable.tsx's PRESETS — kept as a
// separate, server-safe copy (this page renders server-side via
// getScannerUniverse; ScannerTable is a "use client" component) rather than a
// shared import. Keep those 4 in sync with ScannerTable if their thresholds
// change. The rest (valueQuality/analystBuy/momentum1M/dividendValue/
// earningsSoon) are watchlist-only and have no Scanner tab equivalent.
export interface WatchlistPreset {
  key:
    | "near52w"
    | "volumeSurge"
    | "revenueGrowth"
    | "rsHigh"
    | "valueQuality"
    | "analystBuy"
    | "momentum1M"
    | "dividendValue"
    | "earningsSoon";
  label: string;
  description: string;
  test: (r: ScannerRow) => boolean;
  rank: (r: ScannerRow) => number; // higher = stronger match; used to pick the top 10
}

// Days between now and an ISO date string; negative if the date is in the past.
function daysUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 86_400_000;
}

export const WATCHLIST_PRESETS: WatchlistPreset[] = [
  {
    key: "near52w",
    label: "เบรค 52WH",
    description: "ใกล้ 52-week high ที่สุด — ราคาปิดห่างจากจุดสูงสุดไม่เกิน 5%",
    test: (r) => r.fiftyTwoWeekHigh != null && (r.price / r.fiftyTwoWeekHigh - 1) * 100 >= -5,
    rank: (r) => (r.fiftyTwoWeekHigh ? (r.price / r.fiftyTwoWeekHigh - 1) * 100 : -Infinity),
  },
  {
    key: "volumeSurge",
    label: "โวลุ่มเข้า",
    description: "วอลุ่มวันนี้เทียบค่าเฉลี่ย 10 วันสูงที่สุด (อย่างน้อย 1.5 เท่า) และราคาบวก",
    test: (r) => (r.relativeVolume ?? 0) >= 1.5 && r.changePercent > 0,
    rank: (r) => r.relativeVolume ?? -Infinity,
  },
  {
    key: "revenueGrowth",
    label: "งบโต",
    description: "รายได้เติบโต YoY สูงที่สุด — อย่างน้อย 20%",
    test: (r) => (r.revenueGrowthPercent ?? -Infinity) >= 20,
    rank: (r) => r.revenueGrowthPercent ?? -Infinity,
  },
  {
    key: "rsHigh",
    label: "RS Score เยอะ",
    description: "RS Score (percentile 3M/6M/1Y) สูงที่สุด — อย่างน้อย 90",
    test: (r) => (r.rsScore ?? -1) >= 90,
    rank: (r) => r.rsScore ?? -Infinity,
  },
  {
    key: "valueQuality",
    label: "ถูกและดี (GARP)",
    description: "PEG < 1, ROE ≥ 15% และมี P/E เป็นบวก — หุ้นถูกเทียบกับการเติบโต แต่คุณภาพยังดี",
    test: (r) =>
      r.pegRatio != null &&
      r.pegRatio > 0 &&
      r.pegRatio < 1 &&
      (r.roePercent ?? -Infinity) >= 15 &&
      (r.peRatio ?? 0) > 0,
    rank: (r) => r.roePercent ?? -Infinity,
  },
  {
    key: "analystBuy",
    label: "นักวิเคราะห์เชียร์",
    description: "Analyst rating เข้าใกล้ Strong Buy มากที่สุด — อย่างน้อย 0.5",
    test: (r) => (r.analystRating ?? -Infinity) >= 0.5,
    rank: (r) => r.analystRating ?? -Infinity,
  },
  {
    key: "momentum1M",
    label: "โมเมนตัม 1 เดือน",
    description: "ราคาขึ้นแรงในรอบ 1 เดือนที่ผ่านมา — อย่างน้อย 5%",
    test: (r) => (r.perf1MPercent ?? -Infinity) >= 5,
    rank: (r) => r.perf1MPercent ?? -Infinity,
  },
  {
    key: "dividendValue",
    label: "ปันผลเด่น",
    description: "Div yield ≥ 3% และ P/E ไม่เกิน 25 — กันกับดักปันผลสูงเพราะราคาร่วง",
    test: (r) => (r.divYieldPercent ?? -Infinity) >= 3 && (r.peRatio ?? Infinity) > 0 && (r.peRatio ?? Infinity) <= 25,
    rank: (r) => r.divYieldPercent ?? -Infinity,
  },
  {
    key: "earningsSoon",
    label: "ใกล้ประกาศงบ",
    description: "มีวันประกาศผลประกอบการภายใน 14 วันข้างหน้า",
    test: (r) => r.upcomingEarningsDate != null && daysUntil(r.upcomingEarningsDate) >= 0 && daysUntil(r.upcomingEarningsDate) <= 14,
    rank: (r) => (r.upcomingEarningsDate ? -daysUntil(r.upcomingEarningsDate) : -Infinity),
  },
];

export function topByPreset(rows: ScannerRow[], preset: WatchlistPreset, limit = 10): ScannerRow[] {
  return rows
    .filter(preset.test)
    .sort((a, b) => preset.rank(b) - preset.rank(a))
    .slice(0, limit);
}
