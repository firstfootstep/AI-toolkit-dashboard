"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Loader2, ScanSearch } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { LegendKey, LegendScreen } from "@/lib/legendScanner";
import { LegendAvatar } from "@/features/legend-scanner/LegendAvatar";

// sessionStorage, not localStorage: scan results are time-sensitive market
// data (see each screen's `asOf`) — worth surviving a menu switch within the
// same tab, not worth surviving days as stale "current" prices after a
// browser restart.
const STORAGE_KEY = "investview.legendScanner";

const LEGEND_TABS: { key: LegendKey; label: string }[] = [
  { key: "CANSLIM", label: "O'Neil · CANSLIM" },
  { key: "LYNCH", label: "Lynch · GARP" },
  { key: "BUFFETT", label: "Buffett · Quality-Value" },
  { key: "MINERVINI", label: "Minervini · Trend Template" },
  { key: "QULLAMAGGIE", label: "Qullamaggie · Momentum" },
  { key: "GRAHAM", label: "Graham · Deep Value" },
];

const LEGEND_DESCRIPTIONS: Record<LegendKey, string> = {
  CANSLIM: "คัดหุ้นทั้งตลาดสหรัฐฯ ตามสูตร CANSLIM ของ William O'Neil — EPS growth, near 52-week high, relative volume, relative strength",
  LYNCH: "คัดหุ้น GARP (Growth At a Reasonable Price) ตามแนวทาง Peter Lynch — PEG < 1, การเติบโตที่สมเหตุสมผล, หนี้ต่ำ, ROE เป็นบวก",
  BUFFETT: "คัดหุ้นคุณภาพ-มูลค่าตามแนวทาง Warren Buffett — ROE สูงสม่ำเสมอ, หนี้ต่ำ, ความผันผวนต่ำ (beta), ไม่จ่ายแพงเกินไป (P/E)",
  MINERVINI: "คัดหุ้นตามสูตร Trend Template (แบบย่อ 5/8 เกณฑ์) ของ Mark Minervini — ราคาอยู่เหนือ SMA50/150/200, MA เรียงชั้นถูกต้อง, ใกล้จุดสูงสุด 52 สัปดาห์, ห่างจุดต่ำสุด, relative strength",
  QULLAMAGGIE: "คัดหุ้น momentum breakout ตามแนวทางที่ Qullamaggie เผยแพร่ต่อสาธารณะ — โมเมนตัม 3 เดือนแรงสุดในตลาด, เทรนด์ขาขึ้นระยะสั้น, การเคลื่อนไหวหดตัว (tight), ปริมาณซื้อขายพุ่ง (ไม่มีสูตรทางการตายตัว นี่คือการตีความจากสิ่งที่เผยแพร่สาธารณะ)",
  GRAHAM: "คัดหุ้น deep value แบบดั้งเดิมของ Benjamin Graham — P/E ต่ำ, P/B ต่ำ, สภาพคล่องสูง (current ratio), หนี้ต่ำ",
};

interface ExplainerCriterion {
  label: string;
  text: string;
}

interface LegendExplainer {
  summary: string; // <summary> line for the <details> toggle
  intro: string;
  criteria: ExplainerCriterion[];
  footnote: string; // score/proxy caveat shown after the criteria list
}

