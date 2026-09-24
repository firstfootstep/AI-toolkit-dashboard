const EXCHANGE_CURRENCY: Record<string, string> = {
  NASDAQ: "USD",
  NYSE: "USD",
  AMEX: "USD",
  SET: "THB",
  HKEX: "HKD",
  TSE: "JPY",
  LSE: "GBP",
  XETR: "EUR",
  ASX: "AUD",
};

export function currencyForExchange(exchange?: string): string | undefined {
  if (!exchange) return undefined;
  return EXCHANGE_CURRENCY[exchange.toUpperCase()];
}

// Yahoo Finance identifies non-US listings by a ticker suffix, not a
// separate exchange parameter (e.g. "DELTA.BK" for SET, not "DELTA" +
// exchange=SET) — this maps Scanner's TradingView-style exchange codes to
// that suffix. US exchanges use the bare symbol, hence "".
const YAHOO_SUFFIX: Record<string, string> = {
  NASDAQ: "",
  NYSE: "",
  AMEX: "",
  SET: ".BK",
  HKEX: ".HK",
  TSE: ".T",
  LSE: ".L",
  XETR: ".DE",
  ASX: ".AX",
};

export function toYahooSymbol(symbol: string, exchange?: string): string {
  if (!exchange) return symbol;
  const suffix = YAHOO_SUFFIX[exchange.toUpperCase()];
  return suffix ? `${symbol}${suffix}` : symbol;
}

// Maps Scanner's TradingView-style exchange codes to the market id
// SCANNER_MARKETS (src/features/scanner/types.ts) uses — lets the Chart
// page reuse getScannerUniverse() to look up a symbol's fundamentals/RS
// score in the right regional universe instead of always assuming US.
const SCANNER_MARKET_FOR_EXCHANGE: Record<string, string> = {
  NASDAQ: "america",
  NYSE: "america",
  AMEX: "america",
  SET: "thailand",
  HKEX: "hongkong",
  TSE: "japan",
  LSE: "uk",
  XETR: "germany",
  ASX: "australia",
};

export function scannerMarketForExchange(exchange?: string): string {
  if (!exchange) return "america";
  return SCANNER_MARKET_FOR_EXCHANGE[exchange.toUpperCase()] ?? "america";
}
