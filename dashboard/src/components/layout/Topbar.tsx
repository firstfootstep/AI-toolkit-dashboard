export function Topbar({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between border-b border-line bg-paper px-8 py-5">
      <h1 className="text-balance font-[family-name:var(--font-ui)] text-xl font-semibold text-ink">
        {title}
      </h1>
      {action}
    </header>
  );
}