// One explainer per legend — the "X คืออะไร" expandable block under the
// avatar/description row. Written from each legend's actual scoring logic in
// legendScanner.ts, so the criteria text and the pass/fail columns in each
// *Table component below always describe the same thresholds.
const LEGEND_EXPLAINERS: Record<LegendKey, LegendExplainer> = {
  CANSLIM: {
    summary: "CANSLIM คืออะไร — และเกณฑ์ที่ใช้ในสแกนนี้",
    intro:
      "CANSLIM เป็นสูตรคัดหุ้นเติบโตของ William O'Neil (ผู้ก่อตั้ง Investor's Business Daily) แต่ละตัวอักษรคือปัจจัยหนึ่งที่หุ้นควรมีก่อนที่ราคาจะวิ่งแรง:",
    criteria: [
      { label: "C — Current quarterly earnings", text: "กำไรไตรมาสล่าสุดโตแรง · เกณฑ์ในสแกนนี้: EPS growth ≥ 25%" },
      { label: "A — Annual earnings growth", text: "กำไรรายปีโตต่อเนื่อง · ใช้ตัวเลข EPS growth เดียวกับ C เป็น proxy (≥ 25%)" },
      {
        label: "N — New",
        text: "มีสิ่งใหม่ (สินค้าใหม่, ผู้บริหารใหม่, หรือราคาทำจุดสูงสุดใหม่) · เกณฑ์ในสแกนนี้: ห่างจากจุดสูงสุด 52 สัปดาห์ ≤ 15%",
      },
      {
        label: "S — Supply and demand",
        text: "ปริมาณซื้อขายพุ่งตอนราคาขึ้น (แรงซื้อมากกว่าแรงขาย) · เกณฑ์ในสแกนนี้: Relative Volume ≥ 1.2 เท่า",
      },
      {
        label: "L — Leader or laggard",
        text: "เป็นหุ้นนำตลาด ไม่ใช่หุ้นตาม · เกณฑ์ในสแกนนี้: เปอร์เซ็นไทล์ผลตอบแทน 1 ปี ≥ 80th (top 20% ของสแกนนี้)",
      },
      {
        label: "I — Institutional sponsorship",
        text: "มีสถาบัน/กองทุนถือและเพิ่มสัดส่วนอยู่ · เกณฑ์ในสแกนนี้ใช้ analyst rating เป็น proxy (≥ 0.3) เพราะไม่มีข้อมูลการถือครองสถาบันแบบเรียลไทม์",
      },
      {
        label: "M — Market direction",
        text: "ทิศทางตลาดโดยรวม (ดัชนีอยู่ในเทรนด์ขาขึ้นหรือไม่) · ไม่ได้นับเป็นคะแนนของหุ้นรายตัว แต่แสดงแยกเป็นแบนเนอร์ \"สภาพตลาด\" ด้านล่าง (SPY เทียบ SMA 50 วัน)",
      },
    ],
    footnote:
      "Score ในตารางนับจาก C/A/N/S/L/I ที่ผ่านเกณฑ์ (เต็ม 6) — เกณฑ์ทุกข้อเป็น proxy ที่คำนวณจากข้อมูลที่มี ไม่ใช่นิยามทางการทั้งหมดของ O'Neil",
  },
  LYNCH: {
    summary: "GARP คืออะไร — และเกณฑ์ที่ใช้ในสแกนนี้",
    intro:
      "GARP (Growth At a Reasonable Price) เป็นแนวทางของ Peter Lynch (อดีตผู้จัดการกองทุน Fidelity Magellan) — ซื้อหุ้นเติบโตโดยไม่จ่ายแพงเกินไป วัดด้วย PEG ratio เป็นหลัก:",
    criteria: [
      {
        label: "PEG < 1",
        text: "ราคาถูกเมื่อเทียบกับอัตราการเติบโตของกำไร (P/E ต่ำกว่าอัตราโต) · เกณฑ์ในสแกนนี้: PEG ratio มากกว่า 0 และน้อยกว่า 1",
      },
      {
        label: "Growth ที่สมเหตุสมผล",
        text: "Lynch เตือนว่าการเติบโตเร็วเกินไปมักไม่ยั่งยืน · เกณฑ์ในสแกนนี้: EPS growth 10–50% YoY (นอกช่วงนี้ไม่นับผ่าน)",
      },
      { label: "Debt ต่ำ", text: "งบดุลแข็งแรง ไม่พึ่งหนี้มากเกินไป · เกณฑ์ในสแกนนี้: Debt/Equity < 0.5" },
      {
        label: "Quality",
        text: "กำไรที่แท้จริง ไม่ใช่แค่ตัวเลขบัญชี · เกณฑ์ในสแกนนี้ใช้ ROE ≥ 10% เป็นเช็กพื้นฐานเรื่องกำไร ไม่ใช่เกณฑ์ทางการของ Lynch",
      },
    ],
    footnote: "Score ในตารางนับจาก PEG/Growth/Debt/Quality ที่ผ่านเกณฑ์ (เต็ม 4) — เกณฑ์ทุกข้อเป็น proxy ที่คำนวณจากข้อมูลที่มี",
  },
  BUFFETT: {
    summary: "Quality-Value คืออะไร — และเกณฑ์ที่ใช้ในสแกนนี้",
    intro:
      "แนวทางของ Warren Buffett คือซื้อ \"ธุรกิจดีในราคาที่สมเหตุสมผล\" — เน้นความสามารถทำกำไรต่อเนื่อง (moat), งบดุลที่มั่นคง, ความผันผวนต่ำ และไม่จ่ายแพงเกินไป:",
    criteria: [
      {
        label: "ROE สูงสม่ำเสมอ (moat proxy)",
        text: "ธุรกิจทำกำไรได้ดีต่อเนื่อง สะท้อน \"moat\" เชิงตัวเลข · เกณฑ์ในสแกนนี้: ROE ≥ 15%",
      },
      { label: "Debt ต่ำ", text: "งบดุลไม่เสี่ยงเกินไป · เกณฑ์ในสแกนนี้: Debt/Equity < 0.8" },
      { label: "Stability", text: "ความผันผวนต่ำกว่าตลาดโดยรวมพอสมควร (ธุรกิจที่คาดเดาได้) · เกณฑ์ในสแกนนี้: Beta < 1.2" },
      { label: "Valuation", text: "ไม่จ่ายแพงเกินไปแม้ธุรกิจจะดี · เกณฑ์ในสแกนนี้: P/E เป็นบวกและ ≤ 25" },
    ],
    footnote:
      "Score ในตารางนับจาก ROE/Debt/Stability/Valuation ที่ผ่านเกณฑ์ (เต็ม 4) — ไม่มีข้อมูลสัดส่วนการถือหุ้นระยะยาวจริงในระบบนี้ ดังนั้นนี่คือ proxy เชิงตัวเลข ไม่ใช่การวิเคราะห์ moat แบบที่ Buffett ทำจริง",
  },
  MINERVINI: {
    summary: "Trend Template คืออะไร — และเกณฑ์ที่ใช้ในสแกนนี้",
    intro:
      "Trend Template เป็นเกณฑ์ 8 ข้อของ Mark Minervini สำหรับกรองหาหุ้นที่อยู่ใน \"stage 2\" ขาขึ้น สแกนนี้ใช้ได้ 5 ข้อที่มีข้อมูลรองรับ:",
    criteria: [
      { label: "Price > MAs", text: "ราคาอยู่เหนือเส้นค่าเฉลี่ยทั้งหมด (เทรนด์ขาขึ้นชัดเจน) · เกณฑ์ในสแกนนี้: ราคา > SMA50, SMA150 และ SMA200" },
      { label: "MA Stack", text: "เส้นค่าเฉลี่ยเรียงชั้นถูกต้อง (เทรนด์แข็งแรงต่อเนื่อง) · เกณฑ์ในสแกนนี้: SMA50 > SMA150 > SMA200" },
      { label: "Above Low", text: "ราคาห่างจากจุดต่ำสุดพอสมควรแล้ว (ไม่ใช่หุ้นที่เพิ่งฟื้นจากก้นเหว) · เกณฑ์ในสแกนนี้: อยู่เหนือ 52-week low อย่างน้อย 25%" },
      { label: "Near High", text: "ราคาใกล้จุดสูงสุด 52 สัปดาห์ พร้อมทำจุดสูงสุดใหม่ · เกณฑ์ในสแกนนี้: ห่างจาก 52-week high ไม่เกิน 25%" },
      { label: "RS", text: "เป็นหุ้นนำตลาด (relative strength) · เกณฑ์ในสแกนนี้: เปอร์เซ็นไทล์ผลตอบแทน 1 ปี ≥ 70th เทียบหุ้นอื่นในสแกนนี้" },
    ],
    footnote:
      "Score ในตารางนับจาก 5 ข้อนี้ (เต็ม 5) — ตัดข้อ \"SMA200 ต้องมีแนวโน้มขึ้นต่อเนื่อง ≥1 เดือน\" ออก เพราะต้องใช้ค่า SMA200 ย้อนหลังเป็นอนุกรมเวลา ซึ่ง TradingView scanner endpoint นี้ให้แค่ snapshot ปัจจุบัน — ดู .claude/agents/legend-scanner-agent.md สำหรับรายละเอียด",
  },
  QULLAMAGGIE: {
    summary: "Momentum Breakout คืออะไร — และเกณฑ์ที่ใช้ในสแกนนี้",
    intro:
      "Qullamaggie เป็นนามแฝงของเทรดเดอร์ที่เผยแพร่แนวทางเทรดโมเมนตัมต่อสาธารณะ — หาหุ้นที่แรงที่สุดในตลาด อยู่ในเทรนด์สั้นชัดเจน ราคาบีบตัวแน่น (tight) แล้วทะลุพร้อมวอลุ่ม ไม่มีสูตรตัวเลขทางการที่เผยแพร่ นี่คือการตีความจากแนวทางสาธารณะ:",
    criteria: [
      { label: "Momentum", text: "อยู่ในกลุ่มที่วิ่งแรงที่สุดของตลาดในรอบ 3 เดือน · เกณฑ์ในสแกนนี้: เปอร์เซ็นไทล์ผลตอบแทน 3 เดือน ≥ 90th ของสแกนนี้" },
      { label: "Trend", text: "เทรนด์ระยะสั้นขึ้นชัดเจน · เกณฑ์ในสแกนนี้: ราคา > SMA20 > SMA50" },
      {
        label: "Tightness (volatility contraction)",
        text: "ราคาบีบตัวแคบก่อนทะลุ (ผันผวนน้อยลง) · เกณฑ์ในสแกนนี้: ATR% อยู่ในกลุ่มแคบที่สุด 40% ของสแกนนี้",
      },
      { label: "Volume Surge", text: "มีแรงซื้อเข้าจริงตอนทะลุ · เกณฑ์ในสแกนนี้: Relative Volume ≥ 1.5 เท่า" },
    ],
    footnote:
      "Score ในตารางนับจาก Momentum/Trend/Tightness/Volume Surge ที่ผ่านเกณฑ์ (เต็ม 4) — ไม่ใช่เกณฑ์ที่ยืนยันจาก Qullamaggie เองโดยตรง ตีความอย่างระมัดระวังกว่าสูตรอื่นในหน้านี้",
  },
  GRAHAM: {
    summary: "Deep Value คืออะไร — และเกณฑ์ที่ใช้ในสแกนนี้",
    intro:
      "Benjamin Graham (ครูของ Buffett, ผู้เขียน The Intelligent Investor) วางรากฐาน Value Investing — ซื้อหุ้นที่ราคาต่ำกว่ามูลค่าที่แท้จริงมาก พร้อม margin of safety จากงบดุลที่แข็งแรง:",
    criteria: [
      { label: "Valuation", text: "ราคาถูกเทียบกำไร · เกณฑ์ในสแกนนี้: P/E เป็นบวกและ ≤ 15" },
      { label: "Book Value", text: "ราคาถูกเทียบมูลค่าทางบัญชี · เกณฑ์ในสแกนนี้: P/B เป็นบวกและ ≤ 1.5" },
      { label: "Liquidity", text: "สภาพคล่องสูง จ่ายหนี้สั้นได้สบาย · เกณฑ์ในสแกนนี้: Current ratio ≥ 2" },
      { label: "Leverage", text: "หนี้ต่ำ ไม่เสี่ยงเกินไป · เกณฑ์ในสแกนนี้: Debt/Equity < 0.5" },
    ],
    footnote:
      "Score ในตารางนับจาก Valuation/Book Value/Liquidity/Leverage ที่ผ่านเกณฑ์ (เต็ม 4) — เกณฑ์คลาสสิกเข้มงวดกว่า Buffett/Lynch มาก จึงมักเจอผู้เข้าเกณฑ์น้อยกว่าสูตรอื่นในตลาดขาขึ้น",
  },
};

