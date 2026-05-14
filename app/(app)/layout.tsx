import { TabBar } from "@/components/nav/tab-bar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6">
      <header className="pt-8 pb-5">
        <h1
          className="font-display text-3xl tracking-tight"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          Cookie business
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recipes, inventory, receipts &amp; costing
        </p>
      </header>
      <TabBar />
      <main className="flex-1 py-8">{children}</main>
    </div>
  );
}
