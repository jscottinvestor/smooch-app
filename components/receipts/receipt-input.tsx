"use client";

import { Camera, ImageIcon, Loader2, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseReceiptImageAction } from "@/app/(app)/receipts/actions";
import { resizeImageForUpload } from "@/lib/image-resize";
import type { ParsedReceipt } from "@/lib/receipt-parser";

export function ReceiptInput({
  onParsed,
}: {
  onParsed: (parsed: ParsedReceipt) => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    dataUrl: string;
    base64: string;
    mimeType: string;
    name: string;
    sizeKb: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file (JPEG, PNG, WebP, or GIF).");
      return;
    }
    try {
      const resized = await resizeImageForUpload(file);
      setPreview({
        dataUrl: resized.dataUrl,
        base64: resized.base64,
        mimeType: resized.mimeType,
        name: file.name,
        sizeKb: resized.sizeKb,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't process the image.");
    }
  }

  function clearPreview() {
    setPreview(null);
    setError(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (libraryInputRef.current) libraryInputRef.current.value = "";
  }

  function parse() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await parseReceiptImageAction(preview.base64, preview.mimeType);
        if (res.ok) {
          onParsed(res.parsed);
        } else {
          setError(res.error);
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? `${e.message}. Try a smaller photo or a stronger Wi-Fi connection.`
            : "Couldn't reach the server. Try again."
        );
      }
    });
  }

  return (
    <Card className="shadow-sm shadow-foreground/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle
          className="font-display text-xl font-normal"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          Snap a receipt
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Take a photo or pick one from your camera roll. The app uses Claude to
          read the items, then lets you review before applying.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {!preview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="w-5 h-5" />
              <span className="text-sm font-medium">Take a photo</span>
              <span className="text-[10px] text-muted-foreground -mt-1">
                Mobile only
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => libraryInputRef.current?.click()}
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Pick from photos</span>
            </Button>
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="relative inline-block rounded-md overflow-hidden border bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.dataUrl}
                alt={preview.name}
                className="max-h-72 w-auto block"
              />
              <button
                type="button"
                onClick={clearPreview}
                disabled={isPending}
                title="Pick a different photo"
                className="absolute top-1.5 right-1.5 rounded-full bg-background/90 hover:bg-background border p-1.5 shadow-sm disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span className="sr-only">Remove photo</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {preview.name} · {preview.sizeKb} KB
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {preview && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearPreview}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={parse}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {isPending ? "Reading receipt…" : "Read receipt →"}
            </Button>
          </div>
        )}

        {isPending && (
          <p className="text-xs text-muted-foreground italic">
            Claude is reading your receipt — usually 5–15 seconds…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