function LegendExplainerDetails({ explainer }: { explainer: LegendExplainer }) {
  return (
    <details className="mb-4 rounded-[var(--radius-md)] border border-line bg-canvas p-3 text-xs text-ink-soft">
      <summary className="cursor-pointer font-medium text-ink">{explainer.summary}</summary>
      <p className="mt-2">{explainer.intro}</p>
      <ul className="mt-2 space-y-1.5">
        {explainer.criteria.map((c) => (
          <li key={c.label}>
            <span className="font-medium text-ink">{c.label}</span> {c.text}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-muted">{explainer.footnote}</p>
    </details>
  );
}

function fmt(value: number | null, digits = 1, suffix = ""): string {
  return value == null ? "–" : `${value.toFixed(digits)}${suffix}`;
}

function ChangeCell({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value == null) return <span className="text-muted">–</span>;
  const up = value >= 0;
  return (
    <span className={clsx("font-medium", up ? "text-primary-bright" : "text-coral")}>
      {up ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

function scoreTone(score: number, max: number): "green" | "blue" | "neutral" {
  const ratio = score / max;
  if (ratio >= 0.8) return "green";
  if (ratio >= 0.5) return "blue";
  return "neutral";
}

// ✓ pass / ✗ fail / – not measurable for this stock (never counted as a fail).
function PassMark({ pass }: { pass: boolean | null }) {
  if (pass == null) return <span className="text-muted">–</span>;
  return (
    <span className={clsx("font-semibold", pass ? "text-primary-bright" : "text-coral")}>
      {pass ? "✓" : "✗"}
    </span>
  );
}

const CORRECTION_THRESHOLD_PCT = -5;

function marketTrend(spyClose: number | null, spySma50: number | null): {
  label: string;
  tone: "green" | "amber" | "red" | "neutral";
  note: string;
} | null {
  if (spyClose == null || spySma50 == null) return null;
  const pctVsSma = ((spyClose - spySma50) / spySma50) * 100;
  if (pctVsSma >= 0) {
    return { label: "ตลาดเป็นขาขึ้น", tone: "green", note: "ใช้ผลสแกนได้ตามปกติ" };
  }
  if (pctVsSma >= CORRECTION_THRESHOLD_PCT) {
    return { label: "ตลาดกำลังปรับฐาน", tone: "amber", note: "ใกล้แนวรับ SMA50 — เก็บผลสแกนไว้เป็น watchlist ก่อน" };
  }
  return { label: "ตลาดเป็นขาลง", tone: "red", note: "ต่ำกว่า SMA50 ชัดเจน — เก็บผลสแกนไว้เป็น watchlist ก่อน" };
}

function MarketGateBanner({ gate, universeSize }: { gate: { spyClose: number | null; spySma50: number | null; isOpen: boolean | null }; universeSize: number }) {
  const trend = marketTrend(gate.spyClose, gate.spySma50);
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-canvas p-3 text-xs text-ink-soft">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-ink">สภาพตลาด:</span>
        {trend == null ? (
          <span className="text-muted">ไม่มีข้อมูล</span>
        ) : (
          <>
            <Badge tone={trend.tone}>{trend.label}</Badge>
            <span className="text-muted">{trend.note}</span>
          </>
        )}
      </div>
      <div className="mt-1 text-muted">
        SPY {fmt(gate.spyClose, 2)} เทียบ SMA 50 วัน {fmt(gate.spySma50, 2)} · สแกนแล้ว {universeSize.toLocaleString()} หุ้น
      </div>
    </div>
  );
}

function SymbolCell({ symbol, exchange, sector }: { symbol: string; exchange: string; sector: string }) {
  return (
    <td className="px-3 py-2">
      <Link
        href={`/chart?symbol=${symbol}${exchange ? `&exchange=${exchange}` : ""}`}
        className="font-medium text-ink hover:text-primary-bright hover:underline"
      >
        {symbol}
      </Link>
      <div className="text-xs text-muted">{sector}</div>
    </td>
  );
}

function CanslimTable({ screen }: { screen: Extract<LegendScreen, { legend: "CANSLIM" }> }) {
  return (
    <>
      <MarketGateBanner gate={screen.marketGate} universeSize={screen.universeSize} />
      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Close</th>
              <th className="px-3 py-2 font-medium">Chg%</th>
              <th className="px-3 py-2 font-medium">%off 52WH</th>
              <th className="px-3 py-2 font-medium">RS (percentile)</th>
              <th className="px-3 py-2 font-medium">EPS Growth%</th>
              <th className="px-3 py-2 font-medium">Rel Vol</th>
              <th className="px-3 py-2 text-center font-medium">C</th>
              <th className="px-3 py-2 text-center font-medium">A</th>
              <th className="px-3 py-2 text-center font-medium">N</th>
              <th className="px-3 py-2 text-center font-medium">S</th>
              <th className="px-3 py-2 text-center font-medium">L</th>
              <th className="px-3 py-2 text-center font-medium">I</th>
              <th className="px-3 py-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {screen.candidates.map((c) => (
              <tr key={c.symbol} className="border-b border-line last:border-0">
                <SymbolCell symbol={c.symbol} exchange={c.exchange} sector={c.sector} />
                <td className="px-3 py-2 text-ink-soft">{fmt(c.price, 2)}</td>
                <td className="px-3 py-2">
                  <ChangeCell value={c.changePercent} />
                </td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.percentOffHigh, 1, "%")}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.perfYearPercentile, 0, "th")}</td>
                <td className="px-3 py-2">
                  <ChangeCell value={c.epsGrowthPercent} />
                </td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.relativeVolume, 1, "x")}</td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.c} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.a} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.n} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.s} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.l} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.i} /></td>
                <td className="px-3 py-2">
                  <Badge tone={scoreTone(c.score, 6)}>{c.score}/6</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted/70">
        RS = เปอร์เซ็นไทล์ผลตอบแทน 1 ปี เทียบกับหุ้นทั้งหมดในสแกนนี้ (ไม่ใช่ RS rating ทางการของ
        O&apos;Neil) — I ใช้ analyst rating เป็น proxy สถาบัน
      </p>
    </>
  );
}

