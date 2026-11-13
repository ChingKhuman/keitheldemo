import { one, query } from "@/lib/db";
import { isStatus, isUuid } from "@/lib/format";
import { fail, guard, readJson } from "@/lib/http";

/**
 * Change an order's status.
 * The shop owner (and admins) can set any status. The buyer can only cancel
 * an order the seller has not confirmed yet.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.res) return g.res;
  const { id } = await ctx.params;
  const body = await readJson(req);
  if (!isUuid(id) || !body || !isStatus(body.status)) return fail(400, "Send a valid status.");

  const order = await one<{ status: string; buyer_id: string; owner: string }>(
    `SELECT o.status, o.buyer_id, s.user_id AS owner
       FROM orders o JOIN shops s ON s.id = o.shop_id WHERE o.id = $1`,
    [id],
  );
  // Strangers get the same answer as a missing order, so ids cannot be probed.
  if (!order) return fail(404, "Order not found.");
  const isSeller = order.owner === g.user.id;
  const isBuyer = order.buyer_id === g.user.id;
  if (!isSeller && !isBuyer && !g.user.isAdmin) return fail(404, "Order not found.");

  if (!isSeller && !g.user.isAdmin) {
    if (body.status !== "cancelled" || order.status !== "new") {
      return fail(403, "You can only cancel an order before the seller confirms it.");
    }
  }
  await query("UPDATE orders SET status = $1 WHERE id = $2", [body.status, id]);
  return Response.json({ ok: true });
}
