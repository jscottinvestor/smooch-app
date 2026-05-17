import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Free-tier usage caps. The paid tier (not yet implemented) lifts all of
 * these to unlimited. Specific accounts can be granted unlimited access
 * via UNLIMITED_EMAILS below — useful for the app author's own account
 * during development.
 */
export const FREE_TIER = {
  recipes: 2,
  products: 30,
  receiptsPerMonth: 10,
} as const;

const UNLIMITED_EMAILS = new Set<string>([
  // The author's account — unlimited so seeding and testing aren't blocked.
  "j@jscott.com",
]);

export interface LimitCheck {
  allowed: boolean;
  error?: string;
}

const ALLOWED: LimitCheck = { allowed: true };

async function isUnlimitedUser(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  return !!email && UNLIMITED_EMAILS.has(email);
}

export async function checkRecipeLimit(
  supabase: SupabaseClient
): Promise<LimitCheck> {
  if (await isUnlimitedUser(supabase)) return ALLOWED;
  const { count, error } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true });
  // Fail open on count error — we'd rather let the action through than
  // accidentally block a legitimate user because of a transient DB issue.
  if (error) return ALLOWED;
  if ((count ?? 0) >= FREE_TIER.recipes) {
    return {
      allowed: false,
      error: `Free Tier Limit Reached: Only ${FREE_TIER.recipes} Recipes Allowed`,
    };
  }
  return ALLOWED;
}

export async function checkProductLimit(
  supabase: SupabaseClient
): Promise<LimitCheck> {
  if (await isUnlimitedUser(supabase)) return ALLOWED;
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  if (error) return ALLOWED;
  if ((count ?? 0) >= FREE_TIER.products) {
    return {
      allowed: false,
      error: `Free Tier Limit Reached: Only ${FREE_TIER.products} Ingredients Allowed`,
    };
  }
  return ALLOWED;
}

/**
 * Counts receipts the user has created in the current UTC calendar
 * month. Reopened/edited receipts don't count again — the per-month cap
 * is about new OCR scans + saves.
 */
export async function checkReceiptLimit(
  supabase: SupabaseClient
): Promise<LimitCheck> {
  if (await isUnlimitedUser(supabase)) return ALLOWED;
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const { count, error } = await supabase
    .from("receipts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monthStart.toISOString());
  if (error) return ALLOWED;
  if ((count ?? 0) >= FREE_TIER.receiptsPerMonth) {
    return {
      allowed: false,
      error: `Free Tier Limit Reached: Only ${FREE_TIER.receiptsPerMonth} Scanned Receipts Per Month Allowed`,
    };
  }
  return ALLOWED;
}
