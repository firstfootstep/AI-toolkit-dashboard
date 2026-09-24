// "tradingview" = the unofficial TradingView scanner API, called directly
// from the server (see src/lib/tvScreener.ts), "live" = Yahoo Finance
// (keyless), "mock" = bundled fixture.
export type DataSourceStatus = "tradingview" | "live" | "mock";

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  history: number[]; // recent close prices, oldest -> newest
  volume?: number;
  dayHigh?: number;
  dayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface QuotesResponse {
  source: DataSourceStatus;
  quotes: Quote[];
  fetchedAt: string;
}

export interface QuoteDetail extends Quote {
  historySeries: { date: string; close: number }[];
}

export interface QuoteDetailResponse {
  source: DataSourceStatus;
  quote: QuoteDetail;
  fetchedAt: string;
}

export interface OhlcBar {
  time: string; // "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OhlcResponse {
  source: DataSourceStatus;
  bars: OhlcBar[];
  fetchedAt: string;
}

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  tag?: string;
}

export interface NewsResponse {
  source: DataSourceStatus;
  items: NewsItem[];
  fetchedAt: string;
}

export interface EconomicEvent {
  title: string;
  country: string; // currency code, e.g. "USD", "EUR"
  date: string; // ISO 8601
  impact: "high";
  forecast?: string;
  previous?: string;
  actual?: string;
}

export interface EconomicCalendarResponse {
  source: DataSourceStatus;
  items: EconomicEvent[];
  fetchedAt: string;
}

export interface Holding {
  symbol: string;
  name: string;
  assetClass: "Equities" | "ETFs" | "Bonds" | "Cash";
  quantity: number;
  avgCost: number;
  price: number;
}

export interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  cash: number;
  buyingPower: number;
  performanceSeries: { date: string; value: number }[];
  holdings: Holding[];
}
