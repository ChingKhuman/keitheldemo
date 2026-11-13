import { tx } from "@/lib/db";
import { getShopByUser } from "@/lib/queries";
import { fail, guard } from "@/lib/http";
import { parseProductForm } from "@/lib/productForm";

/** Publish a new product from the seller's own shop. */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  const shop = await getShopByUser(g.user.id);
  if (!shop) return fail(400, "Open your shop before adding products.");

  const parsed = await parseProductForm(req);
  if (!parsed.ok) return fail(parsed.status, parsed.error);
  const d = parsed.data;

  const id = await tx(async (c) => {
    const r = await c.query<{ id: string }>(
      `INSERT INTO products (shop_id, title, price_paise, category, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [shop.id, d.title, d.price_paise, d.category, d.description],
    );
    for (let i = 0; i < d.files.length; i++) {
      await c.query("INSERT INTO product_photos (product_id, position, data) VALUES ($1, $2, $3)", [r.rows[0].id, i, d.files[i]]);
    }
    return r.rows[0].id;
  });
  return Response.json({ ok: true, id });
}
