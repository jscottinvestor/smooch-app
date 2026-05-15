/**
 * Receipt parsing — regex-based, ported from prototype.html.
 * Phase 5 will replace with a Claude vision call; until then this works on
 * the bundled sample and most paste-in receipts with the standard format
 * "ITEM NAME            12.34".
 */

export const SAMPLE_RECEIPT = `COSTCO WHOLESALE
05/12/2026

KS UNSALTED BUTTER 4LB      13.99
C&H BROWN SUGAR 4LB          7.49
C&H POWDERED SUGAR 4LB       6.99
KS LARGE EGGS 24CT           7.29
KIRKLAND PURE VANILLA 16OZ  31.99
KS AP FLOUR 25LB            14.49
MORTON KOSHER SALT 3LB       5.49
CLABBER GIRL BAKING PWDR    4.29
ARM HAMMER BAKING SODA 4LB   6.79
ARGO CORN STARCH 16OZ        3.99
GHIRARDELLI MILK CHOC 11.5OZ 5.79
KS SEMISWEET CHOC CHIPS 4.5LB 16.99
GHIRARDELLI DARK WAFERS 10OZ 5.49

SUBTOTAL                   131.05
TAX                          0.00
TOTAL                      131.05`;

export interface ParsedReceiptItem {
  rawName: string;
  qty: number;
  price: number;
}

export interface ParsedReceipt {
  store: string;
  date: string; // YYYY-MM-DD
  total: number | null;
  items: ParsedReceiptItem[];
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let store = "";
  let date = new Date().toISOString().slice(0, 10);
  let total: number | null = null;
  const items: ParsedReceiptItem[] = [];

  // First non-priced line that's short and not a number → likely the store name
  if (lines.length > 0 && lines[0].length < 40 && !/\$|\d{2,}\./.test(lines[0])) {
    store = lines[0];
  }

  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
    if (dateMatch) {
      const [, mo, d, y] = dateMatch;
      const year = y.length === 2 ? "20" + y : y;
      date = `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const totalMatch = line.match(
      /^(?:TOTAL|GRAND TOTAL|TOTAL DUE)[:\s]+\$?(\d+\.\d{2})/i
    );
    if (totalMatch) total = parseFloat(totalMatch[1]);

    // Skip non-item summary lines
    if (
      /^(SUBTOTAL|TAX|TOTAL|CASH|CHANGE|VISA|MASTER|DEBIT|TENDER|BALANCE|CARD|AMOUNT|PAYMENT)/i.test(
        line
      )
    ) {
      continue;
    }

    const priceMatch = line.match(/\$?(\d+\.\d{2})\s*[A-Z]?\s*$/);
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1]);
    if (price <= 0 || price > 1000) continue;

    let rest = line.slice(0, priceMatch.index).trim();
    rest = rest.replace(/^\d+\s*@\s*\$?\d+\.\d{2}\s*/i, "");
    rest = rest.replace(/\s+[A-Z]{1,2}$/, "").trim();
    if (rest.length < 2) continue;

    let qty = 1;
    const qtyMatch = rest.match(/^(\d+)\s+(.+)$/);
    if (qtyMatch && parseInt(qtyMatch[1], 10) <= 20) {
      qty = parseInt(qtyMatch[1], 10);
      rest = qtyMatch[2];
    }

    items.push({ rawName: rest, qty, price });
  }

  return { store, date, total, items };
}

export interface ExtractedPackageInfo {
  packageSize: number;
  packageUnit: string;
  cleanName: string;
}

/**
 * Heuristic — pull a package size + unit out of a raw receipt name.
 * "KS UNSALTED BUTTER 4LB" → { 4, 'lb', 'KS UNSALTED BUTTER' }
 */
export function extractPackageInfo(rawName: string): ExtractedPackageInfo {
  if (!rawName) return { packageSize: 0, packageUnit: "g", cleanName: rawName };
  const lower = rawName.toLowerCase();

  const looksLikeSolid = /\b(chocolate|choc|chips|wafers|cocoa|candy|sugar|flour|powder|nuts?|cereal|seeds?|salt|rice|pasta)\b/.test(
    lower
  );
  const isLiquidLike =
    !looksLikeSolid &&
    /\b(vanilla|extract|olive\s*oil|coconut\s*oil|canola\s*oil|vegetable\s*oil|syrup|honey|juice|sauce|milk\b)\b/.test(
      lower
    );

  type Pattern = {
    re: RegExp;
    unit: string | (() => string);
    mult?: number;
  };
  const patterns: Pattern[] = [
    { re: /\b(\d+(?:\.\d+)?)\s*fl\s*oz\b/i, unit: "fl oz" },
    { re: /\b(\d+(?:\.\d+)?)\s*floz\b/i, unit: "fl oz" },
    { re: /\b(\d+(?:\.\d+)?)\s*lbs?\b/i, unit: "lb" },
    { re: /\b(\d+(?:\.\d+)?)\s*kg\b/i, unit: "kg" },
    {
      re: /\b(\d+(?:\.\d+)?)\s*oz\b/i,
      unit: () => (isLiquidLike ? "fl oz" : "oz"),
    },
    { re: /\b(\d+(?:\.\d+)?)\s*(?:g|gm|gr|grams?)\b/i, unit: "g" },
    { re: /\b(\d+(?:\.\d+)?)\s*ml\b/i, unit: "ml" },
    { re: /\b(\d+(?:\.\d+)?)\s*l\b/i, unit: "l" },
    {
      re: /\b(\d+(?:\.\d+)?)\s*(?:ct|count|pk|pack|pcs?|piece)\b/i,
      unit: "each",
    },
    { re: /\b(\d+(?:\.\d+)?)\s*dozen\b/i, unit: "each", mult: 12 },
    { re: /\b(\d+(?:\.\d+)?)\s*doz\b/i, unit: "each", mult: 12 },
  ];

  for (const p of patterns) {
    const m = rawName.match(p.re);
    if (m) {
      let size = parseFloat(m[1]);
      if (p.mult) size *= p.mult;
      const unit = typeof p.unit === "function" ? p.unit() : p.unit;
      const cleanName = rawName.replace(p.re, "").replace(/\s+/g, " ").trim();
      return { packageSize: size, packageUnit: unit, cleanName };
    }
  }
  return { packageSize: 0, packageUnit: "g", cleanName: rawName };
}
