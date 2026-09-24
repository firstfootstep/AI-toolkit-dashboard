# Wiki Market / Editorial Swiss — ระบบดีไซน์ (Design System)

ภาษาภาพของ InvestView Dashboard ธีมเดียว โทนสีขาวนวลอุ่นๆ (warm-ivory) ไม่มีโหมดมืด (dark mode)
ทุก token ด้านล่างนี้มีอยู่จริงแล้วใน `src/app/globals.css` — **ห้ามกำหนดสี, radius, shadow, หรือ
font ขึ้นมาใหม่เองในแต่ละ component เด็ดขาด ให้ต่อยอดจาก token พวกนี้แทน**

## หลักการ (Principles)

- **Editorial ไม่ใช่ "SaaS สีฟ้า"** พื้นหลังสีกระดาษอุ่นๆ, สีเขียวเข้มเป็นสีหลัก, สีเขียวมะนาว
  (lime) ใช้เป็น accent จุดเดียวเน้นย้ำแบบประหยัด (เมนูที่ active, จุดที่เลือกไว้)
- **ธีมเดียว** ไม่มีปุ่มสลับ dark mode — คงคอนทราสต์และอารมณ์ของภาพให้เหมือนกันทุกหน้า
- **การเคลื่อนไหวที่สงบนิ่ง** transition สั้นและ ease นุ่มนวล (เงาตอน hover, สีเมนู) — ห้ามหวือหวา
  ต้องเคารพ `prefers-reduced-motion` ของผู้ใช้ด้วย
- **ความซื่อสัตย์ของข้อมูล (Data honesty)** ทุก widget ที่อ่านข้อมูลจากภายนอกต้องมีป้ายเล็กๆ บอกว่า
  ข้อมูลนี้เป็น live, mock, หรือมาจากแหล่งที่ไม่เป็นทางการ (`DataSourceBadge`) — ห้ามให้หน้าดูเหมือนมี
  ข้อมูล live ทั้งที่จริงๆ กำลังโชว์ข้อมูลสำรอง (fallback) อยู่

## Token สี (Color tokens)

กำหนดไว้ใน `:root` ของไฟล์ `src/app/globals.css` แล้วแปลงเป็น Tailwind utility ผ่าน
`@theme inline` (เช่น `bg-canvas`, `text-ink`, `bg-primary`, `border-line`)

| Token | ค่า | Tailwind utility | ใช้ตอนไหน |
| --- | --- | --- | --- |
| `--color-canvas` | `#f4f2eb` | `bg-canvas` | พื้นหลังของหน้า (สีขาวนวลอุ่นๆ) |
| `--color-paper` | `#fffefa` | `bg-paper` | พื้นหลังของ Card / พื้นผิว |
| `--color-ink` | `#17231e` | `text-ink` | ข้อความหลัก |
| `--color-ink-soft` | `#3a453f` | `text-ink-soft` | ข้อความรอง นุ่มกว่า ink เล็กน้อย |
| `--color-muted` | `#66736c` | `text-muted` | label, คำอธิบายสั้นๆ, placeholder |
| `--color-primary` | `#12382b` | `bg-primary` / `text-primary` | เขียวเข้ม — พื้นหลัง sidebar, ปุ่ม/แอ็กชันหลัก |
| `--color-primary-bright` | `#1d7252` | `text-primary-bright` | ค่าที่เป็นบวก/ขึ้น, ป้าย live-data |
| `--color-lime` | `#d9e99d` | `bg-lime` | สี accent — เมนูที่ active, จุดที่เลือกไว้, โลโก้ |
| `--color-coral` | `#d86d4d` | `text-coral` | ค่าที่เป็นลบ/ลง, คำเตือน, focus ring |
| `--color-line` | `rgba(26,54,42,0.13)` | `border-line` | เส้นขอบบางๆ ที่ใช้ทั่วทั้งแอป |

**กฎจับคู่ความหมาย (Semantic pairing rule):** เขียว (`primary-bright`) = ขึ้น / บวก / live
ส้มแดง (coral) = ลง / ลบ / ข้อมูลสำรอง (mock-fallback) / คำเตือน เขียวมะนาว (lime) = ใช้เป็น
accent/active เท่านั้น **ห้าม**ใช้แทนความหมายสถานะ (status color) เด็ดขาด

## ตัวอักษร (Typography)

ใช้ font 2 ตระกูล โหลดผ่าน `next/font/google` ในไฟล์ `src/app/layout.tsx`:

- **Inter** (`--font-inter`) — ใช้กับ UI ภาษาอังกฤษ (เมนู, ปุ่ม, label, ตัวเลขสถิติ)
- **Anuphan** (`--font-anuphan`) — ใช้กับเนื้อหาภาษาไทย + อังกฤษทั่วไป และเป็น `font-sans`
  ค่าเริ่มต้นของทั้งแอปด้วย

```
--font-ui:   var(--font-inter), var(--font-anuphan), system-ui, sans-serif;
--font-body: var(--font-anuphan), system-ui, sans-serif;
```

