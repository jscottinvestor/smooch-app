/**
 * Client-side image resize/recompress for upload.
 *
 * Phone photos are 3–10MB raw; Next.js server actions cap at 1MB by default
 * (configurable via next.config). We re-encode as JPEG with a long-edge cap
 * before sending so we stay safely under the limit and use less Claude
 * input-token cost. Text in receipts stays sharp at this resolution.
 */
export async function resizeImageForUpload(
  file: File,
  options: { maxLongEdge?: number; quality?: number } = {}
): Promise<{
  base64: string;
  dataUrl: string;
  mimeType: string;
  sizeKb: number;
  width: number;
  height: number;
}> {
  const maxLongEdge = options.maxLongEdge ?? 2000;
  const quality = options.quality ?? 0.85;

  const dataUrlIn = await readAsDataURL(file);
  const img = await loadImage(dataUrlIn);

  const longest = Math.max(img.width, img.height);
  const scale = longest > maxLongEdge ? maxLongEdge / longest : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not supported in this browser.");
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1] ?? "";
  const sizeBytes = Math.round((base64.length * 3) / 4);

  return {
    base64,
    dataUrl,
    mimeType: "image/jpeg",
    sizeKb: Math.round(sizeBytes / 1024),
    width: w,
    height: h,
  };
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read the image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          "Couldn't decode that image. Try a JPEG or PNG (iPhone HEIC may need conversion)."
        )
      );
    img.src = src;
  });
}
