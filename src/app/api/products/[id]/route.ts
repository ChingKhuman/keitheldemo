import { one, query, tx } from "@/lib/db";
import { isUuid } from "@/lib/format";
import { fail, guard, readJson } from "@/lib/http";
import { parseProductForm } from "@/lib/productForm";

type Ctx = { params: Promise<{ id: string }> };

async function ownedProduct(id: string, userId: string, isAdmin: boolean) {
  if (!isUuid(id)) return null;
  return one<{ id: string }>(
    `SELECT p.id FROM products p JOIN shops s ON s.id = p.shop_id
      WHERE p.id = $1 AND ($3 OR s.user_id = $2)`,
    [id, userId, isAdmin],
  );
}

/**
 * JSON body {soldOut}: toggle availability.
 * Multipart body: replace the product's details and photos.
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.res) return g.res;
  const { id } = await ctx.params;
  // Only the shop owner edits listings. Admins hide them from the admin page instead.
  if (!(await ownedProduct(id, g.user.id, false))) return fail(404, "Product not found.");

  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const body = await readJson(req);
    if (!body || typeof body.soldOut !== "boolean") return fail(400, "Send {soldOut: true or false}.");
    await query("UPDATE products SET sold_out = $1 WHERE id = $2", [body.soldOut, id]);
    return Response.json({ ok: true });
  }

  const parsed = await parseProductForm(req);
  if (!parsed.ok) return fail(parsed.status, parsed.error);
  const d = parsed.data;

  const NO_PHOTO = "A product needs at least one photo.";
  try {
    await tx(async (c) => {
      await c.query(
        "UPDATE products SET title = $1, price_paise = $2, category = $3, description = $4 WHERE id = $5",
        [d.title, d.price_paise, d.category, d.description, id],
      );
      // Only photo ids that belong to this product count as kept; the rest are removed.
      const kept = await c.query<{ id: string }>(
        "SELECT id FROM product_photos WHERE product_id = $1 AND id = ANY($2::uuid[]) ORDER BY position",
        [id, d.keep],
      );
      if (kept.rows.length + d.files.length < 1) throw new Error(NO_PHOTO);
      await c.query("DELETE FROM product_photos WHERE product_id = $1 AND NOT (id = ANY($2::uuid[]))", [id, kept.rows.map((r) => r.id)]);
      for (let i = 0; i < kept.rows.length; i++) {
        await c.query("UPDATE product_photos SET position = $1 WHERE id = $2", [i, kept.rows[i].id]);
      }
      for (let i = 0; i < d.files.length; i++) {
        await c.query("INSERT INTO product_photos (product_id, position, data) VALUES ($1, $2, $3)", [id, kept.rows.length + i, d.files[i]]);
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === NO_PHOTO) return fail(400, NO_PHOTO);
    throw e;
  }
  return Response.json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const g = await guard(req);
  if (g.res) return g.res;
  const { id } = await ctx.params;
  if (!(await ownedProduct(id, g.user.id, g.user.isAdmin))) return fail(404, "Product not found.");
  await query("DELETE FROM products WHERE id = $1", [id]);
  return Response.json({ ok: true });
}
