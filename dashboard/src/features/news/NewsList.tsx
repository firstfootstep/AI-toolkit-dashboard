import { Newspaper } from "lucide-react";
import type { NewsItem } from "@/types/market";
import { timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-ink/6 text-muted">
            <Newspaper size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-ink hover:underline"
            >
              {item.title}
            </a>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              {item.tag && <Badge tone="blue">{item.tag}</Badge>}
              <span>{item.source}</span>
              <span>·</span>
              <span>{timeAgo(item.publishedAt)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