- ใช้ `font-[family-name:var(--font-ui)]` กับหัวข้อ, label เมนู, ตัวเลขสถิติ, ป้ายต่างๆ —
  อะไรก็ตามที่สั้นและมีลักษณะเป็น "กรอบ UI" (UI chrome)
- เนื้อหาปกติ (พารากราฟ, เซลล์ในตาราง, คำอธิบาย) ใช้ font เริ่มต้นของ body อยู่แล้ว —
  ไม่ต้องใส่ class เพิ่ม
- น้ำหนักตัวอักษรที่ใช้จริงในแอป: `font-medium` (เมนู, label), `font-semibold` (หัวข้อ,
  ตัวเลขสถิติ, ชื่อ card) — ไม่มีตัวหนากว่านี้อีกแล้ว
- ขนาดตัวอักษรที่ใช้จริง: `text-xs` (label, ป้าย), `text-sm` (เนื้อหาทั่วไป, เมนู),
  `text-xl` (ชื่อหน้าใน `Topbar`), `text-2xl` (ตัวเลขสถิติตัวใหญ่)

## Radius, shadow, motion

```css
--radius-sm: 10px;   /* เมนู, chip เล็กๆ, กล่องไอคอน */
--radius-md: 16px;   /* Card, EmptyState — radius มาตรฐานของพื้นผิว */
--radius-lg: 24px;   /* สำรองไว้สำหรับบล็อกใหญ่พิเศษ (hero/feature) */

--shadow-sm: 0 1px 2px rgba(23,35,30,.06), 0 1px 1px rgba(23,35,30,.04);   /* การ์ดตอนปกติ */
--shadow-md: 0 12px 24px rgba(23,35,30,.1), 0 4px 8px rgba(23,35,30,.06); /* การ์ดตอน hover */

--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

ใช้แบบ `rounded-[var(--radius-md)]`, `shadow-[var(--shadow-sm)]` ฯลฯ — เป็น Tailwind
arbitrary-value syntax ที่ชี้ไปยัง token ไม่ใช่ใส่ค่าตายตัวเอง

Transition มาตรฐานตอนโต้ตอบ: `transition-shadow duration-200` (การ์ดตอน hover),
`transition-colors duration-200` (เมนู hover/active)

## โครงหน้า (Layout shell)

- **Sidebar** (`src/components/layout/Sidebar.tsx`): กว้างคงที่ `w-60` สูงเต็มจอ,
  `bg-primary`, `p-4` โลโก้เป็นกล่องสี่เหลี่ยม 8×8 สีเขียวมะนาว มุมมน
  `rounded-[var(--radius-sm)]` มีไอคอนจาก Lucide อยู่ข้างใน รายการเมนู:
  `rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium`; สถานะ active คือ
  `bg-lime text-primary`, สถานะปกติคือ `text-paper/70` มี hover เป็น
  `hover:bg-paper/10 hover:text-paper`
- **Topbar** (`src/components/layout/Topbar.tsx`): `border-b border-line bg-paper px-8
  py-5`, ชื่อหน้าใช้ `text-xl font-semibold` ด้วย font UI มีช่องว่าง `action` ทางขวา
  (ใส่ปุ่มหรือของอื่นได้) เป็นตัวเลือก
- **ตัวหน้า (Page body)**: `<main className="flex-1 space-y-6 overflow-y-auto p-8">` —
  padding รอบหน้า 8 หน่วย, ระยะห่างระหว่างการ์ด 6 หน่วย (`space-y-6` / `gap-6`)
- **Grid**: การ์ดจัดวางด้วย `grid grid-cols-1 gap-6 lg:grid-cols-{2,3}` — เรียงซ้อนกันบนมือถือ
  แยกคอลัมน์ตอนหน้าจอกว้างระดับ `lg` แถวสถิติในการ์ดใช้ `grid grid-cols-2 gap-6
  sm:grid-cols-3 lg:grid-cols-5`

## Component หลัก (`src/components/ui/`)

เป็น primitive ที่ "โง่" (dumb) ใช้ซ้ำได้เท่านั้น — ไม่มี logic เฉพาะฟีเจอร์อยู่ในนี้เลย
(ของแบบนั้นอยู่ที่ `src/features/<name>/`)

- **`Card`** — พื้นผิวพื้นฐาน: `rounded-[var(--radius-md)] border border-line bg-paper
  p-5 shadow-[var(--shadow-sm)]`, hover แล้วเปลี่ยนเป็น `shadow-md` มี `title` (แสดงเป็น
  หัวข้อ `text-sm font-semibold` ด้วย font UI) และ `action` (ช่องทางขวา ปกติใส่
  `DataSourceBadge`) เป็นตัวเลือก อยู่แถวบนสุดเหนือ `children`
- **`Badge`** — `rounded-full px-2.5 py-0.5 text-xs font-medium` มี 5 โทนสี:
  `green` (primary-bright ความเข้ม 12%), `amber`/`red` (coral ความเข้ม 14%),
  `neutral` (ink ความเข้ม 6%, ข้อความสี muted), `blue` (lime ความเข้ม 50%,
  ข้อความสี primary) — เลือกโทนตามความหมาย ไม่ใช่ตาม "สีไหนดูสวยกว่า"
- **`DataSourceBadge`** — ห่อ `Badge` อีกชั้นหนึ่ง แปลง `DataSourceStatus`
  ("live" | "mock" | "tradingview") เป็นโทนสี+ข้อความที่ถูกต้อง ใช้ตัวนี้แทน `Badge` ตรงๆ
  ทุกครั้งที่ widget แสดงข้อมูลจากภายนอก
- **`Stat`** — label (`text-xs text-muted`) + ค่าตัวเลข (`text-2xl font-semibold`,
  font UI) + บรรทัดค่าเปลี่ยนแปลง (delta) แสดงสีตาม `tone` (`up` → primary-bright,
  `down` → coral, `neutral` → muted) เป็นตัวเลือก + `Sparkline` เป็นตัวเลือก
- **`EmptyState`** — กล่องเปล่าขอบเส้นประ (`border-dashed border-line`) มีไอคอน/หัวข้อ/
  คำอธิบาย/ปุ่มอยู่กึ่งกลาง, `py-16` เผื่อพื้นที่เยอะๆ ใช้กับสถานะ "ยังไม่มีอะไรตรงนี้"
  (เช่น `ComingSoon`) ไม่ใช่ใช้กับสถานะกำลังโหลด (loading)
- **`Sparkline`** — เส้นแนวโน้มเล็กๆ แบบ inline ใช้โทนสี `up`/`down`/`neutral` ชุดเดียวกับ
  `Stat`

## การเข้าถึง (Accessibility) และการเคลื่อนไหว

- Focus ring กำหนดไว้ตายตัวว่า `outline: 3px solid var(--color-coral); outline-offset: 2px`
  ผ่าน `:focus-visible` — ห้าม override เป็นรายตัว component
- `::selection` ใช้พื้นหลังสี `--color-lime` บนข้อความสี `--color-ink`
- ทุก animation/transition จะสั้นลงเหลือ `0.01ms` โดยอัตโนมัติเมื่อผู้ใช้ตั้งค่า
  `prefers-reduced-motion: reduce` — ระบบนี้ทำงานอยู่แล้วทั้งแอป ห้ามเพิ่มการเคลื่อนไหวที่
  ข้ามระบบนี้ไป (เช่น animation ที่ขับด้วย `setTimeout` ตรงๆ)

## สร้างหน้าหรือ widget ใหม่

**ห้ามออกแบบใหม่เองตั้งแต่ศูนย์** ให้ทำตามลำดับนี้:

1. หยิบ primitive ที่มีอยู่แล้วมาใช้ก่อน (`Card`, `Stat`, `Badge`, `EmptyState`,
   `Sparkline`) ก่อนจะเขียน markup ใหม่
2. ถ้าเป็นค่าเกี่ยวกับสี/radius/shadow ต้องอ้างอิงกลับไปที่ token ด้านบนเสมอ —
   ห้ามใช้ hex code ใหม่ ห้ามใช้ `rounded-[Npx]` แบบใส่ตัวเลขเอง
3. ทำตามโครงหน้ามาตรฐาน: `Topbar` → `<main class="flex-1 space-y-6 overflow-y-auto
   p-8">` → การ์ดหลายใบเรียงใน `grid ... gap-6`
