import { redirect } from "next/navigation";

// News is now part of the merged "Market & News" page (sidebar reorder). Kept as a redirect rather than deleting the route outright, in case
// something still links directly to /news.
export default function NewsPage() {
  redirect("/markets");
}
