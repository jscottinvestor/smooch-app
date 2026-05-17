import { buildCategoryPaths } from "@/lib/category-paths";
import { listCategories } from "@/lib/db/categories";
import { listProducts } from "@/lib/db/products";
import { listStores } from "@/lib/db/stores";
import { seedDatabaseIfEmpty } from "@/lib/seed";
import { getServerSupabase } from "@/lib/supabase/server";
import { InventoryView } from "@/components/inventory/inventory-view";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  await seedDatabaseIfEmpty(await getServerSupabase());
  const [categories, products, stores] = await Promise.all([
    listCategories(),
    listProducts(),
    listStores(),
  ]);
  const categoryPaths = buildCategoryPaths(categories);
  return (
    <InventoryView
      categories={categories}
      products={products}
      categoryPaths={categoryPaths}
      stores={stores}
    />
  );
}
