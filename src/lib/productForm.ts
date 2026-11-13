import { CATEGORIES, cleanText, isUuid } from "./format";

export const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 700_000;
export const MAX_REQUEST_BYTES = 4_000_000;

export type ParsedProduct = {
  title: string;
  price_paise: number;
  category: string;
  description: string;
  keep: string[];
  files: Buffer[];
};

const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/** Reads and validates the multipart form sent by the product form. */
export async function parseProductForm(req: Request): Promise<{ ok: true; data: ParsedProduct } | { ok: false; error: string; status: number }> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_REQUEST_BYTES) return { ok: false, status: 413, error: "The photos are too large. Use fewer or smaller photos." };

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { ok: false, status: 400, error: "Could not read the form." };
  }

  const title = cleanText(form.get("title"), 100);
  const description = cleanText(form.get("description"), 1200);
  const category = cleanText(form.get("category"), 40);
  const price = Number.parseFloat(String(form.get("price") ?? ""));
  if (title.length < 3) return { ok: false, status: 400, error: "Give the product a name." };
  if (!(CATEGORIES as readonly string[]).includes(category)) return { ok: false, status: 400, error: "Choose a category." };
  if (!Number.isFinite(price) || price <= 0 || price > 10_000_000) return { ok: false, status: 400, error: "Enter a price above zero." };

  const keep = form.getAll("keep").map(String).filter(isUuid);
  const files: Buffer[] = [];
  for (const f of form.getAll("photos")) {
    if (typeof f === "string" || f.size === 0) continue;
    if (f.size > MAX_PHOTO_BYTES) return { ok: false, status: 413, error: "One photo is too large. Try a smaller one." };
    const buf = Buffer.from(await f.arrayBuffer());
    if (!isJpeg(buf)) return { ok: false, status: 400, error: "Photos must be JPEG images." };
    files.push(buf);
  }
  if (keep.length + files.length < 1) return { ok: false, status: 400, error: "Add at least one photo." };
  if (keep.length + files.length > MAX_PHOTOS) return { ok: false, status: 400, error: `You can add up to ${MAX_PHOTOS} photos.` };

  return { ok: true, data: { title, price_paise: Math.round(price * 100), category, description, keep, files } };
}
