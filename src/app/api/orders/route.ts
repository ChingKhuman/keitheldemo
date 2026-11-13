import { tx } from "@/lib/db";
import { cleanText, isUuid, normalizePhone } from "@/lib/format";
import { fail, guard, readJson } from "@/lib/http";

type Line = { id: string; qty: number };

/**
 * Place an order. The cart can hold items from several shops, so this creates
 * one order per shop. Prices come from the database, never from the browser.
 */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  const body = await readJson(req);
  if (!body) return fail(400, "Send the form as JSON.");

  const name = cleanText(body.name, 80);
  const phone = normalizePhone(body.phone);
  const address = cleanText(body.address, 300);
  const payment = body.payment === "upi" ? "upi" : body.payment === "cod" ? "cod" : null;
  if (name.length < 2) return fail(400, "Enter your name.");
  if (!phone) return fail(400, "Enter a 10-digit mobile number.");
  if (address.length < 8) return fail(400, "Enter a full delivery address.");
  if (!payment) return fail(400, "Choose how you will pay.");

  const lines: Line[] = [];
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 30) return fail(400, "Your cart is empty.");
  for (const raw of body.items as unknown[]) {
    const r = raw as { id?: unknown; qty?: unknown };
    const qty = Number(r?.qty);
    if (!isUuid(r?.id) || !Number.isInteger(qty) || qty < 1 || qty > 20) return fail(400, "Something in your cart is not valid.");
    if (lines.some((l) => l.id === r.id)) continue;
    lines.push({ id: r.id as string, qty });
  }

  try {
    const orderIds = await tx(async (c) => {
      const found = await c.query<{ id: string; title: string; price_paise: number; shop_id: string; owner: string; sold_out: boolean; hidden: boolean }>(
        `SELECT p.id, p.title, p.price_paise, p.shop_id, s.user_id AS owner, p.sold_out, p.hidden
           FROM products p JOIN shops s ON s.id = p.shop_id
          WHERE p.id = ANY($1::uuid[])`,
        [lines.map((l) => l.id)],
      );
      const byId = new Map(found.rows.map((r) => [r.id, r]));
      const byShop = new Map<string, { id: string; title: string; price_paise: number; qty: number }[]>();
      for (const l of lines) {
        const p = byId.get(l.id);
        if (!p || p.hidden) throw new OrderError("An item in your cart is no longer available.");
        if (p.sold_out) throw new OrderError(`"${p.title}" is sold out.`);
        if (p.owner === g.user.id) throw new OrderError("You cannot order from your own shop.");
        const list = byShop.get(p.shop_id) ?? [];
        list.push({ id: p.id, title: p.title, price_paise: p.price_paise, qty: l.qty });
        byShop.set(p.shop_id, list);
      }
      const ids: string[] = [];
      for (const [shopId, items] of byShop) {
        const total = items.reduce((a, i) => a + i.price_paise * i.qty, 0);
        const o = await c.query<{ id: string }>(
          `INSERT INTO orders (buyer_id, shop_id, buyer_name, buyer_phone, address, payment, total_paise)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [g.user.id, shopId, name, phone, address, payment, total],
        );
        for (const i of items) {
          await c.query(
            "INSERT INTO order_items (order_id, product_id, title, price_paise, qty) VALUES ($1, $2, $3, $4, $5)",
            [o.rows[0].id, i.id, i.title, i.price_paise, i.qty],
          );
        }
        ids.push(o.rows[0].id);
      }
      return ids;
    });
    return Response.json({ ok: true, orders: orderIds });
  } catch (e) {
    if (e instanceof OrderError) return fail(409, e.message);
    throw e;
  }
}

class OrderError extends Error {}
