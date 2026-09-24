// Generates src/fixtures/trade-setups.csv — the ONE master trading journal
// every number on the Portfolio page (and the Dashboard/Reports summaries)
// is derived from, via getTradingJournalStats() in src/lib/tradingJournal.ts.
// Each row here is one full trade idea — entry setup type, RS rating and
// relative volume at entry, position sizing, and the outcome (plus exit
// price/date once closed, which doubles as the NAV/P&L engine's FIFO log)
// — the kind of context a trading-coach agent would need to give real
// behavioral feedback, not just recompute stats a fixed formula already
// covers.
//
// Deterministic (seeded RNG), and it deliberately bakes in a few realistic
// bad habits rather than pure noise,
// so there's something a future analysis agent can actually discover:
//   1. Winners are cut short (avg win % is capped low) while losers are
//      let run (avg loss % has a long tail) — classic risk/reward inversion.
//   2. Position sizing is INVERTED — bigger size on weaker setups (Pullback/
//      VDU, low RS) than on the highest-quality Breakout/VCP setups.
//   3. VDU entries are mostly taken pre-breakout (jumping the gun before
//      volume actually confirms), which is why they lose more often.
// Re-run with `node scripts/generate-trade-setups.mjs` if the shape needs
// to change, rather than hand-editing the CSV.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../src/fixtures/trade-setups.csv");

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260916);
const randRange = (min, max) => min + rand() * (max - min);
const randInt = (min, max) => Math.floor(randRange(min, max + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const SYMBOLS = [
  { symbol: "NVDA", base: 480 },
  { symbol: "AAPL", base: 189 },
  { symbol: "MSFT", base: 402 },
  { symbol: "TSLA", base: 245 },
  { symbol: "PLTR", base: 38 },
];

const SETUPS = ["Breakout", "Pullback", "VCP", "VDU", "Episodic Pivot"];

const TRADE_COUNT = 36;
const DAYS_BACK = 180;
const today = new Date("2026-09-16"); // matches this session's currentDate

const NOTE_TEMPLATES = {
  Breakout: {
    win: [
      "Breakout ทะลุฐานแบบ 6 สัปดาห์ RS {rs} วอลุ่ม {vol}x ของค่าเฉลี่ย — ถือผ่าน pullback แรกไปถึง 10dma",
      "Breakout สวยงามจากฐาน cup-with-handle, RS {rs} ทำตามแผน trailing stop ที่ 21dma",
    ],
    loss: [
      "Breakout ที่ RS {rs} แต่วอลุ่มแค่ {vol}x — ราคาอ่อนตัวลงภายในไม่กี่วัน ตัดขาดทุนตามแผน",
      "ไล่ราคา breakout ที่ยืดตัวไปมากแล้ว RS {rs} ไม่มีฐานที่แท้จริง — โดน stop เร็ว",
    ],
  },
  Pullback: {
    win: [
      "Pullback มาที่เส้น 21dma ที่กำลังขึ้น RS {rs} เข้าไม้ตามตำรา ทยอยขายทำกำไรตอนราคาแข็งแรง",
      "ซื้อวันเขียวแรกที่หลุด 10dma RS {rs} เป็นไปตามแผนที่วางไว้",
    ],
    loss: [
      "FOMO เข้าไม้ pullback หลังพลาด breakout RS แค่ {rs} — ยัง size ใหญ่เข้าไปอีก โดน stop",
      "revenge trade เข้าไม้ pullback ตัวเดิมซ้ำทันทีหลังขาดทุน RS {rs} — ผิดพลาดซ้ำเดิม ขาดทุนอีกรอบ",
    ],
  },
  VCP: {
    win: [
      "VCP ตามตำรา หด volatility แน่นขึ้นเรื่อยๆ บนวอลุ่มที่แห้งลง {vol}x, RS {rs} — เข้าเต็ม position ถือถึงเป้า",
      "Breakout VCP ระยะที่ 3, RS {rs} จัดขนาด position เหมาะสม trailing stop ที่ 10dma",
    ],
    loss: [
      "รูปแบบ VCP ดูถูกต้อง แต่ RS แค่ {rs} — breakout เข้าไปในตลาดที่อ่อนแอ โดน stop",
      "กระโดดเข้า VCP breakout เร็วไปหนึ่งวัน วอลุ่มยังไม่ยืนยัน — โดน stop ตอนโดนเขย่าออก",
    ],
  },
  VDU: {
    win: [
      "เข้าไม้ตอนวอลุ่มแห้ง (VDU) ก่อน breakout จริง RS {rs} — ครั้งนี้ได้ผลแต่เข้าเร็วไปหน่อย",
    ],
    loss: [
      "เข้าก่อน breakout บนวอลุ่มต่ำ (VDU) RS แค่ {rs} — ไม่มีการยืนยัน หุ้นไม่ breakout จริง โดน stop",
      "คาดการณ์ breakout ล่วงหน้าแทนที่จะรอวอลุ่มยืนยัน — พลาดแบบคลาสสิกคือรีบเข้าก่อนเวลา RS {rs} ขาดทุน",
      "Size ใหญ่ในไม้ VDU หวังเข้าก่อนคนอื่น RS {rs} — ไม่มี follow-through ตัดขาดทุนช้าไปหน่อย",
    ],
  },
  "Episodic Pivot": {
    win: [
      "EP gap ขึ้นจากผลประกอบการ RS {rs} วอลุ่มมหาศาล {vol}x — ถือผ่านความผันผวน ปิดใกล้จุดสูงสุด",
    ],
    loss: [
      "EP จากผลประกอบการที่ดี แต่ RS แค่ {rs} ตอนเข้า — gap ขึ้นแล้วอ่อนตัว โดน stop ตอนกลับตัว",
    ],
  },
};

function winProbability(setup, rs, relVol) {
  switch (setup) {
    case "Breakout":
      return rs >= 85 && relVol >= 1.5 ? 0.68 : 0.4;
    case "Pullback":
      return rs >= 80 ? 0.55 : 0.42;
    case "VCP":
      return rs >= 85 ? 0.66 : 0.45;
    case "VDU":
      // VDU entries here are deliberately taken pre-breakout (no volume
      // confirmation yet) — the lowest win rate of the five on purpose.
      return 0.32;
    case "Episodic Pivot":
      return rs >= 85 && relVol >= 2 ? 0.58 : 0.4;
    default:
      return 0.5;
  }
}

// Sizing is deliberately INVERTED from good practice — bigger on weaker
// setups (Pullback/VDU with low RS), smaller on the highest-quality
// Breakout/VCP setups — one of the patterns this fixture exists to surface.
function positionSizePercent(setup, rs) {
  const weak = (setup === "Pullback" || setup === "VDU") && rs < 80;
  return weak ? randRange(7, 12) : randRange(2, 5);
}

const dayOffsets = Array.from({ length: TRADE_COUNT }, () => Math.floor(rand() * DAYS_BACK)).sort((a, b) => b - a);

const trades = dayOffsets.map((dayOffset) => {
  const sym = pick(SYMBOLS);
  const setup = pick(SETUPS);
  const entryDate = new Date(today);
  entryDate.setDate(entryDate.getDate() - dayOffset);

  const rsRating = randInt(55, 98);
  const relativeVolume = Math.round(randRange(0.8, 3.2) * 10) / 10;
  const sizePercent = Math.round(positionSizePercent(setup, rsRating) * 10) / 10;
  const riskPercent = Math.round(randRange(0.5, 2.5) * 10) / 10; // planned risk, % of equity

  const win = rand() < winProbability(setup, rsRating, relativeVolume);
  // Winners capped low (cut short), losers given a longer tail (let run) —
  // the risk/reward-inversion pattern this fixture bakes in on purpose.
  const pnlPercent = win ? Math.round(randRange(2, 11) * 10) / 10 : -Math.round(randRange(3, 16) * 10) / 10;

  const entryPrice = Math.round(sym.base * randRange(0.85, 1.15) * 100) / 100;
  const exitPrice = Math.round(entryPrice * (1 + pnlPercent / 100) * 100) / 100;
  const holdDays = randInt(1, dayOffset > 5 ? Math.min(dayOffset, 40) : 5);
  const exitDate = new Date(entryDate);
  exitDate.setDate(exitDate.getDate() + holdDays);
  const stillOpen = dayOffset < 3; // most recent handful are left open

  const qty = Math.max(1, Math.round((100_000 * (sizePercent / 100)) / entryPrice));

  const noteSet = NOTE_TEMPLATES[setup][win ? "win" : "loss"];
  const note = pick(noteSet)
    .replace("{rs}", String(rsRating))
    .replace("{vol}", relativeVolume.toFixed(1));

  return {
    date: entryDate.toISOString().slice(0, 10),
    symbol: sym.symbol,
    setup,
    rsRating,
    relativeVolume,
    entryPrice,
    exitPrice: stillOpen ? "" : exitPrice,
    exitDate: stillOpen ? "" : exitDate.toISOString().slice(0, 10),
    qty,
    positionSizePercent: sizePercent,
    riskPercent,
    outcome: stillOpen ? "Open" : win ? "Win" : "Loss",
    pnlPercent: stillOpen ? "" : pnlPercent,
    notes: note,
  };
});

trades.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

const header =
  "date,symbol,setup,rsRating,relativeVolume,entryPrice,exitPrice,exitDate,qty,positionSizePercent,riskPercent,outcome,pnlPercent,notes";
const rows = trades.map((t) =>
  [
    t.date,
    t.symbol,
    t.setup,
    t.rsRating,
    t.relativeVolume,
    t.entryPrice,
    t.exitPrice,
    t.exitDate,
    t.qty,
    t.positionSizePercent,
    t.riskPercent,
    t.outcome,
    t.pnlPercent,
    // Notes may contain commas — quote the field.
    `"${t.notes.replace(/"/g, '""')}"`,
  ].join(",")
);

writeFileSync(OUT_PATH, [header, ...rows].join("\n") + "\n", "utf-8");
console.log(`Wrote ${trades.length} trade setups to ${OUT_PATH}`);
