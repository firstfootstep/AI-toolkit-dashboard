---
name: add-dashboard-page
description: สร้างโครงหน้าใหม่ในแดชบอร์ด InvestView (route + รายการใน sidebar) โดยเป็นไปตามข้อกำหนด App Router และโครงสร้างโฟลเดอร์ของโปรเจกต์นี้ ใช้เมื่อผู้ใช้ขอให้เพิ่มเมนูใหม่ หน้าใน sidebar หรือ route ให้แดชบอร์ด
---

# Add a dashboard page

This skill scaffolds a new top-level page in the InvestView dashboard so it shows up as a
sidebar menu item, with a consistent layout and (optionally) a feature folder for its logic.

## When to use this

The user asks for a new sidebar item / page, e.g. "add a Screener page" or "I want a
Tax Lots menu item".

## Steps

1. **Confirm the route name and label** with the user if not obvious (kebab-case route,
   Title Case sidebar label, and which `lucide-react` icon fits).

2. **Register the nav item** in `dashboard/src/components/layout/nav-items.ts`:
   - Import an appropriate icon from `lucide-react`.
   - Add `{ label, href: "/<route>", icon }` to the `navItems` array in the position the
     user wants (sidebar order follows array order).

3. **Create the route** at `dashboard/src/app/(dashboard)/<route>/page.tsx`. Every page in this group
   shares the sidebar shell from `dashboard/src/app/(dashboard)/layout.tsx` — do not re-add a
   `<Sidebar />` yourself. Minimum shape:

   ```tsx
   import { Topbar } from "@/components/layout/Topbar";

   export default function <Name>Page() {
     return (
       <>
         <Topbar title="<Label>" />
         <main className="flex-1 space-y-6 overflow-y-auto p-8">
           {/* page content */}
         </main>
       </>
     );
   }
   ```

4. **Decide: real feature, or stub?**
   - If the user wants working functionality now, create `dashboard/src/features/<name>/` for its
     components/data helpers (see the `add-dashboard-widget` skill for the Card+data
     pattern), and wire it into the page.
   - If it's a placeholder for later, use the existing stub pattern instead of inventing a
     new one:

     ```tsx
     import { ComingSoon } from "@/components/layout/ComingSoon";
     import { Card } from "@/components/ui/Card";
     import { SomeIcon } from "lucide-react";

     <Card>
       <ComingSoon
         icon={<SomeIcon size={28} />}
         title="<Label> is scaffolded, not built yet"
         description="One sentence on what this page will eventually do."
         hint="Extend it with the add-dashboard-widget skill."
       />
     </Card>
     ```

5. **If the page needs external data** (prices, news, etc.), reuse `getQuotes()` /
   `getNews()` from `dashboard/src/lib/quotes.ts` / `dashboard/src/lib/news.ts` rather than fetching a new
   source directly — they already implement the cache + keyless-live + mock-fallback
   pattern this project standardizes on. If you must add a genuinely new external source,
   follow the `data-source-auditor` agent's checklist before shipping it.

6. **Verify**: run `npm run dev` (inside `dashboard/`), open the new route, confirm the sidebar highlights it
   (active state driven by `usePathname()` in `Sidebar.tsx`), and check both light/dark
   mode render correctly.

## Conventions to preserve

- Route group `(dashboard)` — don't create pages outside it unless they intentionally skip
  the sidebar shell (e.g. an auth page).
- `dashboard/src/components/ui/` stays generic; anything specific to this new page's data belongs in
  its own `dashboard/src/features/<name>/` folder, not in `ui/`.
- Keep the `Topbar title` matching the sidebar label exactly.
