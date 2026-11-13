import { query } from "@/lib/db";
import { isUuid } from "@/lib/format";
import { fail, guard, readJson } from "@/lib/http";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req, { admin: true });
  if (g.res) return g.res;
  const { id } = await ctx.params;
  const body = await readJson(req);
  if (!isUuid(id) || !body || typeof body.verified !== "boolean") return fail(400, "Send {verified: true or false}.");
  await query("UPDATE shops SET verified = $1 WHERE id = $2", [body.verified, id]);
  return Response.json({ ok: true });
}