function LynchTable({ screen }: { screen: Extract<LegendScreen, { legend: "LYNCH" }> }) {
  return (
    <>
      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Close</th>
              <th className="px-3 py-2 font-medium">Chg%</th>
              <th className="px-3 py-2 font-medium">PEG</th>
              <th className="px-3 py-2 font-medium">EPS Growth%</th>
              <th className="px-3 py-2 font-medium">Debt/Equity</th>
              <th className="px-3 py-2 font-medium">ROE%</th>
              <th className="px-3 py-2 text-center font-medium">PEG&lt;1</th>
              <th className="px-3 py-2 text-center font-medium">Growth</th>
              <th className="px-3 py-2 text-center font-medium">Debt</th>
              <th className="px-3 py-2 text-center font-medium">Quality</th>
              <th className="px-3 py-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {screen.candidates.map((c) => (
              <tr key={c.symbol} className="border-b border-line last:border-0">
                <SymbolCell symbol={c.symbol} exchange={c.exchange} sector={c.sector} />
                <td className="px-3 py-2 text-ink-soft">{fmt(c.price, 2)}</td>
                <td className="px-3 py-2">
                  <ChangeCell value={c.changePercent} />
                </td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.pegRatio, 2)}</td>
                <td className="px-3 py-2">
                  <ChangeCell value={c.epsGrowthPercent} />
                </td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.debtToEquity, 2)}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.roePercent, 1, "%")}</td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.peg} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.growth} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.debt} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.quality} /></td>
                <td className="px-3 py-2">
                  <Badge tone={scoreTone(c.score, 4)}>{c.score}/4</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted/70">
        Growth = EPS growth 10-50% YoY (โซน &quot;สมเหตุสมผล&quot; ของ Lynch — เร็วไปมักไม่ยั่งยืน) — Quality
        ใช้ ROE ≥ 10% เป็นเช็กพื้นฐานเรื่องกำไรที่แท้จริง ไม่ใช่เกณฑ์ทางการของ Lynch
      </p>
    </>
  );
}

