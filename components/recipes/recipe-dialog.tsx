"use client";

import {
  Camera,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createRecipeAction,
  deleteRecipeAction,
  parseRecipeImageAction,
  updateRecipeAction,
} from "@/app/(app)/recipes/actions";
import { resizeImageForUpload } from "@/lib/image-resize";
import { bestProductMatch } from "@/lib/matching";
import {
  buildCategoryPaths,
  getDescendantCategoryIds,
  type CategoryPath,
} from "@/lib/category-paths";
import { productSkuDetail } from "@/lib/format";
import type {
  Category,
  Ingredient,
  Product,
  Recipe,
  Unit,
} from "@/lib/types";
import { ALL_UNITS } from "@/lib/units";

interface DraftIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  productId: string | null;
  useAnyMatching: boolean;
  filterCategoryId: string | null;
}

function ingToDraft(ing: Ingredient): DraftIngredient {
  return {
    id: ing.id,
    name: ing.name,
    quantity: String(ing.quantity),
    unit: ing.unit,
    productId: ing.productId,
    useAnyMatching: ing.useAnyMatching,
    filterCategoryId: ing.filterCategoryId,
  };
}

function draftToIng(d: DraftIngredient): Ingredient {
  return {
    id: d.id,
    name: d.name.trim(),
    quantity: parseFloat(d.quantity) || 0,
    unit: d.unit as Unit,
    productId: d.productId,
    useAnyMatching: d.useAnyMatching,
    filterCategoryId: d.filterCategoryId,
  };
}

function blankIngredient(): DraftIngredient {
  return {
    id: crypto.randomUUID(),
    name: "",
    quantity: "",
    unit: "g",
    productId: null,
    useAnyMatching: false,
    filterCategoryId: null,
  };
}

interface RecipeDialogProps {
  recipe?: Recipe;
  products: Product[];
  categories: Category[];
  /** Called with the new recipe's id on successful create. */
  onCreated?: (id: string) => void;
  children: React.ReactElement;
}

