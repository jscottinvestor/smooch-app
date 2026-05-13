import { TabBar } from "@/components/nav/tab-bar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6">
      <header className="pt-6 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Cookie business</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Recipes, inventory, receipts & costing
        </p>
      </header>
      <TabBar />
      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}
