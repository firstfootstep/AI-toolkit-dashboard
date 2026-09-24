@dashboard/AGENTS.md

# Project layout

- `.claude/skills/`, `.claude/agents/` — the course's skills and agents
- `dashboard/` — the Next.js app (run `npm install` / `npm run dev` inside it)
- `prototypes/` — Session 1 Python scripts

# Design system — one theme for the whole app

Before writing or editing any page, component, or widget, read `dashboard/DESIGN.md`. This project
has **one locked visual theme** (warm-ivory light, deep forest-green primary, a single lime
accent, no dark mode) defined as CSS tokens in `dashboard/src/app/globals.css` and exposed as Tailwind
utilities (`bg-canvas`, `text-ink`, `bg-primary`, `border-line`, etc.).

**Never invent a new color, radius, shadow, or font.** Always reuse the existing tokens —
extend `globals.css` only if a genuinely new token is needed, never hardcode a raw hex value
or arbitrary Tailwind color class in a component. Reuse `dashboard/src/components/ui/` primitives
(`Card`, `Badge`, `Stat`, `Sparkline`, `EmptyState`) instead of building new ad-hoc markup —
that's what keeps every menu looking like the same app instead of nine different demos
stitched together.
