import { Topbar } from "@/components/layout/Topbar";
import { SettingsPanel } from "@/features/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" />
      <main className="flex-1 overflow-y-auto p-8">
        <SettingsPanel />
      </main>
    </>
  );
}