function BuffettTable({ screen }: { screen: Extract<LegendScreen, { legend: "BUFFETT" }> }) {
  return (
    <>
      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Close</th>
              <th className="px-3 py-2 font-medium">Chg%</th>
              <th className="px-3 py-2 font-medium">ROE%</th>
              <th className="px-3 py-2 font-medium">Debt/Equity</th>
              <th className="px-3 py-2 font-medium">Beta</th>
              <th className="px-3 py-2 font-medium">P/E</th>
              <th className="px-3 py-2 text-center font-medium">ROE</th>
              <th className="px-3 py-2 text-center font-medium">Debt</th>
              <th className="px-3 py-2 text-center font-medium">Stable</th>
              <th className="px-3 py-2 text-center font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {screen.candidates.map((c) => (
              <tr key={c.symbol} className="border-b border-line last:border-0">
                <SymbolCell symbol={c.symbol} exchange={c.exchange} sector={c.sector} />
                <td className="px-3 py-2 text-ink-soft">{fmt(c.price, 2)}</td>
                <td className="px-3 py-2">
                  <ChangeCell value={c.changePercent} />
                </td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.roePercent, 1, "%")}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.debtToEquity, 2)}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.beta, 2)}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.peRatio, 1)}</td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.roe} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.debt} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.stability} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.valuation} /></td>
                <td className="px-3 py-2">
                  <Badge tone={scoreTone(c.score, 4)}>{c.score}/4</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted/70">
        ROE ≥ 15% และ beta &lt; 1.2 ใช้แทน &quot;moat&quot; และความมั่นคงเชิงคุณภาพ ไม่มีข้อมูลสัดส่วนการถือหุ้น
        ระยะยาวจริงในระบบนี้ ดังนั้นนี่คือ proxy เชิงตัวเลข ไม่ใช่การวิเคราะห์ moat แบบที่ Buffett ทำจริง
      </p>
    </>
  );
}

