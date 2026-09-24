import { TrendingUp, Scale, Shield } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

const items = [
  {
    icon: TrendingUp,
    tone: "green" as const,
    title: "Growth exposure",
    description: "Focus on quality growth businesses with strong earnings momentum.",
    status: "On track",
  },
  {
    icon: Scale,
    tone: "amber" as const,
    title: "Rate sensitivity",
    description: "Monitor duration risk as rates remain elevated.",
    status: "Monitor",
  },
  {
    icon: Shield,
    tone: "green" as const,
    title: "Diversification",
    description: "Maintain exposure across sectors and asset classes.",
    status: "On track",
  },
];

export function ThesisPanel() {
  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.title} className="flex items-start gap-3">
            <div
              className={
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                (item.tone === "green"
                  ? "bg-primary-bright/12 text-primary-bright"
                  : "bg-coral/14 text-coral")
              }
            >
              <Icon size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">{item.title}</p>
              <p className="text-xs text-muted">{item.description}</p>
            </div>
            <Badge tone={item.tone}>{item.status}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
