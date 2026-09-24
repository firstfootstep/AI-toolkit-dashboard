# ต้นแบบของ Session 1 (Python)

โฟลเดอร์นี้ตั้งใจให้ **ว่างเปล่า** ตั้งแต่แรก — เป็นจุดเริ่มต้นของ Session 1 ก่อนที่จะมี
แดชบอร์ด Next.js ใดๆ แต่ละช่วงของ Session 1 จะวนตามขั้นตอนเดียวกันในโฟลเดอร์นี้:

1. เขียน `name` / `description` / สิ่งที่ต้องทำ แบบสั้นๆ สำหรับสคริปต์หนึ่งตัว (เช่น "ดึง
   หัวข้อข่าวตลาดของวันนี้สำหรับหุ้นตัวหนึ่งจาก Google News RSS แล้วพิมพ์ออกมาเป็น JSON")
2. ให้ Claude Code เขียนสคริปต์จริงออกมาเป็น `prototypes/<name>.py`
3. รันมัน — `python prototypes/<name>.py` — แล้วอ่านผลลัพธ์ที่พิมพ์ออกมาในเทอร์มินัลได้เลย
   ยังไม่ต้องมีเซิร์ฟเวอร์ เบราว์เซอร์ หรือแดชบอร์ด

จากนั้น Session 2 จะ **พอร์ต** สคริปต์ที่ใช้งานได้ไปเป็น
`dashboard/src/lib/<name>.ts` ตามรูปแบบ cache → live → mock ใน
`dashboard/src/lib/dataSource.ts` — โครงเดียวกับที่แหล่งข้อมูลอื่นๆ ในแอปนี้ใช้อยู่แล้ว
สคริปต์ Python จะใช้แล้วทิ้งได้เมื่อพอร์ตเสร็จ โดยยังเก็บไว้ที่นี่เป็นบันทึกว่า
ทำต้นแบบอะไรไปบ้าง ไม่ได้เป็นส่วนที่รันอยู่ของแอป `npm run dev` ไม่เคยเรียก
อะไรในโฟลเดอร์นี้เลย — โปรเจกต์นี้ยังคงเป็น Next.js process เดียว ไม่มี Python
subprocess ใน production (`scanner-service/` ตัวเก่าถูกลบออกด้วยเหตุผลนี้)

## ติดตั้ง

```bash
cd prototypes
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

## สคริปต์ที่วางแผนไว้ (สร้างสดในคลาส ไม่ได้เขียนไว้ล่วงหน้า)

| สคริปต์ | ช่วงใน Session 1 | แหล่งข้อมูล |
| --- | --- | --- |
| `news_feed.py` | Skill 1: Newsfeed | Google News RSS (+ Yahoo Finance RSS เป็นตัวสำรอง) |
| `price_feed.py` | Skill 2: Price feed | Yahoo Finance chart endpoint (เทียบเท่า `yfinance`) |
| `market_commentary.py` | Agent 1: Market commentary | อ่านผลลัพธ์จากสองสคริปต์ด้านบน |
| `scanner_insight.py` | Agent 2: Scanner insight | TradingView scanner API (เทียบเท่า `tvscreener`) |
| `chart_view.py` + `.png` | Skill 3: Chart | ใช้ผลลัพธ์ OHLC จาก `price_feed.py` ซ้ำ — กราฟเส้นด้วย `matplotlib` |
| `chart_view.json` + `.html` | Skill 3: Chart, เฟส 2 | ข้อมูลชุดเดียวกัน แสดงเป็นตัวอย่างกราฟแท่งเทียนด้วย `lightweight-charts` ของ TradingView (CDN, HTML แบบ standalone — ไม่ต้อง build) |
| (คำนวณในตัว) | Agent 3: Sector Rotation (RRG) | ใช้ `price_feed.py` + ฟิลด์ `sector` ของ `scanner_insight.py` ซ้ำ — agent คำนวณ RS-Ratio/RS-Momentum เองโดยตรง ไม่มีสคริปต์แยก |

Portfolio metric (skill ตัวที่ 4) **ไม่ได้** ผ่านโฟลเดอร์นี้ — เพราะไม่มีแหล่งข้อมูลภายนอกให้
ทำต้นแบบ เป็นแค่การคำนวณต่อยอดจาก `dashboard/src/fixtures/trade-setups.csv` ที่สร้างไว้แล้ว จึง
เขียนเป็น TypeScript โดยตรงใน Session 1 (ดู `.claude/skills/add-portfolio-metric/SKILL.md`)
