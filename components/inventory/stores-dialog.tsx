"use client";

import { Check, Pencil, Plus, Store as StoreIcon, Trash2, X } from "lucide-react";
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
  createStoreAction,
  deleteStoreAction,
  renameStoreAction,
} from "@/app/(app)/inventory/actions";
import type { Product } from "@/lib/types";

interface Store {
  id: string;
  name: string;
}

export function StoresDialog({
  stores,
  products,
  children,
}: {
  stores: Store[];
  products: Product[];
  children: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const productCountFor = (storeName: string) =>
    products.filter((p) => p.store === storeName).length;

  function add() {
    setError(null);
    const trimmed = newName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await createStoreAction(trimmed);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setNewName("");
      router.refresh();
    });
  }

  function startEdit(s: Store) {
    setEditingId(s.id);
    setEditingName(s.name);
    setError(null);
  }

  function commitEdit() {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const res = await renameStoreAction(editingId, trimmed);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditingId(null);
      setEditingName("");
      router.refresh();
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteStoreAction(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setNewName("");
          cancelEdit();
          setError(null);
        }
      }}
    >
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StoreIcon className="w-5 h-5" />
            Manage stores
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2">
          Add the stores you shop at, rename them, or delete ones you no longer
          use. Renaming updates every product tagged with the old name.
        </p>

        {/* Add new */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New store name (e.g., Costco)"
            disabled={pending}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={add}
            disabled={pending || !newName.trim()}
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {/* List */}
        {stores.length === 0 ? (
          <p className="text-sm italic text-muted-foreground py-4">
            No stores yet. Add one above to start using it on products.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {stores.map((s) => {
              const count = productCountFor(s.name);
              const editing = editingId === s.id;
              return (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  {editing ? (
                    <>
                      <Input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        disabled={pending}
                        className="h-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitEdit();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEdit();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={commitEdit}
                        disabled={pending || !editingName.trim()}
                        title="Save"
                      >
                        <Check className="w-4 h-4 text-emerald-700" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={cancelEdit}
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm leading-snug truncate">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {count === 0
                            ? "no products"
                            : `${count} product${count === 1 ? "" : "s"}`}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => startEdit(s)}
                        title="Rename"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => remove(s.id)}
                        disabled={pending || count > 0}
                        title={
                          count > 0
                            ? `Can't delete — ${count} product${count === 1 ? "" : "s"} use${count === 1 ? "s" : ""} this store`
                            : "Delete"
                        }
                      >
                        <Trash2
                          className={
                            count > 0
                              ? "w-3.5 h-3.5 opacity-40"
                              : "w-3.5 h-3.5 text-destructive"
                          }
                        />
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
