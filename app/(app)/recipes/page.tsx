import { listCategories } from "@/lib/db/categories";
import { listProducts } from "@/lib/db/products";
import { listRecipes } from "@/lib/db/recipes";
import { seedDatabaseIfEmpty } from "@/lib/seed";
import { seedRecipesIfEmpty } from "@/lib/seed-recipes";
import { getServerSupabase } from "@/lib/supabase/server";
import { RecipesView } from "@/components/recipes/recipes-view";

export const dynamic = "force-dynamic";

/** Claude vision OCR on the photo-import path can take 10–30s. */
export const maxDuration = 60;

export default async function RecipesPage() {
  const supabase = getServerSupabase();
  await seedDatabaseIfEmpty(supabase);
  await seedRecipesIfEmpty(supabase);

  const [recipes, products, categories] = await Promise.all([
    listRecipes(),
    listProducts(),
    listCategories(),
  ]);

  return (
    <RecipesView
      recipes={recipes}
      products={products}
      categories={categories}
    />
  );
}
