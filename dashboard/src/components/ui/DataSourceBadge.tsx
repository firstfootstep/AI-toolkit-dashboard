import { Badge } from "@/components/ui/Badge";
import type { DataSourceStatus } from "@/types/market";

export function DataSourceBadge({ source }: { source: DataSourceStatus }) {
  if (source === "tradingview") return null;
  if (source === "live") return <Badge tone="green">Live data</Badge>;
  return <Badge tone="amber">Mock data (fallback)</Badge>;
}
