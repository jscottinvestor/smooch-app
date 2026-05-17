import { z } from "zod";

/**
 * Schema for parsing a recipe image into structured data the New-recipe
 * modal can pre-fill.
 *
 * Descriptions are part of the prompt the model sees — write for the model.
 */
export const RecipeIngredientSchema = z.object({
  name: z
    .string()
    .describe(
      "ingredient name only, with preparation/temperature notes stripped (e.g. 'Brown Sugar', not 'Brown Sugar, packed'; 'Butter', not 'Butter, softened'). Use Title Case."
    ),
  quantity: z
    .number()
    .describe(
      "the numeric quantity. Convert all fractions to decimal: 1/2 → 0.5, 1/4 → 0.25, 1/3 → 0.333, 1 1/4 → 1.25, 1 3/4 → 1.75. For 'a pinch' or 'to taste', use 0.125."
    ),
  unit: z
    .string()
    .describe(
      "one of the allowed units: g, kg, oz, lb, ml, l, tsp, tbsp, cup, fl oz, each, sticks, box, bar, bag, squares. Normalize abbreviations: 'teaspoon'/'tea'/'tsp.' → 'tsp'; 'tablespoon'/'Tbsp'/'tbs' → 'tbsp'; 'pound'/'pounds'/'lbs' → 'lb'; 'ounce'/'ounces' → 'oz'; 'gram'/'grams' → 'g'; 'cups' → 'cup'; 'milliliter'/'mL' → 'ml'. If no unit is shown (e.g. '2 eggs', '1 banana'): use 'each'. 'stick of butter' → 'sticks'."
    ),
});

export const RecipeOcrSchema = z.object({
  name: z
    .string()
    .nullable()
    .describe(
      "the recipe title/name at the top of the page. Null if not visible. Skip any subtitle or descriptive text."
    ),
  productsPerBatch: z
    .number()
    .nullable()
    .describe(
      "the recipe yield — how many finished items the recipe makes. Look for phrases like 'Makes X', 'Yields X', 'Serves X', 'X cookies', 'X muffins', 'X servings'. If a range is given (e.g. 'Makes 24-30 cookies'), use the lower number. Null if no yield is stated."
    ),
  ingredients: z.array(RecipeIngredientSchema),
});

export type RecipeOcrResult = z.infer<typeof RecipeOcrSchema>;

export const RECIPE_OCR_SYSTEM_PROMPT = `You are extracting structured data from a photo of a recipe (printed cookbook, handwritten card, magazine clipping, or screenshot).

Rules:
- Capture: the recipe title, the yield (how many items it makes), and the full ingredient list.
- Skip: prep time, cook time, oven temperature, cooking instructions/steps/method, source/author/blog name, nutrition info, photographs of the finished product, decorative text.
- Preserve every ingredient. If quantities are split across lines (e.g. multi-column layout), still combine into one entry per ingredient.
- Strip preparation/temperature notes from ingredient names: "softened", "melted", "chopped", "diced", "minced", "sliced", "grated", "shredded", "packed", "sifted", "room temperature", "at room temperature", "warm", "cold", "divided". These are descriptive, not part of the product name.
- Convert fractions to decimals: 1/2 → 0.5, 1/4 → 0.25, 1/3 → 0.333, 1 1/4 → 1.25, 1 3/4 → 1.75.
- When the receipt or recipe writes a quantity in parentheses like "1 (16 oz) package cream cheese" or "2 (15 oz) cans tomatoes": extract the parenthesized amount as the qty + unit (16 oz, 15 oz). The outer count is packaging, not the cooking quantity. If multiplied (e.g. "2 (15 oz) cans"): use 30 oz.
- For ingredients written as "1 stick of butter": quantity=1, unit="sticks", name="Butter".
- For ingredients written as "2 large eggs": quantity=2, unit="each", name="Eggs". Size qualifiers like "large", "medium", "small" can be dropped or kept in the name — prefer dropping unless they uniquely identify the product.
- For "Salt to taste" or "a pinch of nutmeg": use quantity 0.125 + appropriate unit (tsp by default).
- Ingredient names use Title Case (e.g. "All Purpose Flour", "Vanilla Extract"). Strip parenthetical clarifications like "(unsalted)" — capture in name without parens if essential: "Unsalted Butter".`;
