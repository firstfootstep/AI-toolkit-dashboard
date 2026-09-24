# InvestView Dashboard

แดชบอร์ดการลงทุนส่วนตัวที่สร้างด้วย Next.js (App Router) + TypeScript + Tailwind CSS
ใช้เป็นสื่อสาธิตในคอร์สสอนการใช้ skills/agents ของ Claude Code

คอร์สจะสร้างโปรเจกต์นี้เป็นขั้นๆ — เริ่มจาก skills และ agents ใน `.claude/` ก่อน (พร้อม
ต้นแบบ Python แบบใช้แล้วทิ้งใน `prototypes/`) จากนั้นจึงประกอบแอป Next.js ใน `dashboard/`
ขึ้นมาทีละเมนูโดยใช้สิ่งเหล่านั้น repo นี้คือผลลัพธ์ฉบับสมบูรณ์ ไว้ใช้อ้างอิง

## โครงสร้าง repo

```
AI-toolkit-dashboard/
├── .claude/skills/    ← skills (งานที่มีสูตรตายตัว) สร้างใน Session 1
├── .claude/agents/    ← agents (งานที่ต้องใช้วิจารณญาณ) สร้างใน Session 1
├── dashboard/         ← ตัวแอป Next.js — ทุกอย่างที่ `npm` รันอยู่ในนี้
└── prototypes/        ← สคริปต์ Python แบบใช้แล้วทิ้งของ Session 1
```

เปิด Claude Code ที่ **root ของ repo** (เพื่อให้มันอ่าน `.claude/` ได้) แต่ให้รันคำสั่ง `npm` /
`node` ทุกคำสั่งจากภายใน `dashboard/`

## รันบนเครื่องตัวเอง

```bash
git clone https://github.com/firstfootstep/AI-toolkit-dashboard.git
cd AI-toolkit-dashboard/dashboard
npm install
npm run dev
```

เปิด http://localhost:3000 — ระบบจะ redirect ไปที่ `/dashboard`

ไม่ต้องใช้ API key ใดๆ — ไม่ต้องรันอะไรเพิ่ม มีแค่ process เดียว port เดียว **ข้อยกเว้น:**
ปุ่มสามจุดที่เรียก Claude แบบสด (ดูด้านล่าง) — ช่อง "Research a symbol" ในหน้า Research,
ปุ่ม "สร้างสรุปตลาดวันนี้" ในหน้า Market & News และปุ่ม "วิเคราะห์พฤติกรรมการเทรด" ในหน้า
Portfolio — ทั้งหมดสั่งรัน `claude` CLI ดังนั้นจะใช้งานได้ตราบใดที่คุณล็อกอิน Claude Code
อยู่บนเครื่องนี้ — เส้นทางนี้ไม่ต้องใช้ `ANTHROPIC_API_KEY` (มีอีกเวอร์ชันหนึ่งที่ใช้ API key แยกไว้ใน
`dashboard/src/lib/researchAgent.ts` ชื่อ `generateResearchBriefViaApiKey` สำหรับเซิร์ฟเวอร์ที่ไม่มี
Claude Code ล็อกอินอยู่ — ดู `dashboard/.env.local.example` ถ้าจะสลับไปใช้) ราคาหุ้น
และข่าวใช้ public endpoint ที่ไม่ต้องใช้คีย์ และจะถอยกลับไปใช้ข้อมูล mock ที่แนบมาเสมอ
หากการเรียกเครือข่ายล้มเหลว (ดู **แหล่งข้อมูล** ด้านล่าง) แอปจึงไม่มีวันพังกลางคาบเรียน
แม้จะออฟไลน์อยู่ก็ตาม ชั้นข้อมูล TradingView ของหน้า Scanner (ดูด้านล่าง) ก็ถูกเรียกโดยตรงจาก
เซิร์ฟเวอร์ Next.js ตัวเดียวกันนี้ — เดิมเคยมี Python microservice แยกสำหรับส่วนนี้
(`scanner-service/`) แต่ถูกรวมเข้ามาไว้ใน `dashboard/src/lib/tvScreener.ts` แล้ว เพื่อให้ผู้เรียน
รันแค่ `npm run dev` อย่างเดียว