function MinerviniTable({ screen }: { screen: Extract<LegendScreen, { legend: "MINERVINI" }> }) {
  return (
    <>
      <MarketGateBanner gate={screen.marketGate} universeSize={screen.universeSize} />
      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Close</th>
              <th className="px-3 py-2 font-medium">Chg%</th>
              <th className="px-3 py-2 font-medium">SMA50</th>
              <th className="px-3 py-2 font-medium">SMA150</th>
              <th className="px-3 py-2 font-medium">SMA200</th>
              <th className="px-3 py-2 font-medium">%off 52WH</th>
              <th className="px-3 py-2 font-medium">%above 52WL</th>
              <th className="px-3 py-2 font-medium">RS (percentile)</th>
              <th className="px-3 py-2 text-center font-medium">Price&gt;MAs</th>
              <th className="px-3 py-2 text-center font-medium">MA Stack</th>
              <th className="px-3 py-2 text-center font-medium">Above Low</th>
              <th className="px-3 py-2 text-center font-medium">Near High</th>
              <th className="px-3 py-2 text-center font-medium">RS</th>
              <th className="px-3 py-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {screen.candidates.map((c) => (
              <tr key={c.symbol} className="border-b border-line last:border-0">
                <SymbolCell symbol={c.symbol} exchange={c.exchange} sector={c.sector} />
                <td className="px-3 py-2 text-ink-soft">{fmt(c.price, 2)}</td>
                <td className="px-3 py-2">
                  <ChangeCell value={c.changePercent} />
                </td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.sma50, 2)}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.sma150, 2)}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.sma200, 2)}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.percentOffHigh, 1, "%")}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.percentAboveLow, 1, "%")}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.rsPercentile, 0, "th")}</td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.priceAboveMAs} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.maStack} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.aboveLow} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.nearHigh} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.rs} /></td>
                <td className="px-3 py-2">
                  <Badge tone={scoreTone(c.score, 5)}>{c.score}/5</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted/70">
        เวอร์ชันย่อของ Trend Template จริง (8 เกณฑ์) — ใช้ได้ 5 ข้อที่มีข้อมูลรองรับในระบบนี้ (ราคาอยู่เหนือ
        SMA50/150/200 ทั้งหมด, MA เรียงชั้นถูกต้อง 50&gt;150&gt;200, ห่างจาก low, ใกล้ high, RS) — ข้อเดียวที่
        ตัดออกจริงๆ คือ &quot;SMA200 ต้องมีแนวโน้มขึ้นต่อเนื่อง ≥1 เดือน&quot; เพราะต้องใช้ค่า SMA200 ย้อนหลังเป็น
        อนุกรมเวลา ซึ่ง TradingView scanner endpoint นี้ให้แค่ snapshot ปัจจุบัน ไม่มี offset ย้อนหลังให้ดึง — ดู
        .claude/agents/legend-scanner-agent.md สำหรับรายละเอียด
      </p>
    </>
  );
}

