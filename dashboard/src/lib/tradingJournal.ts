import quotesFixture from "@/fixtures/quotes.json";
import type { Holding } from "@/types/market";
import { getTradeSetups, type TradeSetup } from "@/lib/tradeSetups";

// Asset classes for the symbols that appear in the master journal —
// names are looked up from the same quotes fixture the rest of the app
// already treats as the source of truth for company names.
const ASSET_CLASS: Record<string, Holding["assetClass"]> = {
  AAPL: "Equities",
  MSFT: "Equities",
  NVDA: "Equities",
  PLTR: "Equities",
  TSLA: "Equities",
  VOO: "ETFs",
  QQQ: "ETFs",
  BND: "Bonds",
};

export interface ClosedTrade {
  symbol: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  qty: number;
  pnl: number;
  pnlPercent: number;
  holdingDays: number;
  fee: number;
}

export interface JournalDailyPoint {
  date: string;
  closedEquity: number;
  totalNav: number;
  drawdownPercent: number;
}

export interface TradingJournalStats {
  equity: number;
  roiPercent: number;
  nav: number;
  unrealizedPnl: number;
  openPositions: number;
  winRate: number;
  closedTrades: number;
  profitFactor: number; // Infinity when there are wins and zero losses
  netPnl: number;
  maxDrawdownPercent: number;
  series: JournalDailyPoint[];
  holdings: Holding[]; // open positions only, plus a synthetic "Cash" row
  closedTradesList: ClosedTrade[]; // newest first
}

const STARTING_CAPITAL = 100_000;

interface JournalEvent {
  date: string;
  kind: "buy" | "sell";
  trade: TradeSetup;
}

/**
 * Derives every number on the Portfolio page (equity curve, drawdown,
 * holdings, closed trades, win rate...) from the ONE master journal,
 * src/fixtures/trade-setups.csv — the same rows the Journal and Trading
 * Coach tabs read, so all four tabs always agree. Each CSV row is one
 * trade: it becomes a buy on `date` and, when `exitPrice` is filled in, a
 * sell on `exitDate`. Open trades (no exit yet) are marked at entry price,
 * since the master file carries no live quote. Everything is computed, not
 * hardcoded; the master has no fee column, so fees are 0.
 */
export function getTradingJournalStats(): TradingJournalStats {
  const trades = getTradeSetups();

  const events: JournalEvent[] = [];
  for (const trade of trades) {
    events.push({ date: trade.date, kind: "buy", trade });
    if (trade.exitDate && trade.exitPrice != null) {
      events.push({ date: trade.exitDate, kind: "sell", trade });
    }
  }
  // Chronological; on the same day, buys before sells so a lot always
  // exists before the event that closes it.
  events.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "buy" ? -1 : 1));

  const openLots = new Set<TradeSetup>();
  const lastPrice = new Map<string, number>();
  const dailySnapshot = new Map<string, { closedEquity: number; totalNav: number }>();
  const closedTradesList: ClosedTrade[] = [];

  let cumulativeRealizedPnl = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let winningTrades = 0;
  let cash = STARTING_CAPITAL;

  for (const { date, kind, trade } of events) {
    if (kind === "buy") {
      lastPrice.set(trade.symbol, trade.entryPrice);
      cash -= trade.qty * trade.entryPrice;
      openLots.add(trade);
    } else {
      const exitPrice = trade.exitPrice as number;
      lastPrice.set(trade.symbol, exitPrice);
      cash += trade.qty * exitPrice;
      openLots.delete(trade);

      const realized = (exitPrice - trade.entryPrice) * trade.qty;
      closedTradesList.push({
        symbol: trade.symbol,
        entryDate: trade.date,
        entryPrice: trade.entryPrice,
        exitDate: date,
        exitPrice,
        qty: trade.qty,
        pnl: realized,
        pnlPercent: ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100,
        holdingDays: Math.round((new Date(date).getTime() - new Date(trade.date).getTime()) / 86_400_000),
        fee: 0,
      });

      cumulativeRealizedPnl += realized;
      if (realized > 0) {
        grossProfit += realized;
        winningTrades += 1;
      } else if (realized < 0) {
        grossLoss += -realized;
      }
    }

    let unrealized = 0;
    for (const lot of openLots) {
      unrealized += ((lastPrice.get(lot.symbol) ?? lot.entryPrice) - lot.entryPrice) * lot.qty;
    }

    const closedEquity = STARTING_CAPITAL + cumulativeRealizedPnl;
    dailySnapshot.set(date, { closedEquity, totalNav: closedEquity + unrealized });
  }

  // One point per calendar day (not just trade days) via forward-fill, so
  // the chart reads as a continuous curve rather than a sparse scatter.
  const series: JournalDailyPoint[] = [];
  let cursor = { closedEquity: STARTING_CAPITAL, totalNav: STARTING_CAPITAL };
  let peakNav = STARTING_CAPITAL;
  let maxDrawdownPercent = 0;

  const start = new Date(events[0].date);
  const end = new Date(events[events.length - 1].date);
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const snapshot = dailySnapshot.get(key);
    if (snapshot) cursor = snapshot;

    peakNav = Math.max(peakNav, cursor.totalNav);
    const drawdownPercent = peakNav ? ((cursor.totalNav - peakNav) / peakNav) * 100 : 0;
    maxDrawdownPercent = Math.min(maxDrawdownPercent, drawdownPercent);

    series.push({ date: key, closedEquity: cursor.closedEquity, totalNav: cursor.totalNav, drawdownPercent });
  }

  // Open positions grouped per symbol (average cost across open lots).
  const bySymbol = new Map<string, { qty: number; cost: number }>();
  for (const lot of openLots) {
    const agg = bySymbol.get(lot.symbol) ?? { qty: 0, cost: 0 };
    agg.qty += lot.qty;
    agg.cost += lot.qty * lot.entryPrice;
    bySymbol.set(lot.symbol, agg);
  }

  const fixtures = quotesFixture as Record<string, { name: string }>;
  const holdings: Holding[] = [];
  for (const [symbol, { qty, cost }] of bySymbol) {
    holdings.push({
      symbol,
      name: fixtures[symbol]?.name ?? symbol,
      assetClass: ASSET_CLASS[symbol] ?? "Equities",
      quantity: qty,
      avgCost: cost / qty,
      price: lastPrice.get(symbol) ?? 0,
    });
  }
  holdings.push({ symbol: "CASH", name: "Cash & Equivalents", assetClass: "Cash", quantity: 0, avgCost: cash, price: 0 });

  const closedTrades = closedTradesList.length;
  const last = series[series.length - 1];
  const equity = last?.closedEquity ?? STARTING_CAPITAL;

  return {
    equity,
    roiPercent: ((equity - STARTING_CAPITAL) / STARTING_CAPITAL) * 100,
    nav: last?.totalNav ?? STARTING_CAPITAL,
    unrealizedPnl: last ? last.totalNav - last.closedEquity : 0,
    openPositions: holdings.length - 1,
    winRate: closedTrades ? (winningTrades / closedTrades) * 100 : 0,
    closedTrades,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    netPnl: cumulativeRealizedPnl,
    maxDrawdownPercent,
    series,
    holdings,
    closedTradesList: [...closedTradesList].sort((a, b) => b.exitDate.localeCompare(a.exitDate)),
  };
}
