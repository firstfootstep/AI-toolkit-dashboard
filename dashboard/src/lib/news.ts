import { XMLParser } from "fast-xml-parser";
import newsFixture from "@/fixtures/news.json";
import { fetchWithTimeout, getCached, setCached, withFallback } from "@/lib/dataSource";
import type { NewsItem, NewsResponse } from "@/types/market";

const CACHE_TTL_MS = 5 * 60_000;
const CACHE_KEY = "news:market";

// Google News' Business section RSS — no API key, keyless default for this
// course demo, and refreshes noticeably faster than the previous source
// (Yahoo Finance's own general RSS index, which could sit on the same top-8
// headlines for most of a day). fetch() follows the feed's redirect to the
// real topic URL automatically. Google's own titles come pre-formatted as
// "Headline - Source Name" (one feed, many publishers), so
// splitGoogleNewsTitle() below pulls the real per-article source out instead
// of hardcoding one. RSS/feed hosts occasionally change shape or go down,
// so every call here is wrapped in withFallback() just like getQuotes().
const FEED_URL = "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en";
// Per-symbol news still comes from Yahoo Finance's per-ticker feed — Google
// News has no equivalent single-symbol endpoint, and this one's fine as is.
const symbolFeedUrl = (symbol: string) =>
  `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;

// Google News formats every item title as "Headline - Publisher" — split on
// the LAST " - " (a headline can itself contain " - ") to recover both.
function splitGoogleNewsTitle(raw: string): { title: string; source: string } {
  const idx = raw.lastIndexOf(" - ");
  if (idx === -1) return { title: raw, source: "Google News" };
  return { title: raw.slice(0, idx), source: raw.slice(idx + 3) };
}

async function fetchRssItems(
  url: string,
  parseTitle: (raw: string) => { title: string; source: string }
): Promise<NewsItem[]> {
  const res = await fetchWithTimeout(url, 4000, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; InvestViewDashboard/1.0)" },
  });
  if (!res.ok) throw new Error(`Feed ${res.status}`);

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);

  const rawItems = parsed?.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  if (items.length === 0) throw new Error("Empty feed");

  return items.slice(0, 8).map((item: Record<string, unknown>) => {
    const { title, source } = parseTitle(String(item.title ?? "Untitled"));
    return {
      title,
      link: String(item.link ?? "https://news.google.com/"),
      source,
      publishedAt: item.pubDate ? new Date(String(item.pubDate)).toISOString() : new Date().toISOString(),
    };
  });
}

function fixtureNews(): NewsItem[] {
  return newsFixture.items as NewsItem[];
}

export async function getNews(): Promise<NewsResponse> {
  const cached = getCached<NewsResponse>(CACHE_KEY);
  if (cached) return cached;

  const { value: items, source } = await withFallback(() => fetchRssItems(FEED_URL, splitGoogleNewsTitle), fixtureNews);
  const body: NewsResponse = { source, items, fetchedAt: new Date().toISOString() };
  setCached(CACHE_KEY, body, CACHE_TTL_MS);
  return body;
}

// Falls back to the same general-market fixture (there's no per-symbol mock
// dataset) — still clearly labeled "mock" via the source flag either way.
export async function getSymbolNews(symbol: string): Promise<NewsResponse> {
  const clean = symbol.trim().toUpperCase();
  const cacheKey = `news:symbol:${clean}`;
  const cached = getCached<NewsResponse>(cacheKey);
  if (cached) return cached;

  const { value: items, source } = await withFallback(
    () => fetchRssItems(symbolFeedUrl(clean), (title) => ({ title, source: "Yahoo Finance" })),
    fixtureNews
  );
  const body: NewsResponse = { source, items, fetchedAt: new Date().toISOString() };
  setCached(cacheKey, body, CACHE_TTL_MS);
  return body;
}
