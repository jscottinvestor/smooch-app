import { z } from "zod";

/**
 * Schema matching ParsedReceipt — populated by Claude vision.
 * The descriptions are part of the prompt the model sees; write them for the
 * model, not for human readers.
 */
export const ReceiptItemSchema = z.object({
  rawName: z
    .string()
    .describe(
      "the line-item text as it appears on the receipt, verbatim (preserve casing and abbreviations)"
    ),
  qty: z
    .number()
    .describe(
      "quantity of this item. If the receipt doesn't show a quantity, use 1."
    ),
  price: z.number().describe("the total amount paid for this line in dollars. For qty>1 this is N × per-unit price (the line total on the receipt, NOT the per-unit price)."),
  packageSize: z
    .number()
    .nullable()
    .describe(
      "if the item name encodes a package size (e.g., '4LB', '16OZ', '24CT'), extract the numeric value; otherwise null"
    ),
  packageUnit: z
    .string()
    .nullable()
    .describe(
      "the matching unit for packageSize, normalized to one of: lb, oz, fl oz, g, kg, ml, l, each. Use 'each' for count-style sizes (CT, PK, COUNT). Null if no package size."
    ),
});

export const ReceiptSchema = z.object({
  store: z
    .string()
    .describe(
      "the store name from the receipt header (e.g., 'COSTCO WHOLESALE'). Empty string if not visible."
    ),
  date: z
    .string()
    .describe(
      "the purchase date in YYYY-MM-DD format. If the receipt shows MM/DD/YYYY, convert. If no date is visible, use today's date."
    ),
  total: z
    .number()
    .nullable()
    .describe(
      "the receipt total in dollars (the bottom 'TOTAL' line). Null if not visible."
    ),
  items: z
    .array(ReceiptItemSchema)
    .describe(
      "every line-item on the receipt. Skip non-item lines: SUBTOTAL, TAX, TOTAL, CASH, CHANGE, payment lines, signature lines, store address, phone number, cashier name."
    ),
});

export type ReceiptOcrResult = z.infer<typeof ReceiptSchema>;

export const OCR_SYSTEM_PROMPT = `You are extracting structured data from a photo of a grocery store receipt.

Rules:
- Capture every line-item, even ones with unfamiliar abbreviations.
- Preserve the original line text verbatim in rawName — do not re-format casing or expand abbreviations. The downstream system uses this exact string as a stable identifier.
- Skip non-item lines: tax, subtotal, total, cash/card/change/tender/payment, signature, store metadata, cashier names.
- **Consolidate duplicate scans of the same item into one entry.** Many warehouse stores (Costco, Sam's Club, BJ's) list each scan as its own line. If you see the same item name with the same per-unit price appearing two or more times in a row (or anywhere on the receipt), return ONE entry with qty=N (total count) and price=the SUM (N × per-unit). Example: three lines of "KS UNSALTED BUTTER 4LB 13.99" → one entry with rawName="KS UNSALTED BUTTER 4LB", qty=3, price=41.97.
- If a single line itself shows a multiplier like "2 @ $5.99 ... $11.98" or "2  ITEM NAME  11.98", set qty=2 and price=11.98 (the line total, NOT the per-unit price).
- The price field is always the total for that line. The downstream system divides by qty to derive the per-unit price.
- For packageSize/packageUnit: only extract if the size is part of the item name (e.g., "KS UNSALTED BUTTER 4LB" → packageSize=4, packageUnit="lb"). Don't guess sizes from product knowledge. Normalize CT/PK/COUNT to "each", LBS to "lb", FLOZ to "fl oz".
- For dates: receipts use varied formats (MM/DD/YYYY, MM/DD/YY, M-D-YY). Convert to YYYY-MM-DD.`;
