import clsx from "clsx";
import { Sparkline } from "@/components/ui/Sparkline";

export function Stat({
  label,
  value,
  delta,
  history,
  tone,
}: {
  label: string;
  value: string;
  delta?: string;
  history?: number[];
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-ui)] text-2xl font-semibold text-ink">{value}</p>
      {delta && (
        <p
          className={clsx(
            "mt-1 text-sm font-medium",
            tone === "up" && "text-primary-bright",
            tone === "down" && "text-coral",
            tone === "neutral" && "text-muted"
          )}
        >
          {delta}
        </p>
      )}
      {history && history.length > 1 && (
        <div className="mt-2 h-8 w-full">
          <Sparkline data={history} tone={tone} />
        </div>
      )}
    </div>
  );
}