function QullamaggieTable({ screen }: { screen: Extract<LegendScreen, { legend: "QULLAMAGGIE" }> }) {
  return (
    <>
      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Close</th>
              <th className="px-3 py-2 font-medium">Chg%</th>
              <th className="px-3 py-2 font-medium">Perf 3M%</th>
              <th className="px-3 py-2 font-medium">Momentum (percentile)</th>
              <th className="px-3 py-2 font-medium">ATR%</th>
              <th className="px-3 py-2 font-medium">Rel Vol</th>
              <th className="px-3 py-2 text-center font-medium">Momentum</th>
              <th className="px-3 py-2 text-center font-medium">Trend</th>
              <th className="px-3 py-2 text-center font-medium">Tight</th>
              <th className="px-3 py-2 text-center font-medium">Vol Surge</th>
              <th className="px-3 py-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {screen.candidates.map((c) => (
              <tr key={c.symbol} className="border-b border-line last:border-0">
                <SymbolCell symbol={c.symbol} exchange={c.exchange} sector={c.sector} />
                <td className="px-3 py-2 text-ink-soft">{fmt(c.price, 2)}</td>
                <td className="px-3 py-2">
                  <ChangeCell value={c.changePercent} />
                </td>
                <td className="px-3 py-2">
                  <ChangeCell value={c.perf3MPercent} />
                </td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.momentumPercentile, 0, "th")}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.atrPercent, 1, "%")}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.relativeVolume, 1, "x")}</td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.momentum} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.trend} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.tightness} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.volumeSurge} /></td>
                <td className="px-3 py-2">
                  <Badge tone={scoreTone(c.score, 4)}>{c.score}/4</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted/70">
        Qullamaggie ไม่มีสูตรทางการที่เผยแพร่เป็นตัวเลขตายตัว — นี่คือการตีความจากแนวทางที่เผยแพร่สาธารณะ
        (โมเมนตัม 3 เดือนแรงสุด, เทรนด์ระยะสั้นขึ้น, ATR% หดตัว, volume พุ่ง) ไม่ใช่เกณฑ์ที่ยืนยันจาก
        Qullamaggie เองโดยตรง — ตีความอย่างระมัดระวังกว่าสูตรอื่นในหน้านี้
      </p>
    </>
  );
}

