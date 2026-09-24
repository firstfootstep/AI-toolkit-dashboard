import {
  LayoutDashboard,
  Briefcase,
  Bookmark,
  TrendingUp,
  LineChart,
  ScanSearch,
  Search,
  Settings,
  Rotate3d,
  Crown,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Order follows the course's menu-by-menu build order (Session 2).
export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Market & News", href: "/markets", icon: TrendingUp },
  { label: "Watchlist", href: "/watchlist", icon: Bookmark },
  { label: "Scanner", href: "/scanner", icon: ScanSearch },
  // Added outside the original 9-menu plan — a
  // teaching-facing bonus menu, not part of that doc's Session 1/2
  // sequence. See legend-scanner-agent.md for what it does.
  { label: "Legend Scanner", href: "/legend-scanner", icon: Crown },
  { label: "Chart", href: "/chart", icon: LineChart },
  { label: "Sector Rotation", href: "/sector-rotation", icon: Rotate3d },
  { label: "Research", href: "/research", icon: Search },
  { label: "Portfolio", href: "/portfolio", icon: Briefcase },
  { label: "Settings", href: "/settings", icon: Settings },
];
