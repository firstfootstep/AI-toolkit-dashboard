import { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-[var(--radius-md)] border border-line bg-paper p-5 shadow-[var(--shadow-sm)] transition-shadow duration-200 hover:shadow-[var(--shadow-md)]",
        className
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold text-ink">{title}</h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