## Design system

สไตล์ภาพ (สี, ตัวอักษร, ความโค้งมุม, เงา, การเคลื่อนไหว) ใช้ token แบบ "Wiki Market / Editorial
Swiss" จาก `dashboard/DESIGN.md` ของผู้สอนร่วม — มีธีมสว่างสีงาช้างอบอุ่นธีมเดียว ไม่มี dark mode
token ทั้งหมดอยู่ใน `:root` ของ `dashboard/src/app/globals.css` และเปิดให้ใช้เป็น Tailwind utilities
ผ่าน `@theme inline` (`bg-canvas`, `text-ink`, `bg-primary`, `text-primary-bright`, `bg-lime`,
`bg-coral`, `border-line`, `rounded-sm/md/lg`, `shadow-sm/md`) ห้าม hardcode สี ความโค้งมุม
หรือเงาใหม่ใน component — ให้เพิ่ม token แทน

## แผนผังโฟลเดอร์

เมนูใน sidebar แต่ละรายการมี route ของตัวเองหนึ่ง route และถ้ามี logic จริง ก็จะมีโฟลเดอร์ feature หนึ่งโฟลเดอร์
กฎสามข้อที่ควรจำไว้:

- `dashboard/src/features/<name>/` — components, ตัวช่วยจัดการข้อมูล และ types ของ feature หนึ่งๆ อยู่ด้วยกัน
- `dashboard/src/components/ui/` — มีเฉพาะ primitive ที่ใช้ซ้ำได้และไม่มี logic (Card, Badge, Stat, Sparkline…) ห้ามมี logic ของ feature
- `dashboard/src/components/layout/` — โครงของแอป (Sidebar, Topbar, `ComingSoon` — หน้าว่างสำรองสำหรับเมนูที่สร้างโครงไว้แต่ยังไม่ได้ทำ ตอนนี้ทุกหน้าทำเสร็จแล้ว หน้า Research ใช้มันแสดงตอนยังไม่มีบทวิเคราะห์)

รายการเมนูใน sidebar กำหนดไว้ที่ `dashboard/src/components/layout/nav-items.ts`

