import clsx from "clsx";

const tones = {
  green: "bg-primary-bright/12 text-primary-bright",
  amber: "bg-coral/14 text-coral",
  red: "bg-coral/14 text-coral",
  neutral: "bg-ink/6 text-muted",
  blue: "bg-lime/50 text-primary",
} as const;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={clsx(
        "rounded-full px-2.5 py-0.5 font-[family-name:var(--font-ui)] text-xs font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}
