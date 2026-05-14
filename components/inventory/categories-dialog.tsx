"use client";

import { Check, Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createCategoryAction,
  deleteCategoryAction,
  renameCategoryAction,
} from "@/app/(app)/inventory/actions";
import type { Category, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOP_ORDER = ["DRY INGREDIENTS", "WET INGREDIENTS", "MIX-INS"] as const;

export function CategoriesDialog({
  categories,
  products,
  children,
}: {
  categories: Category[];
  products: Product[];
  children: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const productCountFor = (catId: string) =>
    products.filter((p) => p.categoryId === catId).length;
  const childCountFor = (catId: string) =>
    categories.filter((c) => c.parentId === catId).length;

  const topRank = (label: string) => {
    const idx = (TOP_ORDER as readonly string[]).indexOf(label);
    return idx === -1 ? TOP_ORDER.length : idx;
  };
  const topLevels = categories
    .filter((c) => !c.parentId)
    .sort(
      (a, b) => topRank(a.name) - topRank(b.name) || a.name.localeCompare(b.name)
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setGlobalError(null);
      }}
    >
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage categories</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Categories nest under the three top-level groups. A category must be
          empty before it can be deleted.
        </p>

        {globalError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {globalError}
          </p>
        )}

        <div className="space-y-3">
          {topLevels.map((top) => {
            const subs = categories
              .filter((c) => c.parentId === top.id)
              .sort((a, b) => a.name.localeCompare(b.name));

            return (
              <div
                key={top.id}
                className="rounded-md border bg-card overflow-hidden"
              >
                <CategoryRow
                  cat={top}
                  depth={0}
                  productCount={productCountFor(top.id)}
                  childCount={childCountFor(top.id)}
                  onError={setGlobalError}
                />
                {subs.map((sub) => (
                  <CategoryRow
                    key={sub.id}
                    cat={sub}
                    depth={1}
                    productCount={productCountFor(sub.id)}
                    childCount={childCountFor(sub.id)}
                    onError={setGlobalError}
                  />
                ))}
                <AddRow parentId={top.id} onError={setGlobalError} />
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t">
          <AddRow parentId={null} onError={setGlobalError} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryRow({
  cat,
  depth,
  productCount,
  childCount,
  onError,
}: {
  cat: Category;
  depth: number;
  productCount: number;
  childCount: number;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(cat.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const total = productCount + childCount;
  const deletable = total === 0;

  function commitRename() {
    if (draft.trim() === cat.name) {
      setRenaming(false);
      return;
    }
    onError(null);
    startTransition(async () => {
      const res = await renameCategoryAction(cat.id, draft);
      if (res.ok) {
        setRenaming(false);
        router.refresh();
      } else {
        onError(res.error);
        setDraft(cat.name);
      }
    });
  }

  function commitDelete() {
    onError(null);
    startTransition(async () => {
      const res = await deleteCategoryAction(cat.id);
      if (res.ok) {
        setConfirmingDelete(false);
        router.refresh();
      } else {
        onError(res.error);
        setConfirmingDelete(false);
      }
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm",
        depth === 0
          ? "bg-muted/40 font-display"
          : "border-t border-border/60",
        depth === 1 && "pl-8"
      )}
    >
      {renaming ? (
        <>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(cat.name);
                setRenaming(false);
              }
            }}
            autoFocus
            className="h-7 text-xs flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={commitRename}
            disabled={isPending}
            title="Save"
          >
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setDraft(cat.name);
              setRenaming(false);
            }}
            disabled={isPending}
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </>
      ) : confirmingDelete ? (
        <>
          <span className="flex-1 text-destructive">Delete "{cat.name}"?</span>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={commitDelete}
            disabled={isPending}
            className="text-xs"
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setConfirmingDelete(false)}
            disabled={isPending}
            className="text-xs"
          >
            Cancel
          </Button>
        </>
      ) : (
        <>
          <span className={cn("flex-1 truncate", depth === 0 && "lowercase")}>
            {cat.name}
          </span>
          <span
            className="text-[11px] text-muted-foreground tabular-nums shrink-0"
            title={`${productCount} product${productCount === 1 ? "" : "s"}, ${childCount} sub-categor${childCount === 1 ? "y" : "ies"}`}
          >
            {productCount > 0 && (
              <span>
                {productCount}p
                {childCount > 0 ? " · " : ""}
              </span>
            )}
            {childCount > 0 && <span>{childCount}c</span>}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setRenaming(true)}
            title="Rename"
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="w-3 h-3" />
            <span className="sr-only">Rename</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              if (deletable) {
                setConfirmingDelete(true);
              } else {
                onError(
                  `${cat.name} still has ${total > 0 ? `${productCount > 0 ? `${productCount} product${productCount === 1 ? "" : "s"}` : ""}${productCount > 0 && childCount > 0 ? " and " : ""}${childCount > 0 ? `${childCount} sub-categor${childCount === 1 ? "y" : "ies"}` : ""}` : "items"}. Remove them first.`
                );
              }
            }}
            title={deletable ? "Delete" : "Can't delete (not empty)"}
            className={cn(
              "text-muted-foreground",
              deletable ? "hover:text-destructive" : "opacity-30 cursor-not-allowed"
            )}
          >
            <X className="w-3.5 h-3.5" />
            <span className="sr-only">Delete</span>
          </Button>
        </>
      )}
    </div>
  );
}

function AddRow({
  parentId,
  onError,
}: {
  parentId: string | null;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function commit() {
    if (!name.trim()) {
      setAdding(false);
      setName("");
      return;
    }
    onError(null);
    startTransition(async () => {
      const res = await createCategoryAction(name, parentId);
      if (res.ok) {
        setName("");
        setAdding(false);
        router.refresh();
      } else {
        onError(res.error);
      }
    });
  }

  const label =
    parentId === null ? "+ Add top-level group" : "+ Add sub-category";

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className={cn(
          "w-full text-left text-xs text-muted-foreground hover:text-foreground py-1.5 px-3",
          parentId !== null && "border-t border-border/60"
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2",
        parentId !== null && "border-t border-border/60 pl-8"
      )}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setName("");
            setAdding(false);
          }
        }}
        placeholder={
          parentId === null ? "Group name" : "Category name"
        }
        autoFocus
        className="h-7 text-xs flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={commit}
        disabled={isPending}
        title="Add"
      >
        <Check className="w-3.5 h-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => {
          setName("");
          setAdding(false);
        }}
        disabled={isPending}
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