| เมนูใน sidebar | Route | โฟลเดอร์ feature | สถานะ |
| --- | --- | --- | --- |
| Dashboard | `dashboard/src/app/(dashboard)/dashboard/` | ใช้ feature portfolio + markets + watchlist + news | เสร็จแล้ว |
| Market & News | `dashboard/src/app/(dashboard)/markets/` | `dashboard/src/features/markets/`, `dashboard/src/features/news/` | เสร็จแล้ว (รวม Markets + News เป็นหน้าเดียว; ราคาสด/ไม่ใช้คีย์ + RSS + ปฏิทินเศรษฐกิจผลกระทบสูงแบบไม่เป็นทางการ — ดูด้านล่าง) `/news` จะ redirect มาที่นี่ |
| Watchlist | `dashboard/src/app/(dashboard)/watchlist/` | `dashboard/src/features/watchlist/` | เสร็จแล้ว (ราคาสด/ไม่ใช้คีย์; แต่ละแถวลิงก์ไปหน้า Chart) |
| Scanner | `dashboard/src/app/(dashboard)/scanner/` | `dashboard/src/features/scanner/` | เสร็จแล้ว (เลือกตลาดได้; โหลดข้อมูลทั้งตลาดล่วงหน้าฝั่งเซิร์ฟเวอร์ กรอง/เรียงฝั่ง client) |
| Legend Scanner | `dashboard/src/app/(dashboard)/legend-scanner/` | `dashboard/src/features/legend-scanner/`, `dashboard/src/lib/legendScanner.ts` | เสร็จแล้ว (เมนูโบนัสนอกแผน 9 เมนูเดิม — สแกนหุ้นตามสูตรของ O'Neil/Lynch/Buffett/Minervini ด้วยสูตรคะแนนตายตัวบนข้อมูล TradingView ไม่เรียก Claude) |
| Chart | `dashboard/src/app/(dashboard)/chart/` | `dashboard/src/features/markets/CandlestickChart.tsx`, `SymbolSwitcher.tsx` | เสร็จแล้ว (`?symbol=&exchange=` — กราฟแท่งเทียน OHLC ด้วย `lightweight-charts` + ข่าวของหุ้นตัวนั้น) |
| Sector Rotation | `dashboard/src/app/(dashboard)/sector-rotation/` | `dashboard/src/features/sector-rotation/`, `dashboard/src/lib/rrg.ts` | เสร็จแล้ว (RRG แบบ RS-Ratio/RS-Momentum จริงของ sector SPDR ETF ทั้ง 11 ตัวเทียบกับ SPY จาก OHLC สด) |
| Research | `dashboard/src/app/(dashboard)/research/` | `dashboard/src/features/research/` | เสร็จแล้ว (แสดงผล `dashboard/research-briefs/`; ฟอร์มในหน้าเรียก Claude ให้สร้างบทวิเคราะห์เป็นภาษาไทย — ดูด้านล่าง) |
| Portfolio | `dashboard/src/app/(dashboard)/portfolio/` | `dashboard/src/features/portfolio/` | เสร็จแล้ว (ข้อมูล mock + นำเข้า trading journal + ปุ่ม Trading Coach ที่เรียก Claude — ดูด้านล่าง) |
| Settings | `dashboard/src/app/(dashboard)/settings/` | `dashboard/src/features/settings/` | เสร็จแล้ว (เก็บในเครื่องเท่านั้น) |

โฟลเดอร์ระดับบนอื่นๆ:

- `dashboard/src/fixtures/` — ชุดข้อมูล mock ทั้งหมด (`trade-setups.csv`, `quotes.json`, `news.json`,
  `watchlist.json`, `economic-calendar.json`) อ่านไฟล์เหล่านี้ก่อนเพื่อดูว่าข้อมูล "ปลอม"
  มีหน้าตาอย่างไร
- `dashboard/src/lib/` — logic ที่ใช้ร่วมกันและไม่ผูกกับ framework: `dataSource.ts` (รูปแบบ
  fallback/cache), `quotes.ts` / `news.ts` (ชั้นข้อมูล Yahoo แบบไม่ใช้คีย์), `tvScreener.ts` (ชั้นข้อมูล
  TradingView scanner เรียกโดยตรง — ไม่มี service แยก), `economicCalendar.ts`
  (ชั้นข้อมูลปฏิทิน Forex Factory แบบไม่เป็นทางการ — ดูด้านล่าง), `ohlc.ts` (ลำดับ fallback
  ของกราฟแท่งเทียน), `format.ts`, `legendScanner.ts` (สูตรคะแนนของ Legend Scanner),
  `claudeCli.ts` + `researchAgent.ts` / `marketCommentaryAgent.ts` / `tradingCoachAgent.ts`
  (การเรียก Claude แบบสด — ดูด้านล่าง)
- `dashboard/src/app/api/` — Route Handler แบบบางๆ (`/api/quotes`, `/api/news`) ที่ห่อฟังก์ชันใน `lib/`
  ไว้ เพื่อสอนเรื่อง Route Handler แยกจาก server component ที่เรียกฟังก์ชันเดียวกัน
  โดยตรง ส่วน route ที่ไม่ใช่แค่ตัวห่อบางๆ คือ `/api/research`, `/api/market-summary`,
  `/api/trading-coach` (เรียก Claude — ดู "Research: การเรียก Claude แบบสด" ด้านล่าง) และ
  `/api/legend-scanner` (รันสูตรคะแนนบนผลสแกน TradingView สดๆ ไม่เรียก Claude)
- `dashboard/public/templates/trading-journal-template.xlsx` — เทมเพลตให้ดาวน์โหลดสำหรับ
  การนำเข้า journal ในหน้า Portfolio (สร้างใหม่ได้ด้วย `node scripts/generate-template.mjs` จากภายใน `dashboard/`)
- `.claude/skills/`, `.claude/agents/` — นิยาม skill/agent ของ Claude Code สำหรับต่อยอด
  โปรเจกต์นี้ระหว่างคอร์ส (ดูด้านล่าง)

## แหล่งข้อมูล (รูปแบบ "never break live")

การเรียกภายนอกทุกครั้งในแอปนี้ใช้โครงเดียวกัน ซึ่งเขียนไว้ครั้งเดียวใน
`dashboard/src/lib/dataSource.ts` และนำไปใช้ซ้ำใน `dashboard/src/lib/quotes.ts` และ `dashboard/src/lib/news.ts`:

1. ตรวจ cache ในหน่วยความจำอายุสั้น (60 วินาทีสำหรับราคา, 5 นาทีสำหรับข่าว) เพื่อไม่ให้การโหลดหน้าซ้ำๆ
   ระหว่างคาบเรียนไปกระหน่ำแหล่งข้อมูลต้นทาง
2. ลองเรียกแหล่งข้อมูลสดที่ **ไม่ต้องใช้คีย์** โดยกำหนด timeout ตายตัว:
   - ราคา: public chart endpoint ของ Yahoo Finance (`query1.finance.yahoo.com`)
   - ข่าว: public RSS feed ของ Yahoo Finance (`finance.yahoo.com/news/rssindex`)
3. หากล้มเหลว **ด้วยเหตุใดก็ตาม** (network error, timeout, รูปแบบข้อมูลผิดคาด, โดน rate limit) จะถอยกลับไปใช้
   fixture ที่ตรงกันใน `dashboard/src/fixtures/` แทนการ throw error

ทุกหน้า/ทุก API response มี flag `source: "live" | "mock"` ซึ่งแสดงใน UI เป็น
badge เล็กๆ (`dashboard/src/components/ui/DataSourceBadge.tsx`) — ผู้เรียนจึงเห็นเสมอว่าตอนนี้อยู่ในโหมดไหน
แทนที่จะเจอหน้าพัง

ข้อมูลการถือครองในพอร์ต **ใช้ mock เท่านั้นโดยตั้งใจ** (นี่คือเดโมส่วนตัว ไม่ใช่การเชื่อมต่อกับโบรกเกอร์)
— คำนวณจาก `dashboard/src/fixtures/trade-setups.csv` (trading journal หลักชุดเดียวที่ตัวเลขทุกตัว
ในหน้า Portfolio/Dashboard คำนวณมาจาก ผ่าน `getTradingJournalStats()` ใน
`dashboard/src/lib/tradingJournal.ts`) หรือจาก trading journal ที่ผู้เรียนนำเข้าเอง (ดูด้านล่าง)

### ชั้นข้อมูล TradingView (Scanner)

Scanner เพิ่มชั้นข้อมูลอีกชั้น **เหนือ** ชั้น Yahoo แบบไม่ใช้คีย์: `dashboard/src/lib/tvScreener.ts` จะ POST
ไปที่ `scanner.tradingview.com` โดยตรง เลียนแบบ request ที่เว็บไซต์ของ TradingView เอง
ส่งภายใน (รูปแบบ request เดียวกับแพ็กเกจ Python `tradingview-screener` ที่พอร์ตมา
เป็นการเรียก `fetch`) **นี่ไม่ใช่ API สาธารณะที่ TradingView มีเอกสารรองรับ** — อาจเปลี่ยนแปลง
หรือโดน rate limit/บล็อกได้โดยไม่แจ้งล่วงหน้า และการใช้งานแบบนี้ไม่ได้อยู่ภายใต้ ToS
ที่เผยแพร่ใดๆ นี่เป็นการแลกเปลี่ยนที่ตั้งใจและรู้ตัวสำหรับสื่อการสอนนี้ (ได้ข้อมูลที่
ละเอียดกว่า ครอบคลุมหลายตลาดจริง) ไม่ใช่การมองข้าม — แต่ควรระบุไว้ถ้านำรูปแบบนี้ไปใช้
ที่อื่น ลำดับ fallback คือ:

1. **TradingView** (ไม่เป็นทางการ, `tvScreener.ts`) — ฟิลด์ละเอียดกว่า (market cap, การจัดกลุ่ม sector
   จริง) รองรับหลายตลาด (`SCANNER_MARKETS` ใน `dashboard/src/features/scanner/types.ts`)
2. **Yahoo Finance** (ไม่ใช้คีย์) — เฉพาะตลาดสหรัฐฯ สำหรับ Scanner
3. **Mock fixture** — ทางเลือกสุดท้าย ใช้ได้เสมอ

กราฟแท่งเทียนของหน้า Chart ง่ายกว่า: chart endpoint ของ Yahoo Finance คืนค่า OHLC
ครบอยู่แล้ว (ไม่ใช่แค่ราคาปิด) จึงเป็นชั้นข้อมูลสดเพียงชั้นเดียว พร้อม fallback ไปที่ mock fixture
แบบเดียวกัน (`dashboard/src/lib/ohlc.ts`)

### ชั้นข้อมูลปฏิทินเศรษฐกิจ (Market & News)

`dashboard/src/lib/economicCalendar.ts` เรียก `nfs.faireconomy.media/ff_calendar_thisweek.json` ซึ่งเป็น
JSON mirror แบบไม่เป็นทางการของปฏิทิน Forex Factory — มีข้อควรระวังเดียวกับชั้น TradingView
ด้านบน: ไม่ใช่ API สาธารณะที่มีเอกสาร ไม่มี rate limit ที่ประกาศไว้ อาจเปลี่ยนรูปแบบหรือโดน
บล็อกได้โดยไม่แจ้งล่วงหน้า (บรรเทาด้วย cache 30 นาทีแทนที่จะเป็นไม่กี่นาทีตามปกติ)
นอกจากนี้มันคืนค่ามาแค่ `forecast`/`previous` ไม่เคยมี `actual` — ฟิลด์นั้นถูก
render ฝั่ง client บนหน้า forexfactory.com จริง ไม่มีอยู่ในไฟล์ export แบบ static นี้
— ดังนั้นคอลัมน์ Actual ของแถวข้อมูลสดมักจะเป็น "—" ค่า `actual` ใน fixture ที่แนบมาเป็น
ข้อมูลเดโมเพื่อแสดงให้เห็นว่าการเทียบ forecast กับ actual หน้าตาเป็นอย่างไร ไม่ใช่ตัวเลข
ประกาศจริงในอดีต ทั้งตัวกรองข้อมูลสดและการจัดกลุ่ม "วันนี้"/"เมื่อวาน" ใน UI ใช้ขอบเขตวัน
`Asia/Bangkok` เดียวกัน (`CALENDAR_TIMEZONE` ใน `economicCalendar.ts`) จึงไม่มีวัน
ขัดแย้งกันว่าเหตุการณ์หนึ่งควรอยู่คอลัมน์ไหน

ทุก response ยังคงมี `source: "tradingview" | "live" | "mock"`
(`DataSourceStatus` ใน `dashboard/src/types/market.ts`) แสดงผ่าน `DataSourceBadge` ตัวเดียวกัน — จึง
เห็นได้เสมอว่าหน้าไหนได้ข้อมูลจากชั้นใด ไม่มีการสลับแบบเงียบๆ

### Research: การเรียก Claude แบบสด

แหล่งข้อมูลทั้งหมดด้านบนไม่ใช้คีย์และทำงานตามลำดับ cache → live → mock ส่วนช่อง
"Research a symbol" ในหน้า Research เป็นข้อยกเว้นที่ตั้งใจ: มันไม่ใช่การดึงข้อมูลตลาด แต่เป็น
การเรียก Claude เองตามต้องการ ผ่าน `POST /api/research`

ปุ่มอีกสองจุดทำงานแบบเดียวกัน (สั่งรัน `claude` CLI ผ่าน `dashboard/src/lib/claudeCli.ts` และใช้โควตา
Claude Code ของคุณทุกครั้งที่กด): **"สร้างสรุปตลาดวันนี้"** ในหน้า Market & News
(`POST /api/market-summary`, `marketCommentaryAgent.ts`) และ **"วิเคราะห์พฤติกรรมการเทรด"**
ในหน้า Portfolio (`POST /api/trading-coach`, `tradingCoachAgent.ts` — ไม่ให้ tool ใดๆ แก่ Claude)
ส่วนรายละเอียดด้านล่างอธิบายโดยใช้ Research เป็นตัวอย่าง

`dashboard/src/lib/researchAgent.ts` export ไว้สองเวอร์ชัน:

- **`generateResearchBrief` (ค่าเริ่มต้น, route ใช้ตัวนี้)** — สั่งรัน `claude` CLI
  ในโหมด headless print (`-p --output-format json`) ยืนยันตัวตนด้วย Claude Code
  ที่ล็อกอินอยู่บนเครื่องนี้ ไม่ต้องใช้ `ANTHROPIC_API_KEY` แต่จะใช้โควตา/rate limit ของ
  Claude Code ส่วนตัวของคุณ และช้ากว่าการเรียก API โดยตรงอย่างเห็นได้ชัด (~20-30 วินาทีขึ้นไปต่อครั้ง
  วัดจากการใช้งานจริง — CLI โหลด context ของโปรเจกต์นี้ใหม่ทุกครั้งที่ถูกเรียก)
  บน Windows จะหา `claude.exe` ตัวจริงที่ shim `.cmd` ของ npm ห่อไว้ เพราะ
  `execFile` เปิดไฟล์ `.cmd` โดยตรงไม่ได้ และการเรียกผ่าน shell ก็ escape
  `--system-prompt` หลายบรรทัดได้ไม่ปลอดภัย ใช้ได้ดีสำหรับเดโมคนเดียว; ควรสลับไปใช้ฟังก์ชันด้านล่าง
  ก่อนนำไปให้บริการผู้ใช้จริงพร้อมกันหลายคน
- **`generateResearchBriefViaApiKey`** — เวอร์ชันดั้งเดิมที่ใช้ Anthropic
  SDK (`claude-sonnet-5`, effort ระดับกลาง, ใช้ tool `web_search` แบบ hosted) ต้องใช้
  `ANTHROPIC_API_KEY` (คัดลอก `dashboard/.env.local.example` ไปเป็น `dashboard/.env.local` แล้วรีสตาร์ท `npm run dev`) และ
  คิดเงินตามจำนวน token จากเครดิตใน API console — เป็นบัญชี/ยอดเงินแยกจากการสมัครสมาชิก
  Claude.ai/Claude Code ใดๆ แต่คิดตามการใช้งานจริงล้วนๆ (ไม่มีค่าแพลตฟอร์มนอกจาก
  ค่า token) ใช้ตัวนี้เมื่อแอปไปรันที่อื่นซึ่งไม่มี Claude Code ล็อกอินอยู่

ไม่ว่าจะใช้แบบไหน หากการเรียกล้มเหลว ช่องนี้จะแสดง error ธรรมดา และส่วนอื่นของแอป
ไม่ได้รับผลกระทบ

หมายเหตุด้านการออกแบบ สำหรับผู้ที่จะนำรูปแบบนี้ไปต่อยอดที่ส่วนอื่นของแอป:

- **บทวิเคราะห์เขียนเป็นภาษาไทย** (`SYSTEM_PROMPT` สั่งไว้อย่างชัดเจน) — ชื่อหุ้น
  ตัวเลข วันที่ และ URL แหล่งที่มา คงไว้ตามรูปแบบเดิม
- **ไม่ให้ tool ด้าน filesystem/bash แก่ Claude** ในเส้นทาง API key (เส้นทาง CLI
  จำกัดไว้ที่ `--allowedTools WebSearch` ด้วยเจตนาเดียวกัน) เนื่องจากส่วนนี้ทำงานจากการส่ง
  ฟอร์มสาธารณะ API route จึงจัดการ file I/O ทั้งหมดเอง (`writeResearchBrief` ใน
  `dashboard/src/features/research/data.ts`) หลังจากได้ข้อความ markdown ธรรมดากลับมา
- **สัญญาผลลัพธ์เดียวกับ `earnings-preview-agent`** (`.claude/agents/` มาแทนที่
  `symbol-research-agent` ตัวเก่า — ยังเก็บไว้ใน repo แต่ไม่ได้ใช้สาธิตแล้ว): ทั้งสอง
  สร้างบทวิเคราะห์ markdown ที่แบ่งส่วนด้วย `## ` — ปัจจุบันรองรับตาราง GFM และ
  fence ` ```chart:bar/line ` ขนาดเล็ก ซึ่งถูก parse/render โดย `dashboard/src/features/research/markdown.tsx` —
  หน้า Research จึงแสดงผลจากทั้งสองเส้นทางได้เหมือนกัน agent ของ Claude Code ได้ใช้ Bash/
  `yfinance` เพื่อดึงประวัติผลประกอบการเทียบคาดการณ์ การเทียบกับคู่แข่ง และปฏิกิริยาราคาวันถัดไปจริง
  พร้อมค้นคว้าบนเว็บแบบเปิดกว้าง (ดูแผนการสอนของ Session 1) ส่วน route นี้ดึง
  ตัวเลข EPS จริงชุดเดียวกันไว้ล่วงหน้าเอง (`dashboard/src/lib/earnings.ts`) แล้วส่งให้ Claude เป็น context
  เพราะฟอร์มสาธารณะได้ใช้แค่ `WebSearch` — แนวคิดเดียวกันแต่ย่อลงเหลือการเรียกครั้งเดียว โดยไม่มี
  การรัน tool บนเครื่อง

### อัปเกรดไปใช้ผู้ให้บริการที่ต้องใช้คีย์

endpoint ของ Yahoo ไม่เป็นทางการและอาจเปลี่ยนรูปแบบได้โดยไม่แจ้งล่วงหน้า หากต้องการเปลี่ยน
ไปใช้ API ที่เข้มงวดกว่าและมีเอกสารรองรับ (เช่น Alpha Vantage) ให้แทนที่ฟังก์ชัน `fetchLiveQuote` /
`fetchLiveNews` ใน `dashboard/src/lib/quotes.ts` / `dashboard/src/lib/news.ts` — ตัวห่อ cache/fallback
(`withFallback`) ไม่ต้องแก้

## นำเข้า trading journal ของคุณเอง

ในหน้า Portfolio คลิก **Download template** เพื่อดาวน์โหลดไฟล์ `.xlsx` เริ่มต้น หรือใช้ไฟล์
`.xlsx` / `.csv` ของคุณเองที่มีคอลัมน์ดังนี้: `date, symbol, side, quantity, price, fees, notes`

การแปลงไฟล์ทำในเบราว์เซอร์ทั้งหมด (`dashboard/src/features/portfolio/parseTradingJournal.ts`
ใช้ `exceljs`) — ไม่มีการอัปโหลดไปที่ใดเลย แถวที่ผิดจะถูกรายงานเป็นรายแถว
("row 14: date unparseable") แทนที่จะทำให้ทั้งไฟล์ล้มเหลว แถวที่ถูกต้องจะเก็บไว้ใน
`localStorage` ภายใต้คีย์ `investview.tradingJournal`

## Skills & agents ของ Claude Code

repo นี้มีนิยาม `.claude/skills/` และ `.claude/agents/` ของจริง ไว้สำหรับ
สาธิตสดในคอร์ส

**Skills** (งานที่มีสูตรตายตัว):

- `add-news-feed` — ต้นแบบ Python ดึงหัวข้อข่าว (Google News RSS + Yahoo สำรอง) แล้วพอร์ตเป็น `dashboard/src/lib/news.ts`
- `add-price-feed` — ต้นแบบ Python ดึง OHLC จาก Yahoo Finance แล้วพอร์ตเป็น TypeScript
- `add-chart-view` — กราฟเส้นด้วย Python แล้วต่อยอดเป็นกราฟแท่งเทียนด้วย `lightweight-charts`
- `add-portfolio-metric` — ตัวชี้วัดพอร์ต (% การจัดสรร, กำไร/ขาดทุน) จาก `trade-setups.csv`
- `add-dashboard-page` — สร้างโครงหน้าใหม่ใน sidebar (route + รายการเมนู) ตามข้อกำหนดของโปรเจกต์นี้
- `add-dashboard-widget` — สร้างวิดเจ็ต `Card` ใหม่ภายในหน้าที่มีอยู่แล้ว ตามการแบ่ง `ui/` กับ `features/`
- `earnings-preview-th` — สร้างสรุปก่อน/หลังประกาศผลประกอบการเป็นภาษาไทย แล้วเผยแพร่เป็น Artifact

**Agents** (งานที่ต้องใช้วิจารณญาณ):

- `data-source-auditor` — agent สำหรับ **รีวิว**: ตรวจการเชื่อมต่อ API ภายนอกใหม่ๆ ว่าเป็นไปตามรูปแบบ
  "never break live" ที่อธิบายไว้ด้านบนหรือไม่ (คีย์อยู่ฝั่งเซิร์ฟเวอร์, มีการแคช, มี fixture สำรอง)
  มันไม่เขียนโค้ดเลย รายงานผลที่พบเท่านั้น
- `earnings-preview-agent` — agent แบบ **generative**: เมื่อได้รับชื่อหุ้น มันจะดึงตัวเลขจริงผ่าน
  `yfinance` (ค่าคาดการณ์ consensus, ประวัติผลประกอบการเทียบคาด, ปฏิกิริยาราคาหุ้นวันถัดไป,
  มุมมองนักวิเคราะห์, มูลค่าเทียบคู่แข่ง) บวกการค้นคว้าเว็บแบบสด (guidance, รายละเอียดกลุ่มธุรกิจ,
  ระบบนิเวศซัพพลายเออร์/ลูกค้า) แล้วเขียนบทวิเคราะห์ภาษาไทยลง `dashboard/research-briefs/` พร้อม
  การใช้วิจารณญาณที่สูตรตายตัวทำไม่ได้ (ควรเชื่อข้อมูลที่มีน้อยแค่ไหน, ตัวเลข guidance สองตัว
  ถูกนำมาปนกันหรือไม่) ตั้งใจให้รันสดเพื่อให้ผู้เรียนเห็นการใช้ tool หลายขั้นตอนแบบอัตโนมัติ
- `symbol-research-agent` — เวอร์ชันเก่าของ `earnings-preview-agent` (สัญญาผลลัพธ์เดียวกัน
  แต่แคบกว่า ค้นเว็บอย่างเดียว) ยังเก็บไว้ใน repo แต่ไม่ได้ใช้สาธิตแล้ว
- `market-commentary-agent` — ค้นข่าวเมื่อคืนผสมกับราคาวันนี้ แล้วเขียนสรุปตลาด
- `scanner-insight-agent` — อ่านผล TradingView scanner แล้วคัดหุ้นที่น่าสนใจ 5 ตัวพร้อมเหตุผล
- `sector-rotation-agent` — คำนวณ RS-Ratio/RS-Momentum ของแต่ละกลุ่มอุตสาหกรรมแล้วอธิบายการหมุนเวียน
- `legend-scanner-agent` — สแกนหุ้นตามสูตรของนักลงทุนระดับตำนาน พร้อมอธิบายว่าทำไมเข้าทาง/ไม่เข้าทาง
- `trading-coach-agent` — วิเคราะห์พฤติกรรมการเทรดจาก `trade-setups.csv` พร้อมคำแนะนำที่ทำได้ทันที

**Skill กับ agent ต่างกันอย่างไร แบบสั้นๆ:** skill เหมาะเมื่อมีสูตรตายตัวเพียงสูตรเดียว
ที่ต้องทำตามทุกครั้ง (เพิ่มหน้า, เพิ่มวิดเจ็ต, พอร์ตฟีดข้อมูล) ส่วน agent เหมาะเมื่องานต้องใช้วิจารณญาณ
ว่าจะดำเนินการ *อย่างไร* ไม่ใช่แค่เติมเทมเพลต (ข่าวที่มีน้อยเชื่อถือได้แค่ไหน, การเชื่อมต่อข้อมูล
ผ่านเช็กลิสต์จริงหรือไม่, ข่าวไหนสำคัญพอจะพูดถึง)

หน้า Research เชื่อมกับผลลัพธ์ของ `earnings-preview-agent`
ไว้แล้ว (`dashboard/src/features/research/`) — แค่รัน agent กับหุ้นสักตัวก็จะเห็นบทวิเคราะห์จริง
ปรากฏบนหน้า ไม่ต้องเชื่อมอะไรเพิ่ม
