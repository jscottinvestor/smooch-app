// Domain types — these mirror the prototype's in-memory shape.
// Database rows use snake_case; map at the DB boundary, not here.

export type Unit =
  | "g"
  | "kg"
  | "oz"
  | "lb"
  | "ml"
  | "l"
  | "tsp"
  | "tbsp"
  | "cup"
  | "cups"
  | "fl oz"
  | "each"
  | "sticks"
  | "box"
  | "bar"
  | "bag"
  | "squares";

export interface ProductConversion {
  fromQty: number;
  fromUnit: Unit;
  toQty: number;
  toUnit: Unit;
}

export interface PriceHistoryEntry {
  date: string; // YYYY-MM-DD
  price: number;
  source: "manual" | "receipt";
}

export interface Product {
  id: string;
  name: string;
  store: string | null;
  categoryId: string | null;
  packageSize: number;
  packageUnit: Unit;
  price: number;
  /** In packages, not in packageUnit. Fractions allowed. */
  stock: number;
  conversions: ProductConversion[];
  priceHistory: PriceHistoryEntry[];
  receiptAliases: string[];
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  productId: string | null;
  useAnyMatching: boolean;
  /** Narrows the dropdown's product list in the Edit modal only. */
  filterCategoryId: string | null;
}

export interface Recipe {
  id: string;
  name: string;
  batches: number;
  itemsPerBatch: number;
  ingredients: Ingredient[];
}

export type ReceiptLineAction =
  | "updated"
  | "unchanged"
  | "created"
  | "skipped"
  | "ignored";

export interface ReceiptLine {
  rawName: string;
  qty: number;
  price: number;
  productId: string | null;
  action: ReceiptLineAction;
  markReceived: boolean;
}

export interface Receipt {
  id: string;
  date: string; // YYYY-MM-DD
  store: string;
  total: number | null;
  lines: ReceiptLine[];
}
