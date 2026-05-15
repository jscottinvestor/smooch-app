"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import { productFromRow, type ProductRow } from "@/lib/db/mappers";
import { deleteReceipt, insertReceipt, updateReceipt } from "@/lib/db/receipts";
import { normalizeAlias } from "@/lib/matching";
import {
  OCR_SYSTEM_PROMPT,
  ReceiptSchema,
  type ReceiptOcrResult,
} from "@/lib/receipt-ocr";
import type { ParsedReceipt } from "@/lib/receipt-parser";
import { getServerSupabase } from "@/lib/supabase/server";
import type {
  PriceHistoryEntry,
  ReceiptLine,
  ReceiptLineAction,
} from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface ApplyLineInput {
  rawName: string;
  qty: number;
  price: number;
  mode: "match" | "new" | "skip";
  productId: string | null;
  markReceived: boolean;
  newProduct?: {
    name: string;
    categoryId: string | null;
    packageSize: number;
    packageUnit: string;
  };
}

export interface ApplyReceiptInput {
  date: string;
  store: string;
  total: number | null;
  lines: ApplyLineInput[];
  /** If set, update this existing receipt row instead of inserting a new one. */
  existingReceiptId?: string | null;
}

export interface ApplyReceiptSummary {
  updated: number;
  unchanged: number;
  created: number;
  stockBumped: number;
  skipped: number;
  ignored: number;
}

export type ApplyReceiptResult =
  | { ok: true; summary: ApplyReceiptSummary }
  | { ok: false; error: string };

