# Cookie Business App — Specification

## Purpose

A personal web app for a home cookie-baking business. Tracks recipes, ingredient inventory, and grocery receipts so the owner can:

1. Know the **exact cost per cookie** for each recipe
2. Know **how many batches** can be produced from current inventory
3. **Update prices and stock** automatically from grocery receipts (eventually via OCR)

## Users

Single user (the owner's wife). Used on both **desktop and phone**. Personal, low-traffic, no auth needed beyond a simple gate to prevent strangers from finding it.

## Reference Prototype

A working HTML/JS prototype is included as `prototype.html` (~3000 lines, single file). It captures the intended UX, data model, and behavior in working form. **Read it.** When the spec is ambiguous, the prototype is the source of truth. When the prototype has an obvious limitation (e.g., the receipt parser uses regex), follow the spec's modernized version.

---

## Architecture

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (Postgres)
- **Hosting**: Vercel
- **OCR / smart matching**: Anthropic API (Claude) — see Receipt Processing section
- **PWA**: deferred to the last phase — manifest + service worker added after the app is otherwise feature-complete and stable. Don't build PWA infrastructure during early phases (service worker caching makes development painful).

## Data Model

All entities live in Supabase tables. Use UUIDs for primary keys. Add `created_at` / `updated_at` timestamps.

### `products`
The catalog. Each row is a specific SKU (e.g., "KS Unsalted Butter from Costco, 4 lb").

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g., "Unsalted Butter" |
| store | text | e.g., "Costco". Nullable. |
| category_id | uuid | FK to `categories`. Nullable. |
| package_size | numeric | E.g., 4 (means 4 lb if package_unit='lb') |
| package_unit | text | One of the allowed units (see Units section) |
| price | numeric | $/package |
| stock | numeric | **In packages, not in package_unit.** E.g., 2.5 = 2.5 bags. Fractions allowed. |
| conversions | jsonb | Array of `{fromQty, fromUnit, toQty, toUnit}`. User-defined cross-dimensional conversions (e.g., 1 cup flour = 120 g). |
| price_history | jsonb | Array of `{date, price, source}` where source is 'manual' or 'receipt' |
| receipt_aliases | text[] | Normalized (uppercase, single-space) raw receipt text strings that map to this product |

### `categories`
Hierarchical. Top-level groups are the three roots: `DRY INGREDIENTS`, `WET INGREDIENTS`, `MIX-INS`. Sub-categories nest under them.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g., "Sugar", "Butter" |
| parent_id | uuid | FK to `categories`. NULL for top-level groups. |

### `recipes`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g., "Chunky Chocolate Chip" |
| batches | integer | Default 1 |
| cookies_per_batch | numeric | **Fractional allowed** (e.g., 12.5) |
| ingredients | jsonb | Array of ingredient objects (see below) |

Each ingredient is:
```ts
{
  id: string,
  name: string,            // display name, e.g., "Brown Sugar"
  quantity: number,
  unit: string,
  productId: string | null,    // FK reference to products; null = unlinked
  useAnyMatching: boolean,     // legacy; can drop if migrating
  filterCategoryId: string | null  // narrows the dropdown's product list in the Edit modal only
}
```

### `receipts`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| date | date | |
| store | text | |
| total | numeric | Nullable |
| lines | jsonb | Array of receipt line objects |

Each line is:
```ts
{
  rawName: string,
  qty: number,
  price: number,
  productId: string | null,
  action: 'updated' | 'unchanged' | 'created' | 'skipped' | 'ignored',
  markReceived: boolean
}
```

---

## Units

Whitelist of allowed units: `g`, `kg`, `oz`, `lb`, `ml`, `l`, `tsp`, `tbsp`, `cup`, `fl oz`, `each`, `sticks`, `box`, `bar`, `bag`, `squares`

**Dimension families**:
- `weight`: g, kg, oz, lb (auto-converted via factors)
- `volume`: ml, l, tsp, tbsp, cup, fl oz (auto-converted via factors)
- `count`: each, sticks, box, bar, bag, squares (each is its own dimension; no auto-conversion)

**Built-in cross-dimensional conversions** (apply automatically when product name matches):
- "butter" in name → 1 stick = 113.4 g (US standard, ¼ lb)

**User-defined per-product conversions** stored in `products.conversions` handle other cross-dimensional cases (e.g., 1 cup flour = 120 g).

The prototype has `convertQuantity(qty, fromUnit, toUnit, product)` which encapsulates all this logic — port it directly.

---

## UI Structure

Four tabs: **Dashboard | Recipes | Inventory | Receipts**

### Dashboard
- Three metric cards: Inventory value, Recipes count, Out-of-stock count
- Recipe table: cost per batch / cost per cookie / batches possible from current stock / limiting ingredient

### Recipes Tab
- Pill-chip selector at the top — one chip per recipe, click to switch. Only the selected recipe shows.
- Card for the selected recipe:
  - Header: name + saved batches × cookies/batch
  - "Make N batches" multiplier input (transient — does not modify the saved recipe, just rescales the display)
  - 5-column ingredient table: **Ingredient | Product | Quantity | Cost | In stock?**
  - Ingredients grouped by top-level category (DRY / WET / MIX-INS)
  - Product column has a dropdown showing ALL products (not filtered by category — the Edit modal handles category filtering separately)
  - Cost shows `—` (with hover tooltip) when units can't convert
  - In stock? shows "Yes" (green) or "Short N pkg" (red) with tooltip explaining the unit math
  - Footer: Total recipe cost + Cost per cookie
  - When some lines can't be costed, totals show with `~` prefix and a "* Partial total" footnote, plus a yellow warning banner above the table
  - Compact Edit / × buttons in the header

### Inventory Tab
- Three sections (DRY / WET / MIX-INS), each with its own table for vertical alignment
- 9 columns, in this order: **Product | Store | Package | Price | $/unit | Stock | Status | History | Actions**
- Stock displayed as `[N] pkg` with editable input
- Status: OK / Low (<0.25 pkg) / Out (≤0)
- Empty sub-categories show a "+ Add product" inline action
- "Manage categories" button opens a hierarchical tree editor
- "+ New product" button
- **No seed button** — catalog auto-seeds on first run

### Receipts Tab
- Two-screen flow:
  1. **Input screen**: textarea (for paste; in production also accepts image upload)
  2. **Review screen**: single editable table — see Receipt Processing section below
- List of past receipts with View / Delete actions

---

## Receipt Processing

This is where the biggest changes from the prototype happen. The prototype uses regex parsing and string-similarity matching. Production should use Claude API.

### Input
- User uploads a photo of a receipt (mobile camera) or PDF
- Show "Try sample" button that loads a built-in sample (see prototype's `loadSampleReceipt`) — useful for demos and testing the flow without uploading

### Parsing (LLM-based)
Send the image (or text) to Claude API. Prompt should ask for structured output:
```json
{
  "store": "...",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "items": [
    { "rawName": "...", "qty": 1, "price": 0.00, "packageSize": null, "packageUnit": null }
  ]
}
```
The LLM should be asked to also extract package size and unit when present in the line text (e.g., "KS UNSALTED BUTTER 4LB" → packageSize: 4, packageUnit: "lb"). This replaces the prototype's `extractPackageInfo` regex.

### Matching (alias-first, then LLM)
For each parsed item:
1. Check `products.receipt_aliases` for an exact (normalized) match → instant hit, score 1.0
2. If no alias hit, call Claude with the rawName + list of existing products (just names + categories), ask: "which product, if any, is this most likely to be? Reply with the product ID or 'none'."
3. If still no confident match, the row falls into "new product" mode

### Review Screen
A single editable table — port from prototype's `renderReceiptReview`:
- **Top header**: Store (text input with datalist of existing stores), Date (picker), Total
- **Summary line**: `X matched · Y new products · Z will be ignored · W skipped`
- **Table** with 5 columns: Receipt item | Price (editable) | Product | Δ Price | Action
- **Matched rows**: product dropdown showing all products, with "Create as new" and "Skip" options at the top
- **New (unmatched) rows**: inline form with Category dropdown, Name, Pkg size, Unit, Price. Also a small "Match to existing…" link at the top-right that converts the row to match mode for picking an existing product.
- **Skipped rows**: dimmed (45% opacity), shows a Restore button
- **Will-be-ignored rows** (mode='new' with no category picked): lightly dimmed (75% opacity) — silently ignored on apply, no error

### Action checkboxes per row
- **+N pkg** checkbox (default checked) — on apply, bump product stock by `qty` packages
- × button → set mode to 'skip'

### Apply behavior
- **Matched rows**: update product price (with priceHistory entry), bump stock if checkbox is checked, **add the rawName as an alias** on the product (if not already there)
- **New rows with category**: create new product with all fields populated, including the rawName as the first alias, initial stock = qty
- **New rows without category**: silently ignored, recorded with action='ignored' in receipt history
- **Skipped rows**: recorded with action='skipped', no changes applied
- **Auto-fill empty package details on matched products**: if a matched product has `package_size = 0` (placeholder), fill it from the receipt's parsed package info. Don't overwrite existing data.
- **Don't overwrite product.store** with the receipt's store on matched rows.

### Summary message
`Done. 8 prices updated, 1 new product created, 9 packages added to stock, 2 ignored.`

---

## Seed Data

On a **truly fresh install** (no data in the database for the user), auto-seed silently with no prompts.

### Seed categories
Three top-level groups + sub-categories listed below. Many sub-categories are "category-only" with no products under them — the user adds real products later via receipts or the Inventory tab.

Top-level: `DRY INGREDIENTS`, `WET INGREDIENTS`, `MIX-INS`

| Category | Top Level | Seed products |
|---|---|---|
| Sugar | DRY | Brown Sugar, Confectioner's Sugar, Cane Sugar (all `g`) |
| Flour | DRY | All Purpose Flour, Gluten Free Flour (`g`) |
| Salt | DRY | (category only) |
| Baking Powder | DRY | (category only) |
| Baking Soda | DRY | (category only) |
| Corn Starch | DRY | (category only) |
| Cocoa Powder | DRY | (category only) |
| Coffee | DRY | (category only) |
| Cinnamon | DRY | (category only) |
| Cream of Tartar | DRY | (category only) |
| Butter | WET | Unsalted Butter, Salted Butter, Plant Butter (`sticks`) |
| Oil | WET | Extra Virgin Olive Oil, Coconut Oil (`tbsp`) |
| Food Coloring | WET | Red Gel Food Coloring (`tsp`) |
| Eggs | WET | (category only) |
| Water | WET | (category only) |
| Vanilla | WET | (category only) |
| White Vinegar | WET | (category only) |
| Peanut Butter | WET | (category only) |
| Brownie Mix | MIX-INS | (category only) |

Plus products directly under MIX-INS (no intermediate category): Milk Chocolate, Semi-Sweet Chocolate Chips, Dark Chocolate Wafers, Hershey Kisses, Dark Chocolate, Vanilla Candy Coating, Peanut Butter Chips, Reese's PB Cups, Cream Cheese Flavored Chips, White Chocolate, White Melting Wafers — **all in `g`**.

Seed products have packageSize=0 and price=0 by default. The user fills these in via receipts or manual entry.

### Seed recipes
Two recipes auto-seed: see `SEED_RECIPES` in the prototype. **All ingredients start unlinked** (productId: null) but with `filterCategoryId` set from the seed's `categoryName`. User picks each product from the dropdown.

- **Chunky Chocolate Chip** — 1 batch × 12.5 cookies, 14 ingredients
- **Double Brownie Blast** — 1 batch × 10 cookies, 19 ingredients

---

## Behaviors and small details to preserve

- **Stock thresholds**: Out at ≤0, Low at <0.25 pkg, OK ≥0.25. Stock is fractional (e.g., 1.5 = one and a half bags).
- **Inventory value**: `Σ stock × price` (each package costs `price`).
- **Max batches**: for each ingredient, `unitsAvailable = stock × packageSize`, then `unitsAvailable / needInPackageUnit` per batch. Min across ingredients = max batches.
- **Recipe batch multiplier**: page-state only, not persisted. Resets on reload. Shows "reset" button when value differs from saved.
- **Recipe selector default**: first recipe in order. Saving a new recipe auto-selects it. Deleting the selected one falls back to the first remaining.
- **Custom two-line dropdown** (product picker): shows name on top, store · package size below. Important for distinguishing same-name products from different stores. The prototype's `customProductDropdown` uses delegated click handlers with `data-cdd-idx` attributes — port the pattern (avoid inline `onclick` with JSON.stringify, which broke quoting before).
- **Receipt aliases auto-save**: every applied (non-skipped, non-ignored) row adds its rawName as an alias on the matched/created product, normalized (UPPERCASE, single-space, trimmed). Aliases are checked first in matching; an exact hit returns score 1.0 immediately.
- **Empty inventory categories**: show as a section with "+ Add product" inline button.
- **Mobile**: phone is a first-class target. Everything should work at 380px viewport. The recipe ingredient table may need to stack columns on narrow screens.

## Things NOT in the prototype that should exist in production

- **Authentication**: a single password-gate (a simple hardcoded password compared via env var) or Supabase Auth with a single account. Don't over-engineer it — this is for one person.
- **OCR via Claude API**: replace the prototype's regex parser.
- **LLM-assisted matching**: replace `bestProductMatch`'s string similarity with a Claude API call for confident matches when alias lookup fails.
- **Receipt image upload**: the file input + preview, then send the image bytes to Claude. Mobile camera capture (`capture="environment"`) on the input.
- **PWA (last phase only)**: manifest + service worker + icons to enable "Add to Home Screen." Build the plain web app first; add PWA infrastructure only after the rest is stable.
