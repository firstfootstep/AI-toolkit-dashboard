"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { formatCompact, formatCurrency, formatPercent } from "@/lib/format";
import type { VduPick, VduScanResult } from "@/lib/vduScan";

const DEFAULT_EQUITY: Record<string, string> = { america: "100000", thailand: "1000000" };

const TIER_LABEL: Record<VduPick["tier"], string> = {
  1: "T1 · Pickup วันนี้",
  2: "T2 · Pickup เมื่อวาน",
  3: "T3 · เบรค 52WH",
};

const inputClass =
  "w-32 rounded-[var(--radius-sm)] border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-primary-bright";

export function VduPanel({ market }: { market: string }) {
  const [equity, setEquity] = useState(DEFAULT_EQUITY[market] ?? "1000000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VduScanResult | null>(null);

  // Runs automatically when the tab opens (like the other scan tabs); the
  // equity box only re-runs on Enter/blur, since it just changes position sizing.
  const runScan = useCallback(async (equityValue: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scanner/vdu?market=${encodeURIComponent(market)}&equity=${encodeURIComponent(equityValue)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "VDU scan failed.");
      setResult(json.result as VduScanResult);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "VDU scan failed.");
    } finally {
      setLoading(false);
    }
  }, [market]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runScan(DEFAULT_EQUITY[market] ?? "1000000");
  }, [market, runScan]);

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-[var(--radius-md)] border border-line bg-ink/6 p-4 text-sm text-ink-soft">
        <p>
          <span className="font-medium text-ink">VDU Breakout:</span> หุ้นแข็งแกร่ง (RS สูง) ที่มีโวลุ่มพุ่ง → แห้ง (VDU) →
          กลับมาเข้า (Pickup) หรือเบรค 52-week high และ <span className="font-medium text-ink">ยังอยู่ในฐาน</span> (ไม่ไล่ราคา)
          พร้อมแผนเทรด buy-stop / stop / target / จำนวนหุ้น
        </p>
        <p className="text-xs text-muted">
          คำนวณจากแท่งเทียนรายวัน (Yahoo, ปรับ split/ปันผลแล้ว) ควรสแกน<span className="font-medium">หลังตลาดปิด</span> —
          โวลุ่มระหว่างวันยังไม่ครบ ทำให้สัญญาณเพี้ยน · RS คำนวณจาก perf 1W/1M/3M/6M ของ TradingView เทียบทั้ง universe ·
          {market === "america" ? " US: RS ≥ 80 และ market cap ≥ 30B USD" : " ตลาดนี้: RS ≥ 70"} · ไม่ใช่คำแนะนำการลงทุน
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="flex items-center gap-2 text-xs text-muted">
            ขนาดพอร์ต
            <input
              value={equity}
              onChange={(e) => setEquity(e.target.value)}
              onBlur={() => runScan(equity)}
              onKeyDown={(e) => e.key === "Enter" && runScan(equity)}
              inputMode="decimal"
              className={inputClass}
              aria-label="Account equity"
            />
          </label>
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              กำลังสแกน… ดึงแท่งเทียนหลายร้อยตัว อาจใช้เวลา 30–60 วินาที
            </span>
          )}
        </div>
      </div>

      {error && <p className="rounded-[var(--radius-sm)] bg-coral/14 px-3 py-2 text-sm text-coral">{error}</p>}

      {result && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <DataSourceBadge source="live" />
            <span>
              ตรวจ {result.candidatesChecked} จาก {result.universeSize} ตัว · ผ่าน {result.picks.length} ตัว
              {result.barsFailed > 0 && ` · ดึงแท่งเทียนไม่สำเร็จ ${result.barsFailed} ตัว`}
            </span>
          </div>

          {result.picks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              วันนี้ไม่มีหุ้นผ่านเกณฑ์ — ไม่ผ่อนเกณฑ์เพื่อให้มีรายการ
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 font-medium">Symbol</th>
                    <th className="py-2 font-medium">Tier</th>
                    <th className="py-2 text-right font-medium">RS</th>
                    <th className="py-2 text-right font-medium">Close</th>
                    <th className="py-2 text-right font-medium">% Chg</th>
                    <th className="py-2 text-right font-medium">Pivot</th>
                    <th className="py-2 text-right font-medium">Lift (ATR)</th>
                    <th className="py-2 text-right font-medium">Vol/VDU</th>
                    <th className="py-2 text-right font-medium">Value (M)</th>
                    <th className="py-2 text-right font-medium">Entry (buy-stop)</th>
                    <th className="py-2 text-right font-medium">Stop</th>
                    <th className="py-2 text-right font-medium">Target</th>
                    <th className="py-2 text-right font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {result.picks.map((p) => (
                    <tr key={`${p.exchange}:${p.symbol}`} className="border-b border-line last:border-0">
                      <td className="py-2.5">
                        <Link
                          href={`/chart?symbol=${p.symbol}&exchange=${p.exchange}`}
                          className="font-medium text-ink hover:underline"
                        >
                          {p.symbol}
                        </Link>
                        <div className="max-w-40 truncate text-xs text-muted">{p.name}</div>
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge tone={p.tier === 3 ? "neutral" : "green"}>{TIER_LABEL[p.tier]}</Badge>
                          {p.breakout52w && p.tier !== 3 && <Badge tone="blue">52WH</Badge>}
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-ink">{p.rs}</td>
                      <td className="py-2.5 text-right text-ink">{formatCurrency(p.close, p.currency)}</td>
                      <td
                        className={
                          "py-2.5 text-right " +
                          ((p.changePercent ?? 0) >= 0 ? "text-primary-bright" : "text-coral")
                        }
                      >
                        {p.changePercent != null ? formatPercent(p.changePercent) : "—"}
                      </td>
                      <td className="py-2.5 text-right text-muted">{formatCurrency(p.pivot, p.currency)}</td>
                      <td className="py-2.5 text-right text-muted">
                        {p.liftAtr >= 0 ? "+" : ""}
                        {p.liftAtr.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right text-muted">{p.volToVdu != null ? `${p.volToVdu.toFixed(1)}x` : "—"}</td>
                      <td className="py-2.5 text-right text-muted">{formatCompact(p.valueM)}</td>
                      <PlanCell value={p.plan && formatCurrency(p.plan.entryStopBuy, p.currency)} />
                      <PlanCell value={p.plan && formatCurrency(p.plan.stop, p.currency)} />
                      <PlanCell value={p.plan && formatCurrency(p.plan.target, p.currency)} />
                      <PlanCell value={p.plan && p.plan.qty.toLocaleString("en-US")} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-muted">
            แผนเทรดมีเฉพาะ T1/T2 ที่ RS ≥ 70 และปิดเหนือ SMA50 (ความเสี่ยง 0.5% ของพอร์ตต่อไม้, ไม่เกิน 20% ของพอร์ต, R:R 1:2.5) ·
            ราคาปรับ split/ปันผล จึงเป็นค่าโดยประมาณ — เช็กราคาจริงก่อนส่งคำสั่งทุกครั้ง
          </p>

          {result.rejected.length > 0 && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer font-medium text-ink-soft">
                ถูกตัดด้วยตัวกรองฐาน (base filter) {result.rejected.length} ตัว
              </summary>
              <ul className="mt-2 space-y-0.5">
                {result.rejected.map((r) => (
                  <li key={r.symbol}>
                    <span className="font-medium text-ink-soft">{r.symbol}</span>: {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function PlanCell({ value }: { value: string | null | undefined }) {
  return <td className="py-2.5 text-right text-ink">{value ?? <span className="text-muted">—</span>}</td>;
}
