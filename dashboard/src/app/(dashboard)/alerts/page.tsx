import { Topbar } from "@/components/layout/Topbar";
import { AlertsPanel } from "@/features/alerts/AlertsPanel";

export default function AlertsPage() {
  return (
    <>
      <Topbar title="Alerts" />
      <main className="flex-1 overflow-y-auto p-8">
        <AlertsPanel />
      </main>
    </>
  );
}
