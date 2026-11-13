import { createSession, hashPassword, rateLimited } from "@/lib/auth";
import { query } from "@/lib/db";
import { cleanText, normalizePhone } from "@/lib/format";
import { clientIp, fail, readJson, sameOrigin } from "@/lib/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "Request blocked.");
  // Many phones share one address on mobile networks, so keep this generous.
  const limit = Number(process.env.REGISTER_LIMIT_PER_HOUR) || 30;
  if (rateLimited(`register:${clientIp(req)}`, limit, 3_600_000)) {
    return fail(429, "Too many sign-ups from this network. Try again in an hour.");
  }
  const body = await readJson(req);
  if (!body) return fail(400, "Send the form as JSON.");

  const name = cleanText(body.name, 60);
  const phone = normalizePhone(body.phone);
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2) return fail(400, "Enter your name.");
  if (!phone) return fail(400, "Enter a 10-digit mobile number.");
  if (password.length < 8 || password.length > 128) return fail(400, "Choose a password of at least 8 characters.");

  try {
    const rows = await query<{ id: string }>(
      "INSERT INTO users (phone, name, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [phone, name, await hashPassword(password)],
    );
    await createSession(rows[0].id);
    return Response.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail(409, "This number already has an account. Sign in instead.");
    throw e;
  }
}