function GrahamTable({ screen }: { screen: Extract<LegendScreen, { legend: "GRAHAM" }> }) {
  return (
    <>
      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Close</th>
              <th className="px-3 py-2 font-medium">Chg%</th>
              <th className="px-3 py-2 font-medium">P/E</th>
              <th className="px-3 py-2 font-medium">P/B</th>
              <th className="px-3 py-2 font-medium">Current Ratio</th>
              <th className="px-3 py-2 font-medium">Debt/Equity</th>
              <th className="px-3 py-2 text-center font-medium">Value</th>
              <th className="px-3 py-2 text-center font-medium">Book</th>
              <th className="px-3 py-2 text-center font-medium">Liquid</th>
              <th className="px-3 py-2 text-center font-medium">Debt</th>
              <th className="px-3 py-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {screen.candidates.map((c) => (
              <tr key={c.symbol} className="border-b border-line last:border-0">
                <SymbolCell symbol={c.symbol} exchange={c.exchange} sector={c.sector} />
                <td className="px-3 py-2 text-ink-soft">{fmt(c.price, 2)}</td>
                <td className="px-3 py-2">
                  <ChangeCell value={c.changePercent} />
                </td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.peRatio, 1)}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.priceToBook, 2)}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.currentRatio, 2)}</td>
                <td className="px-3 py-2 text-ink-soft">{fmt(c.debtToEquity, 2)}</td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.valuation} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.bookValue} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.liquidity} /></td>
                <td className="px-3 py-2 text-center"><PassMark pass={c.passes.leverage} /></td>
                <td className="px-3 py-2">
                  <Badge tone={scoreTone(c.score, 4)}>{c.score}/4</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted/70">
        เกณฑ์คลาสสิกของ Graham (P/E≤15, P/B≤1.5, current ratio≥2, debt/equity&lt;0.5) — เข้มงวดกว่า
        Buffett/Lynch มาก จึงมักเจอผู้เข้าเกณฑ์น้อยกว่าสูตรอื่นในตลาดขาขึ้น
      </p>
    </>
  );
}

export function LegendScannerPanel() {
  const [legend, setLegend] = useState<LegendKey>("CANSLIM");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [screens, setScreens] = useState<Partial<Record<LegendKey, LegendScreen>>>({});
  const screen = screens[legend] ?? null;

  useEffect(() => {
    // One-time read of sessionStorage, unavailable during SSR — must happen post-mount.
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setScreens(JSON.parse(raw));
    } catch {
      // ignore corrupted session storage
    }
  }, []);

  async function run(selected: LegendKey) {
    if (status === "loading") return;
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch(`/api/legend-scanner?legend=${selected}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
      setScreens((prev) => {
        const next = { ...prev, [selected]: json.screen as LegendScreen };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function selectTab(selected: LegendKey) {
    setLegend(selected);
    setError(null);
  }

  return (
    <Card
      title="Legend Scanner"
      action={
        <button
          type="button"
          onClick={() => run(legend)}
          disabled={status === "loading"}
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary-bright px-3 py-1.5 text-xs font-medium text-paper transition-colors duration-200 hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? (
            <>
              <Loader2 size={13} className="animate-spin" /> กำลังสแกน…
            </>
          ) : (
            <>
              <ScanSearch size={13} /> สแกนหุ้น
            </>
          )}
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {LEGEND_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => selectTab(tab.key)}
            disabled={status === "loading"}
            className={clsx(
              "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
              legend === tab.key ? "bg-primary-bright text-paper" : "bg-ink/6 text-muted hover:bg-ink/10"
            )}
          >
            <LegendAvatar legend={tab.key} size="sm" tone={legend === tab.key ? "onPrimary" : "default"} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-4">
        <LegendAvatar legend={legend} size="lg" />
        <p className="text-sm text-muted">{LEGEND_DESCRIPTIONS[legend]}</p>
      </div>

      <LegendExplainerDetails explainer={LEGEND_EXPLAINERS[legend]} />

      {status === "error" && error && <p className="mb-3 text-xs text-coral">{error}</p>}

      {!screen && status !== "loading" && (
        <p className="text-xs text-muted/70">ยังไม่ได้สแกน — เลือกสูตรแล้วกดปุ่มด้านบนเพื่อเริ่ม</p>
      )}

      {screen && (
        <div className="space-y-4">
          {screen.legend === "CANSLIM" && <CanslimTable screen={screen} />}
          {screen.legend === "LYNCH" && <LynchTable screen={screen} />}
          {screen.legend === "BUFFETT" && <BuffettTable screen={screen} />}
          {screen.legend === "MINERVINI" && <MinerviniTable screen={screen} />}
          {screen.legend === "QULLAMAGGIE" && <QullamaggieTable screen={screen} />}
          {screen.legend === "GRAHAM" && <GrahamTable screen={screen} />}
        </div>
      )}
    </Card>
  );
}
