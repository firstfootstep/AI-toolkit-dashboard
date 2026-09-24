"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, ColorType, LineSeries, createChart, type IChartApi, type Time } from "lightweight-charts";
import type { OhlcBar } from "@/types/market";

// Standard EMA: seed with the SMA of the first `period` closes, then
// smooth forward with k = 2/(period+1). Returns one point per bar from
// index `period - 1` onward — shorter than `bars` when there's less than
// `period` days of history, same as any real charting package's overlay.
function emaSeries(bars: OhlcBar[], period: number): { time: Time; value: number }[] {
  if (bars.length < period) return [];
  const k = 2 / (period + 1);
  const out: { time: Time; value: number }[] = [];

  let ema = bars.slice(0, period).reduce((sum, b) => sum + b.close, 0) / period;
  out.push({ time: bars[period - 1].time as Time, value: ema });

  for (let i = period; i < bars.length; i++) {
    ema = bars[i].close * k + ema * (1 - k);
    out.push({ time: bars[i].time as Time, value: ema });
  }
  return out;
}

const EMA_20_COLOR = "#2662A8";
const EMA_50_COLOR = "#B4571F";

export function CandlestickChart({
  bars,
  onReady,
  className = "h-80 w-full",
}: {
  bars: OhlcBar[];
  // Lets a caller (e.g. the Chart page's "Save PNG" button) grab the chart
  // instance without this component needing to know about that feature —
  // optional, so every existing caller is unaffected.
  onReady?: (chart: IChartApi) => void;
  // Defaults to a fixed height (unchanged behavior for existing callers
  // like Research). The Chart page passes "h-full w-full" so the chart
  // stretches to match its taller sidebar instead of leaving empty space
  // below a fixed-height canvas.
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 320,
      layout: {
        background: { type: ColorType.Solid, color: "#FFFEFA" },
        textColor: "#66736C",
        fontFamily: "var(--font-ui)",
      },
      grid: {
        vertLines: { color: "rgba(26, 54, 42, 0.06)" },
        horzLines: { color: "rgba(26, 54, 42, 0.06)" },
      },
      // rightOffset leaves empty space (in bar-widths) after the last
      // candle so it isn't flush against the right edge.
      timeScale: { borderColor: "rgba(26, 54, 42, 0.13)", rightOffset: 6 },
      rightPriceScale: { borderColor: "rgba(26, 54, 42, 0.13)" },
    });
    chartRef.current = chart;
    onReady?.(chart);

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#1D7252",
      downColor: "#D86D4D",
      borderVisible: false,
      wickUpColor: "#1D7252",
      wickDownColor: "#D86D4D",
    });

    series.setData(
      bars.map((b) => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close }))
    );

    // No `title` here on purpose — lightweight-charts renders a series'
    // `title` as its own axis-scale tag regardless of `lastValueVisible`,
    // which is exactly the duplicate "EMA 20"/"EMA 50" label that used to
    // float over the chart. The color-coded legend below (top-left overlay)
    // already names these lines, so the series themselves stay unlabeled.
    const ema20 = chart.addSeries(LineSeries, {
      color: EMA_20_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    ema20.setData(emaSeries(bars, 20));

    const ema50 = chart.addSeries(LineSeries, {
      color: EMA_50_COLOR,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    ema50.setData(emaSeries(bars, 50));

    chart.timeScale().fitContent();

    // ResizeObserver over plain window-resize so height changes driven by
    // layout (e.g. a taller sidebar stretching this grid cell) are picked
    // up too, not just viewport-width changes.
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      chart.applyOptions({ width, height: height || 320 });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [bars]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className={className} />
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex gap-3 rounded bg-paper/70 px-1.5 py-0.5 font-[family-name:var(--font-ui)] text-[11px] font-medium">
        <span className="flex items-center gap-1" style={{ color: EMA_20_COLOR }}>
          <span className="h-0.5 w-3" style={{ backgroundColor: EMA_20_COLOR }} />
          EMA 20
        </span>
        <span className="flex items-center gap-1" style={{ color: EMA_50_COLOR }}>
          <span className="h-0.5 w-3" style={{ backgroundColor: EMA_50_COLOR }} />
          EMA 50
        </span>
      </div>
    </div>
  );
}