export function RecipeDialog({
  recipe,
  products,
  categories,
  onCreated,
  children,
}: RecipeDialogProps) {
  const router = useRouter();
  const isEdit = !!recipe;

  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState(recipe?.name ?? "");
  const [batches, setBatches] = useState(String(recipe?.batches ?? 1));
  const [cookiesPerBatch, setCookiesPerBatch] = useState(
    String(recipe?.cookiesPerBatch ?? 12)
  );
  const [drafts, setDrafts] = useState<DraftIngredient[]>(
    recipe ? recipe.ingredients.map(ingToDraft) : []
  );

  // Photo-import state — only used in new-recipe mode.
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<{
    base64: string;
    dataUrl: string;
    mimeType: string;
  } | null>(null);
  const [photoImporting, setPhotoImporting] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const categoryPaths = buildCategoryPaths(categories);

  async function onPhotoFile(file: File) {
    setPhotoError(null);
    if (!file.type.startsWith("image/")) {
      setPhotoError("Pick an image file (JPEG, PNG, WebP, or GIF).");
      return;
    }
    try {
      const resized = await resizeImageForUpload(file);
      setPhotoPreview({
        base64: resized.base64,
        dataUrl: resized.dataUrl,
        mimeType: resized.mimeType,
      });
    } catch (e) {
      setPhotoError(
        e instanceof Error ? e.message : "Couldn't process the image."
      );
    }
  }

  function clearPhoto() {
    setPhotoPreview(null);
    setPhotoError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (libraryInputRef.current) libraryInputRef.current.value = "";
  }

  async function onImportPhoto() {
    if (!photoPreview) return;
    setPhotoError(null);
    setPhotoImporting(true);
    try {
      const res = await parseRecipeImageAction(
        photoPreview.base64,
        photoPreview.mimeType
      );
      if (!res.ok) {
        setPhotoError(res.error);
        return;
      }
      const { name: parsedName, productsPerBatch, ingredients } = res.parsed;
      if (parsedName) setName(parsedName);
      if (productsPerBatch !== null && productsPerBatch > 0) {
        setCookiesPerBatch(String(productsPerBatch));
      }
      // Auto-pick an existing product for each ingredient when we have a
      // confident name match. Recipe ingredient names are typically clean
      // ("Brown Sugar", "All Purpose Flour") so token-overlap on the
      // product name alone is reliable — threshold 0.6 catches obvious
      // matches without auto-picking borderline ones.
      const AUTO_PICK_THRESHOLD = 0.6;
      setDrafts(
        ingredients.map((ing) => {
          const { product, score } = bestProductMatch(ing.name, null, products);
          const autoPick = product && score >= AUTO_PICK_THRESHOLD ? product : null;
          return {
            id: crypto.randomUUID(),
            name: ing.name,
            quantity: String(ing.quantity),
            unit: ing.unit,
            productId: autoPick?.id ?? null,
            useAnyMatching: false,
            filterCategoryId: null,
          };
        })
      );
      clearPhoto();
    } catch (e) {
      setPhotoError(
        e instanceof Error
          ? `${e.message}. Try a smaller photo or a stronger Wi-Fi connection.`
          : "Couldn't reach the server. Try again."
      );
    } finally {
      setPhotoImporting(false);
    }
  }

  function reset() {
    if (recipe) {
      setName(recipe.name);
      setBatches(String(recipe.batches));
      setCookiesPerBatch(String(recipe.cookiesPerBatch));
      setDrafts(recipe.ingredients.map(ingToDraft));
    } else {
      setName("");
      setBatches("1");
      setCookiesPerBatch("12");
      setDrafts([]);
    }
    setError(null);
    setConfirmDelete(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function updateDraft(i: number, patch: Partial<DraftIngredient>) {
    setDrafts((curr) =>
      curr.map((d, idx) => (idx === i ? { ...d, ...patch } : d))
    );
  }

  function removeDraft(i: number) {
    setDrafts((curr) => curr.filter((_, idx) => idx !== i));
  }

  function addDraft() {
    setDrafts((curr) => [...curr, blankIngredient()]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Recipe name is required");
      return;
    }
    setError(null);
    const ingredients = drafts
      .filter((d) => d.name.trim() || d.quantity)
      .map(draftToIng);

    const input = {
      name: name.trim(),
      batches: parseInt(batches, 10) || 1,
      cookiesPerBatch: parseFloat(cookiesPerBatch) || 1,
      ingredients,
    };

    startTransition(async () => {
      if (recipe) {
        const res = await updateRecipeAction(recipe.id, input);
        if (res.ok) {
          setOpen(false);
          router.refresh();
        } else {
          setError(res.error);
        }
      } else {
        const res = await createRecipeAction(input);
        if (res.ok) {
          setOpen(false);
          router.refresh();
          onCreated?.(res.id);
        } else {
          setError(res.error);
        }
      }
    });
  }

  function onConfirmDelete() {
    if (!recipe) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteRecipeAction(recipe.id);
      if (res.ok) {
        setConfirmDelete(false);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={children} />
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? `Edit ${recipe.name}` : "New recipe"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            {!isEdit && (
              <PhotoImport
                cameraInputRef={cameraInputRef}
                libraryInputRef={libraryInputRef}
                photoPreview={photoPreview}
                photoError={photoError}
                photoImporting={photoImporting}
                onFile={onPhotoFile}
                onClear={clearPhoto}
                onImport={onImportPhoto}
              />
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Name<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Chunky Chocolate Chip"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Batches</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={batches}
                  onChange={(e) => setBatches(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Products per batch
                </Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={cookiesPerBatch}
                  onChange={(e) => setCookiesPerBatch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-baseline justify-between">
                <Label className="text-xs font-medium">
                  Ingredients
                  <span className="ml-2 text-muted-foreground font-normal">
                    {drafts.length}
                  </span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={addDraft}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3" />
                  Add ingredient
                </Button>
              </div>

              {drafts.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No ingredients yet — click <em>Add ingredient</em> to start.
                </p>
              ) : (
                <div className="space-y-3">
                  {drafts.map((d, i) => (
                    <IngredientEditRow
                      key={d.id}
                      draft={d}
                      products={products}
                      categories={categories}
                      categoryPaths={categoryPaths}
                      onChange={(patch) => updateDraft(i, patch)}
                      onRemove={() => removeDraft(i)}
                    />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              {isEdit ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPending}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2 sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? isEdit
                      ? "Saving…"
                      : "Creating…"
                    : isEdit
                      ? "Save"
                      : "Create"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete recipe?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{recipe?.name}</span>{" "}
            and all its ingredients will be permanently deleted. This can't be
            undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const UNLINK = "__unlink__";
const ALL_CATEGORIES = "__all__";

function IngredientEditRow({
  draft,
  products,
  categories,
  categoryPaths,
  onChange,
  onRemove,
}: {
  draft: DraftIngredient;
  products: Product[];
  categories: Category[];
  categoryPaths: CategoryPath[];
  onChange: (patch: Partial<DraftIngredient>) => void;
  onRemove: () => void;
}) {
  // If ingredient has a filterCategoryId, narrow product list to that subtree.
  const filteredProducts = (() => {
    if (!draft.filterCategoryId) return products;
    const allowed = getDescendantCategoryIds(draft.filterCategoryId, categories);
    return products.filter((p) => p.categoryId && allowed.has(p.categoryId));
  })();
  const filteredSorted = [...filteredProducts].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Make sure the currently-linked product is still selectable even if it's
  // outside the new filter, so the user doesn't accidentally lose the link.
  const currentProduct = draft.productId
    ? (products.find((p) => p.id === draft.productId) ?? null)
    : null;
  const productOptions =
    currentProduct && !filteredSorted.find((p) => p.id === currentProduct.id)
      ? [currentProduct, ...filteredSorted]
      : filteredSorted;

  const productItems = [
    { value: UNLINK, label: "— Not linked —" },
    ...productOptions.map((p) => ({ value: p.id, label: p.name })),
  ];

  const filterItems = [
    { value: ALL_CATEGORIES, label: "All products" },
    ...categoryPaths.map((c) => ({ value: c.id, label: c.label })),
  ];

  const currentFilterValue = draft.filterCategoryId ?? ALL_CATEGORIES;

  return (
    <div className="rounded-md border border-border bg-muted/20 p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={draft.quantity}
          onChange={(e) => onChange({ quantity: e.target.value })}
          placeholder="0"
          className="h-8 w-14 text-right text-xs tabular-nums"
        />
        <Select
          value={draft.unit}
          onValueChange={(v) => v && onChange({ unit: v })}
          items={ALL_UNITS.map((u) => ({ value: u, label: u }))}
        >
          <SelectTrigger size="sm" className="h-8 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_UNITS.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ingredient name"
          className="h-8 flex-1 text-xs"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          title="Remove this ingredient"
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
      <div className="flex items-center gap-1.5 pl-1">
        <Label className="text-[11px] text-muted-foreground w-14 shrink-0">
          Filter
        </Label>
        <Select
          value={currentFilterValue}
          onValueChange={(v) => {
            const newFilter = v === ALL_CATEGORIES || !v ? null : v;
            onChange({ filterCategoryId: newFilter });
          }}
          items={filterItems}
        >
          <SelectTrigger size="sm" className="h-8 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>
              <span className="italic text-muted-foreground">
                All products
              </span>
            </SelectItem>
            {categoryPaths.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5 pl-1">
        <Label className="text-[11px] text-muted-foreground w-14 shrink-0">
          Product
        </Label>
        <Select
          value={draft.productId ?? ""}
          onValueChange={(v) => {
            const newId = v === UNLINK || !v ? null : v;
            onChange({ productId: newId });
          }}
          items={productItems}
        >
          <SelectTrigger
            size="sm"
            className="h-8 flex-1 text-xs data-placeholder:italic"
          >
            <SelectValue placeholder={
              filteredSorted.length === 0 && !currentProduct
                ? "no products in this category"
                : "— pick a product —"
            } />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNLINK}>
              <span className="italic text-muted-foreground">
                — Not linked —
              </span>
            </SelectItem>
            {productOptions.map((p) => {
              const sub = productSkuDetail(p);
              const outsideFilter =
                draft.filterCategoryId &&
                !filteredSorted.find((fp) => fp.id === p.id);
              return (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex flex-col items-start gap-0 leading-snug">
                    <span className="text-sm">
                      {p.name}
                      {outsideFilter && (
                        <span className="ml-1.5 text-[10px] italic text-muted-foreground">
                          (outside filter)
                        </span>
                      )}
                    </span>
                    {sub && (
                      <span className="text-[11px] text-muted-foreground">
                        {sub}
                      </span>
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function PhotoImport({
  cameraInputRef,
  libraryInputRef,
  photoPreview,
  photoError,
  photoImporting,
  onFile,
  onClear,
  onImport,
}: {
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  libraryInputRef: React.RefObject<HTMLInputElement | null>;
  photoPreview: { dataUrl: string } | null;
  photoError: string | null;
  photoImporting: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
  onImport: () => void;
}) {
  return (
    <div className="rounded-md border-2 border-dashed border-border bg-muted/30 p-3 space-y-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        Have a photo of a recipe? Read it in to fill the form below.
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      {!photoPreview ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            disabled={photoImporting}
          >
            <Camera className="w-4 h-4" />
            Take a photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => libraryInputRef.current?.click()}
            disabled={photoImporting}
          >
            <ImageIcon className="w-4 h-4" />
            Pick from photos
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative inline-block rounded-md overflow-hidden border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview.dataUrl}
              alt="recipe preview"
              className="max-h-44 w-auto block"
            />
            <button
              type="button"
              onClick={onClear}
              disabled={photoImporting}
              title="Pick a different photo"
              className="absolute top-1.5 right-1.5 rounded-full bg-background/90 hover:bg-background border p-1.5 shadow-sm disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              <span className="sr-only">Remove photo</span>
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={photoImporting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onImport}
              disabled={photoImporting}
            >
              {photoImporting && <Loader2 className="w-4 h-4 animate-spin" />}
              {photoImporting ? "Reading recipe…" : "Read recipe →"}
            </Button>
          </div>
        </div>
      )}

      {photoError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {photoError}
        </p>
      )}

      {photoImporting && (
        <p className="text-xs text-muted-foreground italic">
          Claude is reading your recipe — usually 5–15 seconds…
        </p>
      )}
    </div>
  );
}
