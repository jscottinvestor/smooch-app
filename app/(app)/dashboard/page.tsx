import { listCategories } from "@/lib/db/categories";
import { listProducts } from "@/lib/db/products";
import { listRecipes } from "@/lib/db/recipes";
import { seedDatabaseIfEmpty } from "@/lib/seed";
import { seedRecipesIfEmpty } from "@/lib/seed-recipes";
import { getServerSupabase } from "@/lib/supabase/server";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  await seedDatabaseIfEmpty(supabase);
  await seedRecipesIfEmpty(supabase);

  const [products, recipes, categories] = await Promise.all([
    listProducts(),
    listRecipes(),
    listCategories(),
  ]);

  return (
    <DashboardView
      products={products}
      recipes={recipes}
      categories={categories}
    />
  );
}
