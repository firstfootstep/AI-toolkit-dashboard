import clsx from "clsx";
import { CALENDAR_TIMEZONE, dateKeyInCalendarZone, weekKeysInCalendarZone } from "@/lib/economicCalendar";
import type { EconomicEvent } from "@/types/market";

// One column per day of the week (Mon-Sun, in CALENDAR_TIMEZONE — same zone
// economicCalendar.ts uses to filter the live feed), even when a day has
// zero high-impact events — a genuinely quiet day should read as "no
// high-impact events" in its own column, not as a silently missing one.
function groupByDay(items: EconomicEvent[]): { date: string; label: string; isToday: boolean; items: EconomicEvent[] }[] {
  const now = new Date();
  const todayKey = dateKeyInCalendarZone(now);
  // Mon-Fri only — high-impact releases essentially never land on a weekend,
  // so a Sat/Sun column would just be dead space every single week.
  const weekKeys = weekKeysInCalendarZone(now).slice(0, 5);

  const byDate = new Map<string, EconomicEvent[]>();
  for (const item of items) {
    const key = dateKeyInCalendarZone(new Date(item.date));
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(item);
  }

  return weekKeys.map((key) => ({
    date: key,
    label: dayLabel(key),
    isToday: key === todayKey,
    items: byDate.get(key) ?? [],
  }));
}

function dayLabel(dateKey: string): string {
  const weekdayDate = new Date(`${dateKey}T00:00:00Z`);
  // "short" spells out the full Thai weekday name ("จันทร์") — "narrow"
  // gives the short form ("จ") a real Thai calendar actually uses.
  const weekday = weekdayDate.toLocaleDateString("th-TH", { weekday: "narrow" });
  const dayMonth = weekdayDate.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  return `${weekday}. ${dayMonth}`;
}

function actualTone(item: EconomicEvent): "up" | "down" | "flat" {
  if (!item.actual || !item.forecast) return "flat";
  const actual = parseFloat(item.actual);
  const forecast = parseFloat(item.forecast);
  if (Number.isNaN(actual) || Number.isNaN(forecast) || actual === forecast) return "flat";
  return actual > forecast ? "up" : "down";
}

// Two-line entry: title + time on top, forecast/actual (or forecast/previous
// when the print hasn't landed yet) on the line below — matches how a real
// economic calendar reads events, instead of squeezing everything onto one
// line or spreading it across table columns.
function EventEntry({ item }: { item: EconomicEvent }) {
  const time = new Date(item.date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CALENDAR_TIMEZONE,
  });
  const tone = actualTone(item);
  const hasNumbers = item.forecast != null || item.actual != null || item.previous != null;

  return (
    <div className="py-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-xs leading-snug text-ink">
          <span className="mr-1 rounded-[var(--radius-sm)] bg-ink/6 px-1 py-px text-[10px] font-semibold text-muted">{item.country}</span>
          {item.title}
        </span>
        <span className="flex-none pt-px font-[family-name:var(--font-ui)] text-[10px] text-muted">{time}</span>
      </div>
      {hasNumbers && (
        <p className="mt-0.5 text-[11px] text-muted">
          Forecast {item.forecast ?? "—"}
          {item.actual != null ? (
            <>
              {" · "}
              <span
                className={clsx(
                  "font-semibold",
                  tone === "up" && "text-primary-bright",
                  tone === "down" && "text-coral",
                  tone === "flat" && "text-ink-soft"
                )}
              >
                Actual {item.actual}
              </span>
            </>
          ) : item.previous != null ? (
            <> · Previous {item.previous}</>
          ) : null}
        </p>
      )}
    </div>
  );
}

const VISIBLE_PER_DAY = 6;

function DayColumn({ label, isToday, items }: { label: string; isToday: boolean; items: EconomicEvent[] }) {
  const visible = items.slice(0, VISIBLE_PER_DAY);
  const rest = items.slice(VISIBLE_PER_DAY);

  return (
    <div className="min-w-0">
      <div
        className={clsx(
          "mb-1 border-b-2 pb-1 font-[family-name:var(--font-ui)] text-xs font-semibold",
          isToday ? "border-primary-bright text-primary-bright" : "border-line text-ink"
        )}
      >
        {label}
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-xs text-muted">ไม่มีตัวเลข high-impact</p>
      ) : (
        <div className="divide-y divide-line">
          {visible.map((item, i) => (
            <EventEntry key={i} item={item} />
          ))}
          {rest.length > 0 && (
            <details className="group py-1">
              <summary className="cursor-pointer list-none text-[11px] text-muted hover:text-ink">+{rest.length} เพิ่มเติม</summary>
              <div className="divide-y divide-line">
                {rest.map((item, i) => (
                  <EventEntry key={i} item={item} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export function EconomicCalendar({ items }: { items: EconomicEvent[] }) {
  const days = groupByDay(items);

  return (
    <div className="grid grid-cols-5 gap-4">
      {days.map(({ date, label, isToday, items: dayItems }) => (
        <DayColumn key={date} label={label} isToday={isToday} items={dayItems} />
      ))}
    </div>
  );
}
