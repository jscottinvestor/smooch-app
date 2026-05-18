import { ChefHat, ShoppingCart } from "lucide-react";
import { TabBar } from "@/components/nav/tab-bar";
import { UserMenu } from "@/components/nav/user-menu";
import { BakeDialog } from "@/components/dashboard/bake-dialog";
import { ShoppingListDialog } from "@/components/dashboard/shopping-list-dialog";
import { ChatButton } from "@/components/chat-button";
import { FeedbackButton } from "@/components/feedback-button";
import { Button } from "@/components/ui/button";
import { listCategories } from "@/lib/db/categories";
import { listProducts } from "@/lib/db/products";
import { listRecipes } from "@/lib/db/recipes";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getServerSupabase();
  const [
    {
      data: { user },
    },
    products,
    recipes,
    categories,
  ] = await Promise.all([
    supabase.auth.getUser(),
    listProducts(),
    listRecipes(),
    listCategories(),
  ]);

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6">
      <header className="pt-8 pb-5 flex items-start justify-between gap-4">
        <h1
          className="font-display text-3xl tracking-tight"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          COTTAGE BAKING BUDDY
        </h1>
        <UserMenu email={user?.email ?? null} />
      </header>
      <TabBar
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <ShoppingListDialog
              recipes={recipes}
              products={products}
              categories={categories}
              userEmail={user?.email ?? null}
            >
              <Button size="sm" variant="outline" className="w-full sm:w-auto">
                <ShoppingCart className="w-4 h-4" />
                Create shopping list
              </Button>
            </ShoppingListDialog>
            <BakeDialog recipes={recipes} products={products}>
              <Button size="sm" variant="outline" className="w-full sm:w-auto">
                <ChefHat className="w-4 h-4" />
                Bake products
              </Button>
            </BakeDialog>
          </div>
        }
      />
      <main className="flex-1 py-8">{children}</main>
      <footer className="border-t mt-4 py-3 flex flex-col items-center gap-1">
        <FeedbackButton />
        <ChatButton />
      </footer>
    </div>
  );
}
