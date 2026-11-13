import { one } from "@/lib/db";
import { isUuid } from "@/lib/format";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });
  const row = await one<{ data: Buffer }>("SELECT data FROM product_photos WHERE id = $1", [id]);
  if (!row) return new Response("Not found", { status: 404 });
  // Photo ids never change once uploaded, so browsers can keep them for a year.
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(row.data.length),
    },
  });
}