4. ถ้า widget อ่านข้อมูลจากภายนอก ต้องมีค่า `source: "live" | "mock" | ...` และแสดง
   `DataSourceBadge` ไว้ในช่อง `action` ของการ์ด — ห้ามโชว์ข้อมูลโดยไม่บอกที่มา
5. จะเพิ่ม primitive ใหม่เข้า `src/components/ui/` ได้ก็ต่อเมื่อไม่มีตัวไหนข้างบนใช้ได้จริงๆ
   เท่านั้น และต้องสร้างจาก token ชุดเดียวกันนี้เสมอ

**กฎนี้ถูกบังคับใช้จริงผ่าน `CLAUDE.md`** (โหลดอัตโนมัติทุกครั้งที่ Claude Code ทำงานใน
โปรเจกต์นี้ ไม่ว่าจะถูกเรียกผ่าน skill ไหนหรือพิมพ์สั่งตรงๆ ก็ตาม) — สอง skill
`add-dashboard-page` และ `add-dashboard-widget` (`.claude/skills/`) ใช้ประโยชน์จากกฎนี้ตอน
สร้างหน้า/widget ใหม่ให้ แต่ตัว `SKILL.md` เองไม่ได้เขียนกฎซ้ำไว้ — ตัวบังคับจริงๆ อยู่ที่
`CLAUDE.md` ไฟล์เดียว
