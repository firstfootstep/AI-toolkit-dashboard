import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-md)] border border-dashed border-line py-16 text-center">
      {icon && <div className="text-muted" aria-hidden>{icon}</div>}
      <div>
        <p className="font-[family-name:var(--font-ui)] font-medium text-ink">{title}</p>
        {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
