import { createSession, rateLimited, verifyPassword } from "@/lib/auth";
import { one } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { clientIp, fail, readJson, sameOrigin } from "@/lib/http";

// A real hash of a random password, so unknown numbers cost the same time as wrong passwords.
const DUMMY = "00000000000000000000000000000000:" + "0".repeat(128);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Request blocked.");
  const body = await readJson(req);
  if (!body) return fail(400, "Send the form as JSON.");
  const phone = normalizePhone(body.phone);
  const password = typeof body.password === "string" ? body.password : "";
  if (!phone || !password) return fail(400, "Enter your mobile number and password.");

  if (rateLimited(`login:${phone}:${clientIp(req)}`, 8, 15 * 60_000)) {
    return fail(429, "Too many attempts. Wait 15 minutes and try again.");
  }
  const user = await one<{ id: string; password_hash: string }>("SELECT id, password_hash FROM users WHERE phone = $1", [phone]);
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY);
  if (!user || !ok) return fail(401, "That number and password do not match.");
  await createSession(user.id);
  return Response.json({ ok: true });
}
