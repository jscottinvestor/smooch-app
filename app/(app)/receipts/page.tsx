import { buildCategoryPaths } from "@/lib/category-paths";
import { listCategories } from "@/lib/db/categories";
import { listProducts } from "@/lib/db/products";
import { listReceipts } from "@/lib/db/receipts";
import { seedDatabaseIfEmpty } from "@/lib/seed";
import { getServerSupabase } from "@/lib/supabase/server";
import { ReceiptsView } from "@/components/receipts/receipts-view";

export const dynamic = "force-dynamic";

/**
 * OCR can take 10–30s. Hobby plan caps at 10s; Pro/Team honor this 60s ceiling.
 */
export const maxDuration = 60;

export default async function ReceiptsPage() {
  const supabase = await getServerSupabase();
  await seedDatabaseIfEmpty(supabase);

  const [products, categories, receipts] = await Promise.all([
    listProducts(),
    listCategories(),
    listReceipts(),
  ]);
  const categoryPaths = buildCategoryPaths(categories);

  return (
    <ReceiptsView
      products={products}
      categories={categories}
      categoryPaths={categoryPaths}
      receipts={receipts}
    />
  );
}
