import { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Consistent stub pattern for a menu page that is scaffolded but not yet
 * built out (see the add-dashboard-page skill). Keeps every page in the
 * sidebar navigable and visually consistent instead of a broken link. Every
 * shipped page is built now; Research reuses this as its empty state.
 */
export function ComingSoon({
  icon,
  title,
  description,
  hint,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={
        hint && (
          <p className="max-w-md text-xs text-muted/70">{hint}</p>
        )
      }
    />
  );
}
