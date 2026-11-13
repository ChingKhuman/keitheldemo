import { query } from "@/lib/db";
import { DISTRICTS, cleanText, normalizePhone } from "@/lib/format";
import { fail, guard, readJson } from "@/lib/http";

/** Create or update the signed-in user's shop. */
export async function POST(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  const body = await readJson(req);
  if (!body) return fail(400, "Send the form as JSON.");

  const name = cleanText(body.name, 60);
  const district = cleanText(body.district, 40);
  const phone = normalizePhone(body.phone);
  const upi = cleanText(body.upi, 60);
  const about = cleanText(body.about, 400);
  if (name.length < 2) return fail(400, "Give your shop a name.");
  if (!(DISTRICTS as readonly string[]).includes(district)) return fail(400, "Choose a district.");
  if (!phone) return fail(400, "Enter a 10-digit mobile number buyers can reach.");
  if (upi && !/^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$/.test(upi)) return fail(400, "That UPI ID does not look right. It should look like name@bank.");

  const rows = await query<{ id: string }>(
    `INSERT INTO shops (user_id, name, district, phone, upi, about)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE
       SET name = EXCLUDED.name, district = EXCLUDED.district, phone = EXCLUDED.phone,
           upi = EXCLUDED.upi, about = EXCLUDED.about
     RETURNING id`,
    [g.user.id, name, district, phone, upi, about],
  );
  return Response.json({ ok: true, id: rows[0].id });
}
