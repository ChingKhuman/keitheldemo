import { destroySession } from "@/lib/auth";
import { fail, sameOrigin } from "@/lib/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Request blocked.");
  await destroySession();
  return Response.json({ ok: true });
}
