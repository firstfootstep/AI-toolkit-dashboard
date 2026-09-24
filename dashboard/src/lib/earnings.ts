import { fetchWithTimeout, getCached, setCached, withFallback } from "@/lib/dataSource";
import type { DataSourceStatus } from "@/types/market";

/**
 * Quarterly EPS actual-vs-estimate, from Yahoo Finance's quoteSummary API
 * (earningsHistory + earningsTrend modules) — a different, less "keyless"
 * tier than the v8 chart endpoint the rest of this app uses. As of Yahoo's
 * 2024 API changes, quoteSummary requires a session cookie + short-lived
 * "crumb" token (no API key/signup, but a two-step handshake, not a plain
 * GET) — see getYahooCrumb() below. Same caveat as tvScreener.ts: unofficial,
 * can change or get rate-limited without notice. Falls back to a mock
 * fixture on any failure, same as everything else in this app.
 *
 * Yahoo's free tier only exposes the trailing ~4 *reported* quarters (no
 * multi-year history) plus one forward, estimate-only quarter from
 * earningsTrend — narrower than a paid data provider, but real.
 */

const TIMEOUT_MS = 4000;
const CRUMB_TTL_MS = 60 * 60_000; // refetched well before Yahoo's own session cookie would expire
const CACHE_TTL_MS = 6 * 60 * 60_000; // earnings estimates move slowly

const USER_AGENT = "Mozilla/5.0 (compatible; InvestViewDashboard/1.0)";

export interface EarningsQuarter {
  label: string; // e.g. "Q3 '25"
  date: string; // ISO date of quarter end
  epsActual: number | null; // null for the upcoming, not-yet-reported quarter
  epsEstimate: number | null;
}

export interface EarningsHistoryResponse {
  source: DataSourceStatus;
  quarters: EarningsQuarter[];
}

interface YahooCrumb {
  cookie: string;
  crumb: string;
  expiresAt: number;
}

let crumbCache: YahooCrumb | null = null;

async function getYahooCrumb(): Promise<YahooCrumb> {
  if (crumbCache && Date.now() < crumbCache.expiresAt) return crumbCache;

  const cookieRes = await fetchWithTimeout("https://fc.yahoo.com/", TIMEOUT_MS, {
    headers: { "User-Agent": USER_AGENT },
  });
  const cookie = cookieRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  if (!cookie) throw new Error("Yahoo did not set a session cookie");

  const crumbRes = await fetchWithTimeout("https://query1.finance.yahoo.com/v1/test/getcrumb", TIMEOUT_MS, {
    headers: { "User-Agent": USER_AGENT, Cookie: cookie },
  });
  if (!crumbRes.ok) throw new Error(`Yahoo getcrumb ${crumbRes.status}`);
  const crumb = await crumbRes.text();
  if (!crumb || crumb.includes("error")) throw new Error("Yahoo did not return a usable crumb");

  crumbCache = { cookie, crumb, expiresAt: Date.now() + CRUMB_TTL_MS };
  return crumbCache;
}

function quarterLabel(iso: string): string {
  const d = new Date(iso);
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  const yy = String(d.getUTCFullYear()).slice(2);
  return `Q${q} '${yy}`;
}

function num(v: unknown): number | null {
  if (v && typeof v === "object" && "raw" in v && typeof (v as { raw?: unknown }).raw === "number") {
    return (v as { raw: number }).raw;
  }
  return null;
}

async function fetchYahooEarningsHistory(symbol: string): Promise<EarningsQuarter[]> {
  const { cookie, crumb } = await getYahooCrumb();
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=earningsHistory,earningsTrend&crumb=${encodeURIComponent(crumb)}`;

  const res = await fetchWithTimeout(url, TIMEOUT_MS, {
    headers: { "User-Agent": USER_AGENT, Cookie: cookie },
  });
  if (!res.ok) throw new Error(`Yahoo quoteSummary ${res.status}`);

  const json = await res.json();
  const result = json?.quoteSummary?.result?.[0];
  if (!result) throw new Error("Unexpected quoteSummary response shape");

  const history: Array<Record<string, unknown>> = result.earningsHistory?.history ?? [];
  const quarters: EarningsQuarter[] = history
    .map((h) => {
      const quarterFmt = (h.quarter as { fmt?: string } | undefined)?.fmt;
      if (!quarterFmt) return null;
      return {
        label: quarterLabel(quarterFmt),
        date: quarterFmt,
        epsActual: num(h.epsActual),
        epsEstimate: num(h.epsEstimate),
      };
    })
    .filter((q): q is EarningsQuarter => q !== null);

  const trend: Array<Record<string, unknown>> = result.earningsTrend?.trend ?? [];
  const nextQuarter = trend.find((t) => t.period === "0q");
  const nextEndDate = nextQuarter?.endDate as string | undefined;
  const nextEstimate = num((nextQuarter?.earningsEstimate as { avg?: unknown } | undefined)?.avg);
  if (nextEndDate && nextEstimate !== null) {
    quarters.push({ label: quarterLabel(nextEndDate), date: nextEndDate, epsActual: null, epsEstimate: nextEstimate });
  }

  if (quarters.length === 0) throw new Error("No earnings quarters in response");
  return quarters;
}

// Deterministic mock (no real per-symbol earnings fixture exists in this
// project): a plausible growing EPS trend seeded off the symbol name, with
// the most recent quarter as an unreported estimate-only bar — same shape
// as the live tier, just not real numbers.
function fixtureEarningsHistory(symbol: string): EarningsQuarter[] {
  const seed = [...symbol].reduce((n, c) => n + c.charCodeAt(0), 0);
  const baseEps = 0.5 + (seed % 50) / 20; // ~0.5–3.0
  const now = new Date();

  return Array.from({ length: 5 }, (_, i) => {
    const quartersAgo = 4 - i;
    const d = new Date(now.getFullYear(), now.getMonth() - quartersAgo * 3, 1);
    const growth = 1 + ((seed + i) % 7) * 0.02;
    const estimate = Number((baseEps * Math.pow(growth, i)).toFixed(2));
    const isUpcoming = i === 4;
    const surprisePercent = ((seed + i * 7) % 11) - 5; // -5%..+5%
    const actual = isUpcoming ? null : Number((estimate * (1 + surprisePercent / 100)).toFixed(2));
    return { label: quarterLabel(d.toISOString()), date: d.toISOString().slice(0, 10), epsActual: actual, epsEstimate: estimate };
  });
}

export async function getEarningsHistory(symbol: string): Promise<EarningsHistoryResponse> {
  const clean = symbol.trim().toUpperCase();
  const cacheKey = `earnings:${clean}`;
  const cached = getCached<EarningsHistoryResponse>(cacheKey);
  if (cached) return cached;

  const { value: quarters, source } = await withFallback(
    () => fetchYahooEarningsHistory(clean),
    () => fixtureEarningsHistory(clean)
  );

  const body: EarningsHistoryResponse = { source, quarters };
  setCached(cacheKey, body, CACHE_TTL_MS);
  return body;
}
