import { fail, readJson } from "@/lib/http";
import { cardsByIds } from "@/lib/queries";

/** Current price, availability and shop for the product ids in a visitor's cart. */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body || !Array.isArray(body.ids)) return fail(400, "Send {ids: [...]}.");
  const rows = await cardsByIds(body.ids.map(String));
  return Response.json({
    items: rows.map((r) => ({
      id: r.id,
      title: r.title,
      price_paise: r.price_paise,
      sold_out: r.sold_out,
      shop_id: r.shop_id,
      shop_name: r.shop_name,
      photo_id: r.photo_id,
    })),
  });
}
