"use client";

export type ApiResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

/** Small fetch wrapper that always resolves to a result with a readable error. */
export async function api(path: string, method: string, body?: unknown): Promise<ApiResult> {
  try {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const res = await fetch(path, {
      method,
      headers: body === undefined || isForm ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, error: typeof data.error === "string" ? data.error : "Something went wrong. Try again." };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection and try again." };
  }
}

/** Shrinks a phone photo to a JPEG under about 450 KB before upload. */
export function shrinkPhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let max = 1000;
      let q = 0.82;
      const attempt = (n: number) => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * r));
        c.height = Math.max(1, Math.round(img.height * r));
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("encode"));
            if (blob.size <= 450_000 || n >= 8) return blob.size <= 690_000 ? resolve(blob) : reject(new Error("size"));
            if (q > 0.5) q -= 0.1;
            else max = Math.round(max * 0.8);
            attempt(n + 1);
          },
          "image/jpeg",
          q,
        );
      };
      attempt(0);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("read"));
    };
    img.src = url;
  });
}
