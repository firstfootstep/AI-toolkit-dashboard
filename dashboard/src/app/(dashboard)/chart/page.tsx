import { redirect } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { ChartHeader } from "@/features/markets/ChartHeader";
import { FundamentalsOverview, LatestEarnings, PriceReturns } from "@/features/markets/ChartSidebar";
import { NewsList } from "@/features/news/NewsList";
import { SymbolSwitcher } from "@/features/markets/SymbolSwitcher";
import { getQuoteDetail } from "@/lib/quotes";
import { getSymbolNews } from "@/lib/news";
import { getOhlc } from "@/lib/ohlc";
import { getEarningsHistory } from "@/lib/earnings";
import { getScannerUniverse } from "@/features/scanner/data";
import { currencyForExchange, scannerMarketForExchange, toYahooSymbol } from "@/lib/exchanges";

export const dynamic = "force-dynamic";

export default async function ChartPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string; exchange?: string }>;
}) {
  const { symbol: symbolParam, exchange } = await searchParams;

  if (!symbolParam) {
    redirect("/chart?symbol=AAPL");
  }

  const symbol = symbolParam.toUpperCase();
  const yahooSymbol = toYahooSymbol(symbol, exchange);

  const [
    { quote, source: quoteSource },
    { items: news, source: newsSource },
    { bars, source: ohlcSource },
    { quarters, source: earningsSource },
    scannerUniverse,
  ] = await Promise.all([
    // Must use the exchange-suffixed symbol here, not the bare one — Yahoo
    // resolves bare tickers globally, so e.g. "BCH" without ".BK" silently
    // returns NYSE-listed Banco de Chile instead of SET-listed Bangkok
    // Chain Hospital whenever the two collide on the same bare ticker.
    getQuoteDetail(yahooSymbol),
    getSymbolNews(symbol),
    getOhlc(symbol, exchange),
    getEarningsHistory(yahooSymbol),
    getScannerUniverse(scannerMarketForExchange(exchange)),
  ]);

  // Yahoo (getQuoteDetail's source) doesn't recognize most non-US tickers
  // by bare symbol, so for exchange-qualified symbols (Scanner links) the
  // header stats are derived from the OHLC bars themselves — the same data
  // the candlestick chart plots — rather than from a Yahoo lookup that
  // would silently fall back to a meaningless zeroed mock quote.
  const useBarsForStats = Boolean(exchange) && quoteSource === "mock" && bars.length > 0;

  const latestBar = bars[bars.length - 1];
  const prevBar = bars[bars.length - 2] ?? latestBar;

  const price = useBarsForStats ? latestBar.close : quote.price;
  const change = useBarsForStats ? latestBar.close - prevBar.close : quote.change;
  const changePercent = useBarsForStats
    ? prevBar.close
      ? (change / prevBar.close) * 100
      : 0
    : quote.changePercent;
  const currency = useBarsForStats ? currencyForExchange(exchange) ?? "USD" : quote.currency;
  const headerSource = useBarsForStats ? ohlcSource : quoteSource;

  // Fundamentals/RS/returns tile — undefined (renders as "—") when this
  // symbol isn't in the top-1000-by-market-cap universe fetched for its
  // exchange, or the TradingView tier is unavailable.
  const scannerRow = scannerUniverse.rows.find((r) => r.symbol.toUpperCase() === symbol);

  const tvUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(
    exchange ? `${exchange}:${symbol}` : symbol
  )}`;

  return (
    <>
      <Topbar title={`Chart · ${symbol}${exchange ? ` (${exchange})` : ""}`} />
      <main className="flex-1 space-y-6 overflow-y-auto p-8">
        <SymbolSwitcher />

        <Card action={<DataSourceBadge source={headerSource} />}>
          <ChartHeader
            symbol={symbol}
            name={useBarsForStats ? undefined : quote.name}
            exchangeLabel={exchange}
            sector={scannerRow?.sector}
            price={price}
            change={change}
            changePercent={changePercent}
            currency={currency}
            bars={bars}
            tvUrl={tvUrl}
            sidebar={
              <>
                <FundamentalsOverview row={scannerRow} currency={currency} />
                <PriceReturns row={scannerRow} />
                <LatestEarnings quarters={quarters} />
              </>
            }
          />
          {(scannerRow || quarters.length > 0) && (
            <div className="mt-2 flex justify-end gap-2">
              {scannerRow && <DataSourceBadge source={scannerUniverse.source} />}
              {quarters.length > 0 && <DataSourceBadge source={earningsSource} />}
            </div>
          )}
        </Card>

        <Card title={`News about ${symbol}`} action={<DataSourceBadge source={newsSource} />}>
          <NewsList items={news} />
        </Card>
      </main>
    </>
  );
}
