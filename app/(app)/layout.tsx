import { TabBar } from "@/components/nav/tab-bar";
import { UserMenu } from "@/components/nav/user-menu";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6">
      <header className="pt-8 pb-5 flex items-start justify-between gap-4">
        <h1
          className="font-display text-3xl tracking-tight"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          SMOOCH BAKING BUDDY
        </h1>
        <UserMenu email={user?.email ?? null} />
      </header>
      <TabBar />
      <main className="flex-1 py-8">{children}</main>
    </div>
  );
}
