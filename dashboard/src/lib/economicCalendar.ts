import calendarFixture from "@/fixtures/economic-calendar.json";
import { fetchWithTimeout, getCached, setCached, withFallback } from "@/lib/dataSource";
import type { EconomicCalendarResponse, EconomicEvent } from "@/types/market";

const CACHE_TTL_MS = 30 * 60_000;
const CACHE_KEY = "economic-calendar";

// TradingView's own (undocumented, reverse-engineered) economic calendar API
// — same "unofficial, may change shape or get blocked without notice" tier
// as tvScreener.ts, hence the generous 30min cache. Switched from Forex
// Factory's ff_calendar_thisweek.json mirror (kept as a comment for
// history): that feed only ever carried "forecast"/"previous", never
// "actual" — real prints are rendered client-side on forexfactory.com, not
// in that static JSON export, so the calendar's Actual column was
// structurally always "—" even for events hours or days in the past. This
// endpoint returns real actual/forecast/previous/unit fields per event
// (confirmed live 2026-09-17, e.g. Fed Interest Rate Decision actual: 4,
// unit: "%"). No API key, no country filter needed — omitting `countries`
// returns every country for the date range, same global coverage the old
// feed had.
const FEED_URL = "https://economic-calendar.tradingview.com/events";
// TradingView's server checks Origin against its own frontends; any real
// tradingview.com origin works, this just has to be non-empty and match one.
const FEED_ORIGIN = "https://in.tradingview.com";

// The Thai-language UI's day boundaries should track a zone the audience
// actually recognizes, not the server process's UTC day — so every date
// bucketing in this module (live filtering here, and EconomicCalendar.tsx's
// own grouping/time display) uses this same zone.
export const CALENDAR_TIMEZONE = "Asia/Bangkok";

export function dateKeyInCalendarZone(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CALENDAR_TIMEZONE }).format(date);
}

const WEEKDAY_INDEX_FROM_MONDAY: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

// Returns the Mon-Sun date keys (CALENDAR_TIMEZONE) of the week containing
// `date` — shared by the live fetch's date-range filter below and
// EconomicCalendar.tsx's day-by-day grouping, so both agree on where the
// week starts regardless of what day it is when either runs.
export function weekKeysInCalendarZone(date: Date): string[] {
  const weekdayName = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: CALENDAR_TIMEZONE }).format(date);
  const offsetFromMonday = WEEKDAY_INDEX_FROM_MONDAY[weekdayName] ?? 0;
  const mondayMs = date.getTime() - offsetFromMonday * 86_400_000;
  return Array.from({ length: 7 }, (_, i) => dateKeyInCalendarZone(new Date(mondayMs + i * 86_400_000)));
}

interface FeedItem {
  title: string;
  country: string;
  currency?: string;
  date: string;
  importance: number; // -1 low, 0 medium, 1 high
  forecast?: number | null;
  previous?: number | null;
  actual?: number | null;
  unit?: string;
}

// TradingView reports numbers as raw floats (e.g. 4, 3.1) plus a separate
// "unit" field ("%", etc.) rather than a pre-formatted string like the old
// Forex Factory feed — reattach the unit here so the UI keeps showing
// "3.1%" instead of a bare "3.1".
function formatValue(value: number | null | undefined, unit: string | undefined): string | undefined {
  if (value == null) return undefined;
  return unit ? `${value}${unit}` : String(value);
}

async function fetchHighImpactEvents(): Promise<EconomicEvent[]> {
  const now = new Date();
  const weekKeys = weekKeysInCalendarZone(now);

  // Query a day of padding on each side of the Mon-Sun week — TradingView's
  // `date` is UTC while CALENDAR_TIMEZONE is UTC+7, so an event just after
  // midnight UTC on Monday or just before midnight UTC on Sunday could still
  // land inside the Bangkok week. The precise week membership check below
  // (against weekKeys) is what actually decides inclusion, not this range.
  const from = new Date(new Date(`${weekKeys[0]}T00:00:00Z`).getTime() - 86_400_000).toISOString();
  const to = new Date(new Date(`${weekKeys[6]}T00:00:00Z`).getTime() + 2 * 86_400_000).toISOString();

  const res = await fetchWithTimeout(`${FEED_URL}?from=${from}&to=${to}`, 4000, {
    headers: { Origin: FEED_ORIGIN, "User-Agent": "Mozilla/5.0 (compatible; InvestViewDashboard/1.0)" },
  });
  if (!res.ok) throw new Error(`Feed ${res.status}`);

  const body = (await res.json()) as { status?: string; result?: FeedItem[] };
  const feed = body.result;
  if (body.status !== "ok" || !Array.isArray(feed) || feed.length === 0) throw new Error("Empty feed");

  return feed
    .filter((item) => item.importance === 1)
    .filter((item) => weekKeys.includes(dateKeyInCalendarZone(new Date(item.date))))
    .map((item) => ({
      title: item.title,
      country: item.currency ?? item.country,
      date: new Date(item.date).toISOString(),
      impact: "high" as const,
      forecast: formatValue(item.forecast, item.unit),
      previous: formatValue(item.previous, item.unit),
      actual: formatValue(item.actual, item.unit),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function fixtureEvents(): EconomicEvent[] {
  return calendarFixture.items as EconomicEvent[];
}

export async function getEconomicCalendar(): Promise<EconomicCalendarResponse> {
  const cached = getCached<EconomicCalendarResponse>(CACHE_KEY);
  if (cached) return cached;

  const { value: items, source } = await withFallback(fetchHighImpactEvents, fixtureEvents);
  const body: EconomicCalendarResponse = { source, items, fetchedAt: new Date().toISOString() };
  setCached(CACHE_KEY, body, CACHE_TTL_MS);
  return body;
}
