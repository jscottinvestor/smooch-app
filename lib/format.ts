export function formatQty(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(3).replace(/\.?0+$/, "");
}

/**
 * Round a quantity to 3 decimal places. Used to keep stock and other
 * quantity values from accumulating floating-point dust through repeated
 * add/subtract operations (receipts add to stock, bakes subtract from it).
 */
export function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function formatMoney(
  n: number | null | undefined,
  decimals = 2
): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return "$" + n.toFixed(decimals);
}

export function productSkuDetail(p: {
  store: string | null;
  packageSize: number;
  packageUnit: string;
}): string {
  const parts: string[] = [];
  if (p.store) parts.push(p.store);
  if (p.packageSize > 0) parts.push(`${p.packageSize} ${p.packageUnit}`);
  return parts.join(" · ");
}