export async function applyReceiptAction(
  input: ApplyReceiptInput
): Promise<ApplyReceiptResult> {
  const supabase = getServerSupabase();
  const summary: ApplyReceiptSummary = {
    updated: 0,
    unchanged: 0,
    created: 0,
    stockBumped: 0,
    skipped: 0,
    ignored: 0,
  };

  // Resolve all matched products in one query.
  const matchedIds = input.lines
    .filter((l) => l.mode === "match" && l.productId)
    .map((l) => l.productId!) as string[];

  const productsById = new Map<
    string,
    ReturnType<typeof productFromRow>
  >();
  if (matchedIds.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .in("id", matchedIds);
    if (error) return { ok: false, error: `Fetch matched: ${error.message}` };
    for (const row of (data ?? []) as ProductRow[]) {
      productsById.set(row.id, productFromRow(row));
    }
  }

  const receiptLines: ReceiptLine[] = [];

  for (const line of input.lines) {
    if (line.mode === "skip") {
      summary.skipped += 1;
      receiptLines.push({
        rawName: line.rawName,
        qty: line.qty,
        price: line.price,
        productId: line.productId,
        action: "skipped",
        markReceived: false,
      });
      continue;
    }

    if (line.mode === "match" && line.productId) {
      const product = productsById.get(line.productId);
      if (!product) {
        // Product was deleted between parse and apply
        summary.skipped += 1;
        receiptLines.push({
          rawName: line.rawName,
          qty: line.qty,
          price: line.price,
          productId: null,
          action: "skipped",
          markReceived: false,
        });
        continue;
      }

      // line.price is the line total (N × per-unit). Convert to per-unit
      // before comparing to or storing in product.price (which is $/package).
      const qty = line.qty > 0 ? line.qty : 1;
      const unitPrice = line.price / qty;
      const priceChanged = Math.abs(product.price - unitPrice) > 0.005;
      let action: ReceiptLineAction = "unchanged";
      const updates: Record<string, unknown> = {};

      if (priceChanged) {
        // Decide whether this receipt's date is at-or-after the most recent
        // price-history entry. If older, we still record the historical data
        // point in priceHistory, but we DO NOT overwrite the current
        // product.price (which represents the latest known price).
        const latestHistoryDate = product.priceHistory.reduce<string | null>(
          (max, e) => (max === null || e.date > max ? e.date : max),
          null
        );
        const receiptIsNewest =
          latestHistoryDate === null || input.date >= latestHistoryDate;

        const newHistory: PriceHistoryEntry[] = [
          ...product.priceHistory,
          { date: input.date, price: unitPrice, source: "receipt" },
        ];
        updates.price_history = newHistory;

        if (receiptIsNewest) {
          updates.price = unitPrice;
          summary.updated += 1;
          action = "updated";
        } else {
          // Recorded as a historical price; current price stays as-is.
          summary.unchanged += 1;
        }
      } else {
        summary.unchanged += 1;
      }

      // Fill empty package details from the receipt's parsed info
      if (
        (!product.packageSize || product.packageSize === 0) &&
        line.newProduct &&
        line.newProduct.packageSize > 0
      ) {
        updates.package_size = line.newProduct.packageSize;
        updates.package_unit = line.newProduct.packageUnit;
      }

      // Stock bump
      let stockBump = 0;
      if (line.markReceived) {
        stockBump = line.qty || 1;
        updates.stock = (product.stock || 0) + stockBump;
        summary.stockBumped += stockBump;
      }

      // Add alias if not already present
      const alias = normalizeAlias(line.rawName);
      if (alias && !product.receiptAliases.includes(alias)) {
        updates.receipt_aliases = [...product.receiptAliases, alias];
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("products")
          .update(updates)
          .eq("id", product.id);
        if (error) {
          return {
            ok: false,
            error: `Update ${product.name}: ${error.message}`,
          };
        }
      }

      receiptLines.push({
        rawName: line.rawName,
        qty: line.qty,
        price: line.price,
        productId: product.id,
        action,
        markReceived: line.markReceived,
      });
      continue;
    }

    if (line.mode === "new") {
      const np = line.newProduct;
      if (!np?.categoryId) {
        // Silently ignored — user didn't pick a category
        summary.ignored += 1;
        receiptLines.push({
          rawName: line.rawName,
          qty: line.qty,
          price: line.price,
          productId: null,
          action: "ignored",
          markReceived: false,
        });
        continue;
      }
      if (!np.name?.trim()) {
        return {
          ok: false,
          error: `Row "${line.rawName}": name is required for new products`,
        };
      }

      const initialStock = line.markReceived ? line.qty || 1 : 0;
      // line.price is the line total; product.price is $/package, so divide.
      const qty = line.qty > 0 ? line.qty : 1;
      const unitPrice = line.price > 0 ? line.price / qty : 0;
      const priceHistory: PriceHistoryEntry[] =
        unitPrice > 0
          ? [{ date: input.date, price: unitPrice, source: "receipt" }]
          : [];
      const alias = normalizeAlias(line.rawName);

      const { data: created, error } = await supabase
        .from("products")
        .insert({
          name: np.name.trim(),
          store: input.store || null,
          category_id: np.categoryId,
          package_size: np.packageSize || 0,
          package_unit: np.packageUnit || "g",
          price: unitPrice,
          stock: initialStock,
          conversions: [],
          price_history: priceHistory,
          receipt_aliases: alias ? [alias] : [],
        })
        .select("id")
        .single();
      if (error) {
        return {
          ok: false,
          error: `Create ${np.name}: ${error.message}`,
        };
      }
      summary.created += 1;
      if (line.markReceived) summary.stockBumped += initialStock;

      receiptLines.push({
        rawName: line.rawName,
        qty: line.qty,
        price: line.price,
        productId: created.id as string,
        action: "created",
        markReceived: line.markReceived,
      });
    }
  }

  // Insert receipt row (or update the existing one if this was a reopen)
  try {
    if (input.existingReceiptId) {
      await updateReceipt(input.existingReceiptId, {
        date: input.date,
        store: input.store,
        total: input.total,
        lines: receiptLines,
      });
    } else {
      await insertReceipt({
        date: input.date,
        store: input.store,
        total: input.total,
        lines: receiptLines,
      });
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Saving receipt failed",
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/recipes");
  revalidatePath("/dashboard");
  revalidatePath("/receipts");
  return { ok: true, summary };
}

export type ParseReceiptResult =
  | { ok: true; parsed: ParsedReceipt }
  | { ok: false; error: string };

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Send a receipt photo to Claude vision and return ParsedReceipt-shaped data
 * the existing review UI already knows how to consume.
 */
export async function parseReceiptImageAction(
  base64Image: string,
  mimeType: string
): Promise<ParseReceiptResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY isn't configured on the server.",
    };
  }
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    return {
      ok: false,
      error: `Unsupported image type: ${mimeType}. Use JPEG, PNG, WebP, or GIF.`,
    };
  }
  if (!base64Image || base64Image.length < 100) {
    return { ok: false, error: "Image data missing or too small." };
  }

  const client = new Anthropic();

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 8000,
      system: OCR_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/webp"
                  | "image/gif",
                data: base64Image,
              },
            },
            {
              type: "text",
              text: "Extract the receipt's store, date, total, and every line-item.",
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(ReceiptSchema) },
    });
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      return {
        ok: false,
        error: `Claude API error (${e.status}): ${e.message}`,
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "OCR call failed",
    };
  }

  const parsed = response.parsed_output as ReceiptOcrResult | null;
  if (!parsed) {
    return {
      ok: false,
      error:
        "Claude returned an unparseable response. Try a clearer photo (better lighting, less skew, fewer cut-off lines).",
    };
  }

  const result: ParsedReceipt = {
    store: parsed.store || "",
    date: parsed.date || new Date().toISOString().slice(0, 10),
    total: parsed.total,
    items: consolidateItems(
      parsed.items.map((item) => ({
        rawName: item.rawName,
        qty: item.qty || 1,
        price: item.price,
      }))
    ),
  };

  return { ok: true, parsed: result };
}

