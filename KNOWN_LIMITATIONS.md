# Known Limitations of the Prototype

These are things deliberately faked or simplified in `prototype.html` that should be properly implemented in the Next.js port.

## Receipt parsing
- **What the prototype does**: Regex-based text parser (`parseReceiptText`) that handles a specific format of pasted receipt text. Works on the bundled sample, brittle on anything else.
- **What production should do**: Accept an image upload (or PDF) from the user, send to the Anthropic API with a vision-capable model, ask for structured JSON output. The prototype's `extractPackageInfo` regex for "4LB" / "16OZ" / "24CT" detection should ALSO move into the LLM prompt — much more robust there.

## Product matching
- **What the prototype does**: `similarity()` function uses token overlap with substring fuzz. Plus alias-first lookup (which IS the right approach — keep it).
- **What production should do**: Keep the alias-first lookup verbatim — that's already correct. When alias lookup misses, instead of `similarity()`, call Claude with the rawName + a compact list of existing product names: "Is this any of these products? Reply with product ID or 'no match'." Aliases will accumulate over time, reducing the LLM call frequency.

## Data persistence
- **What the prototype does**: `window.storage.get/set` to browser local storage. Single-device, single-browser.
- **What production should do**: Supabase Postgres. Tables per the spec. Real-time subscriptions optional but not required. No need for row-level security if you're using a simple shared-password gate (everything is "the user's" data).

## Authentication
- **What the prototype does**: None.
- **What production should do**: A single shared password gated by a Next.js middleware, or Supabase Auth with one account. Don't over-engineer — this is one user.

## Unit conversions
- **What the prototype does**: 
  - Within same dimension (weight↔weight, volume↔volume): auto via factor tables. Correct.
  - Cross-dimension via product-name heuristic: only "butter sticks → 113.4 g" is built in. Correct.
  - User-defined per-product conversions (jsonb array on products). Correct.
- **What production should do**: Port verbatim. The `convertQuantity` function is one of the more carefully-thought-through bits of the prototype.

## Mobile
- **What the prototype does**: Mostly desktop-styled with one breakpoint (760px) in the recipe card. Works on phone but not optimized.
- **What production should do**: Properly responsive throughout. The two big areas needing attention on phone:
  - The 5-column recipe ingredient table needs to either become 2 lines per row OR have horizontal scroll on narrow viewports.
  - The receipt review table is even denser (5 columns with inline form in one of them). Will need a card-style mobile view, not a table.

## Things explicitly NOT bugs / NOT to "fix"
These are deliberate behaviors from iterating with the user — preserve them:

- **Stock is in packages, not units.** `stock: 2` means 2 bags, not 2 grams. This was a deliberate change in v13 of the prototype.
- **Categories vs. products distinction.** Single-product categories like Salt, Vanilla, Eggs are CATEGORIES with no product underneath by default. The user adds specific brands. Don't auto-create a "Salt" product under the "Salt" category.
- **Recipe ingredients start unlinked.** Seeded recipes have ingredients with `productId: null` and `filterCategoryId` set. The user manually picks each product from the dropdown. This is intentional — every household uses different brands.
- **Categories don't appear in recipe ingredient dropdowns.** Only products. The prototype's recipe card dropdown shows ALL products (not filtered by category) so the user can swap across categories. The Edit modal is where category filtering applies.
- **Receipt's store doesn't overwrite matched product's store.** Even if a Costco receipt matches a "Walmart Brown Sugar" product, leave the product's store alone. The receipt's store is only used for newly created products.
- **Untouched unmatched receipt rows are silently ignored.** Don't block apply with errors — if the user didn't pick a category, they probably bought something non-baking and want it ignored.
