import type { Product } from "./types";

/** Normalize an alias for storage & comparison: uppercase, single-space, trimmed. */
export function normalizeAlias(s: string): string {
  return (s || "").toUpperCase().replace(/\s+/g, " ").trim();
}

/** Token-overlap similarity with substring fuzz, 0..1. */
export function similarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const tokensA = new Set(na.split(" ").filter((t) => t.length > 1));
  const tokensB = new Set(nb.split(" ").filter((t) => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let common = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) {
      common += 1;
    } else {
      for (const t2 of tokensB) {
        if (t.length >= 3 && t2.includes(t)) {
          common += 0.5;
          break;
        }
        if (t2.length >= 3 && t.includes(t2)) {
          common += 0.5;
          break;
        }
      }
    }
  }
  return common / Math.max(tokensA.size, tokensB.size);
}

export interface MatchResult {
  product: Product | null;
  score: number;
  viaAlias?: boolean;
}

/**
 * Find the best product match for a raw receipt line name.
 * Alias-first (score 1.0 on exact alias hit), then token similarity with a small store-match bonus.
 */
export function bestProductMatch(
  rawName: string,
  receiptStore: string | null,
  products: Product[]
): MatchResult {
  const normalizedRaw = normalizeAlias(rawName);
  if (normalizedRaw) {
    for (const p of products) {
      if (!p.receiptAliases || p.receiptAliases.length === 0) continue;
      if (p.receiptAliases.includes(normalizedRaw)) {
        return { product: p, score: 1, viaAlias: true };
      }
    }
  }
  const candidates = products.map((p) => {
    const nameScore = similarity(rawName, p.name);
    let storeBonus = 0;
    if (receiptStore && p.store) {
      const a = receiptStore.toLowerCase().replace(/[^a-z0-9]/g, "");
      const b = p.store.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (a && b && (a.includes(b) || b.includes(a))) {
        storeBonus = 0.15;
      }
    }
    return {
      product: p,
      nameScore,
      score: Math.min(1, nameScore + storeBonus),
    };
  });
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];
  if (!top || top.nameScore === 0) return { product: null, score: 0 };
  return { product: top.product, score: top.score };
}

export function classifyMatch(score: number): "high" | "low" | "none" {
  if (score >= 0.7) return "high";
  if (score >= 0.35) return "low";
  return "none";
}