/**
 * Safety-net dedup. The OCR prompt asks Claude to consolidate, but if it
 * doesn't, this collapses any remaining same-item duplicates. Keys on
 * (normalized rawName + per-unit price) so partial consolidations still
 * merge. Sums both qty and price across merged rows so `price` stays the
 * line total.
 */
function consolidateItems(
  items: ParsedReceipt["items"]
): ParsedReceipt["items"] {
  const merged = new Map<string, ParsedReceipt["items"][number]>();
  for (const item of items) {
    const unit = item.qty > 0 ? item.price / item.qty : item.price;
    const key = `${item.rawName.trim().toUpperCase()}|${unit.toFixed(4)}`;
    const existing = merged.get(key);
    if (existing) {
      existing.qty += item.qty;
      existing.price += item.price;
    } else {
      merged.set(key, { ...item });
    }
  }
  return [...merged.values()];
}

/**
 * Save the receipt to history without changing any product data. All lines
 * are stored with action='skipped' so a later Reopen knows nothing has been
 * applied yet and can offer to bump stock for the first time.
 */
export async function saveReceiptForLaterAction(
  input: ApplyReceiptInput
): Promise<ActionResult> {
  try {
    const receiptLines: ReceiptLine[] = input.lines.map((line) => ({
      rawName: line.rawName,
      qty: line.qty,
      price: line.price,
      productId: null,
      action: "skipped" as const,
      markReceived: false,
    }));

    if (input.existingReceiptId) {
      await updateReceipt(input.existingReceiptId, {
        date: input.date,
        store: input.store.trim(),
        total: input.total,
        lines: receiptLines,
      });
    } else {
      await insertReceipt({
        date: input.date,
        store: input.store.trim(),
        total: input.total,
        lines: receiptLines,
      });
    }

    revalidatePath("/receipts");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Save failed",
    };
  }
}

export async function deleteReceiptAction(id: string): Promise<ActionResult> {
  try {
    await deleteReceipt(id);
    revalidatePath("/receipts");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Delete failed",
    };
  }
}
