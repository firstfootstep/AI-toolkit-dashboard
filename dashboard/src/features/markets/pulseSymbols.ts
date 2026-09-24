export const MARKET_PULSE_SYMBOLS = [
  { symbol: "SPY", label: "Equities", hint: "SPY · S&P 500 ETF" },
  { symbol: "^VIX", label: "Volatility", hint: "VIX · CBOE Volatility Index" },
  { symbol: "^TNX", label: "Interest Rates", hint: "TNX · 10Y Treasury Yield" },
  { symbol: "DBC", label: "Commodities", hint: "DBC · Commodity Index ETF" },
];

export interface MarketIndexItem {
  symbol: string;
  label: string;
  code: string;
}

export interface MarketRegion {
  region: string;
  items: MarketIndexItem[];
}

// Grouped by region for the "Global Markets" card on the Market & News page —
// each region renders as its own labeled section of index tiles.
export const MARKET_REGIONS: MarketRegion[] = [
  {
    region: "US Market",
    items: [
      { symbol: "^GSPC", label: "S&P 500", code: "SPX" },
      { symbol: "^IXIC", label: "Nasdaq", code: "IXIC" },
      { symbol: "^DJI", label: "Dow Jones", code: "DJI" },
    ],
  },
  {
    region: "Europe",
    items: [
      { symbol: "^FTSE", label: "UK", code: "FTSE" },
      { symbol: "^GDAXI", label: "Germany", code: "DAX" },
      { symbol: "^FCHI", label: "France", code: "CAC" },
    ],
  },
  {
    region: "Asia",
    items: [
      { symbol: "^N225", label: "Japan", code: "N225" },
      { symbol: "^KS11", label: "Korea", code: "KOSPI" },
      { symbol: "^HSI", label: "Hong Kong", code: "HSI" },
      { symbol: "000001.SS", label: "China", code: "SSEC" },
      { symbol: "^SET.BK", label: "Thailand", code: "SET" },
      { symbol: "^JKSE", label: "Indonesia", code: "JCI" },
      { symbol: "PSEI.PS", label: "Philippines", code: "PSEi" },
      // Vietnam (^VNINDEX.VN) dropped — Yahoo's chart endpoint only returns
      // a single current-price point for this ticker, no historical daily
      // series at any range, so its sparkline can never show real movement.
    ],
  },
  {
    region: "Commodity & FX",
    items: [
      { symbol: "GC=F", label: "Gold", code: "XAU" },
      { symbol: "CL=F", label: "Crude Oil", code: "WTI" },
      { symbol: "BTC-USD", label: "Bitcoin", code: "BTC" },
      { symbol: "DX-Y.NYB", label: "US Dollar", code: "DXY" },
    ],
  },
];
