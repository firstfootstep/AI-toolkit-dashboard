import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { IndexGrid } from "@/features/markets/IndexGrid";
import { MarketSummaryCard } from "@/features/markets/MarketSummaryCard";
import { EconomicCalendar } from "@/features/markets/EconomicCalendar";
import { NewsList } from "@/features/news/NewsList";
import { getQuotes } from "@/lib/quotes";
import { getNews } from "@/lib/news";
import { getEconomicCalendar } from "@/lib/economicCalendar";
import { getLatestMarketBrief } from "@/features/markets/marketBrief";
import { MARKET_REGIONS } from "@/features/markets/pulseSymbols";

export const dynamic = "force-dynamic";

// Russell 2000 isn't part of MARKET_REGIONS' "US Market" group (Global
// Markets only tracks the three main US benchmarks there), but the daily
// summary's US row wants it alongside Dow/S&P/Nasdaq — fetched separately
// rather than growing IndexGrid's own region data for one extra tile.
const RUSSELL_2000_SYMBOL = "^RUT";

export default async function MarketsPage() {
  const globalSymbols = MARKET_REGIONS.flatMap((r) => r.items.map((i) => i.symbol));

  const [global, russell, news, calendar] = await Promise.all([
    getQuotes(globalSymbols),
    getQuotes([RUSSELL_2000_SYMBOL]),
    getNews(),
    getEconomicCalendar(),
  ]);

  const quotesBySymbol = new Map(global.quotes.map((q) => [q.symbol, q]));
  const brief = getLatestMarketBrief();

  const usIndices = [
    { label: "Dow Jones", quote: quotesBySymbol.get("^DJI") },
    { label: "S&P 500", quote: quotesBySymbol.get("^GSPC") },
    { label: "Nasdaq Composite", quote: quotesBySymbol.get("^IXIC") },
    { label: "Russell 2000", quote: russell.quotes[0] },
  ];
  const intlIndices = [
    { label: "FTSE 100", quote: quotesBySymbol.get("^FTSE") },
    { label: "DAX", quote: quotesBySymbol.get("^GDAXI") },
    { label: "CAC 40", quote: quotesBySymbol.get("^FCHI") },
    { label: "Nikkei 225", quote: quotesBySymbol.get("^N225") },
    { label: "Hang Seng", quote: quotesBySymbol.get("^HSI") },
    { label: "Shanghai Composite", quote: quotesBySymbol.get("000001.SS") },
    { label: "SET Index", quote: quotesBySymbol.get("^SET.BK") },
  ];

  return (
    <>
      <Topbar title="Market & News" />
      <main className="flex-1 space-y-6 overflow-y-auto p-8">
        <MarketSummaryCard brief={brief} usIndices={usIndices} intlIndices={intlIndices} source={global.source} />

        <Card title="Global Markets" action={<DataSourceBadge source={global.source} />}>
          <IndexGrid regions={MARKET_REGIONS} quotesBySymbol={quotesBySymbol} />
        </Card>

        <Card title="ปฏิทินเศรษฐกิจ (High impact)" action={<DataSourceBadge source={calendar.source} />}>
          <EconomicCalendar items={calendar.items} />
        </Card>

        <Card title="Market news" action={<DataSourceBadge source={news.source} />}>
          <NewsList items={news.items} />
        </Card>
      </main>
    </>
  );
}
