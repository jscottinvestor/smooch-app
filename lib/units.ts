import type { Product, Unit } from "./types";

const WEIGHT_TO_G: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  cup: 236.588,
  "fl oz": 29.5735,
};

export const ALL_UNITS: Unit[] = [
  "g",
  "kg",
  "oz",
  "lb",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "cups",
  "fl oz",
  "each",
  "sticks",
  "box",
  "bar",
  "bag",
  "squares",
];

const COUNT_UNITS = new Set([
  "each",
  "sticks",
  "box",
  "bar",
  "bag",
  "squares",
  "cups",
]);

/** Product-name predicates → built-in cross-dimensional conversions. */
const WELL_KNOWN_CONVERSIONS = [
  // 1 stick of butter = 113.4 g (US standard: 1/4 lb)
  {
    match: (name: string) => /\bbutter\b/i.test(name || ""),
    fromUnit: "sticks",
    toUnit: "g",
    toQty: 113.4,
  },
] as const;

export function unitDimension(u: string): string | null {
  if (WEIGHT_TO_G[u]) return "weight";
  if (VOLUME_TO_ML[u]) return "volume";
  if (COUNT_UNITS.has(u)) return "count:" + u;
  return null;
}

/**
 * Convert qty from fromUnit to toUnit, using product-specific and well-known
 * cross-dimensional conversions where applicable. Returns null if no path.
 *
 * Ported from prototype.html's convertQuantity. Behavior preserved verbatim.
 */
export function convertQuantity(
  qty: number,
  fromUnit: string,
  toUnit: string,
  product: Pick<Product, "name" | "conversions"> | null
): number | null {
  if (fromUnit === toUnit) return qty;
  const fromDim = unitDimension(fromUnit);
  const toDim = unitDimension(toUnit);

  if (fromDim === toDim && fromDim === "weight") {
    return (qty * WEIGHT_TO_G[fromUnit]) / WEIGHT_TO_G[toUnit];
  }
  if (fromDim === toDim && fromDim === "volume") {
    return (qty * VOLUME_TO_ML[fromUnit]) / VOLUME_TO_ML[toUnit];
  }
  if (fromDim === toDim && fromDim && fromDim.startsWith("count:")) {
    return qty;
  }

  // Per-product user-defined conversions
  if (product && product.conversions) {
    for (const c of product.conversions) {
      if (c.fromUnit === fromUnit && c.toUnit === toUnit) {
        return (qty * c.toQty) / c.fromQty;
      }
      if (c.fromUnit === toUnit && c.toUnit === fromUnit) {
        return (qty * c.fromQty) / c.toQty;
      }
      const toFromDim = unitDimension(c.fromUnit);
      if (toFromDim === fromDim) {
        const intermediate = convertQuantity(qty, fromUnit, c.fromUnit, null);
        if (intermediate !== null) {
          const converted = (intermediate * c.toQty) / c.fromQty;
          const final = convertQuantity(converted, c.toUnit, toUnit, null);
          if (final !== null) return final;
        }
      }
      if (toFromDim === toDim) {
        // c.fromUnit is in toUnit's dimension. To use this conversion in
        // reverse, fromUnit must be in c.toUnit's dimension so we can:
        //   fromUnit -> c.toUnit -> (× fromQty/toQty) -> c.fromUnit -> toUnit
        // The previous code skipped the fromUnit -> c.toUnit conversion and
        // mis-treated qty as if it were already in c.toUnit.
        const toToDim = unitDimension(c.toUnit);
        if (toToDim === fromDim) {
          const inCtoUnit = convertQuantity(qty, fromUnit, c.toUnit, null);
          if (inCtoUnit !== null) {
            const inCfromUnit = (inCtoUnit * c.fromQty) / c.toQty;
            const final = convertQuantity(
              inCfromUnit,
              c.fromUnit,
              toUnit,
              null
            );
            if (final !== null) return final;
          }
        }
      }
    }
  }

  // Built-in well-known food conversions
  if (product && product.name) {
    for (const wk of WELL_KNOWN_CONVERSIONS) {
      if (!wk.match(product.name)) continue;
      if (wk.fromUnit === fromUnit && wk.toUnit === toUnit) return qty * wk.toQty;
      if (wk.fromUnit === toUnit && wk.toUnit === fromUnit) return qty / wk.toQty;
      if (wk.fromUnit === fromUnit) {
        const inWkTo = qty * wk.toQty;
        const final = convertQuantity(inWkTo, wk.toUnit, toUnit, null);
        if (final !== null) return final;
      }
      if (wk.fromUnit === toUnit) {
        const inWkTo = convertQuantity(qty, fromUnit, wk.toUnit, null);
        if (inWkTo !== null) return inWkTo / wk.toQty;
      }
    }
  }

  return null;
}
