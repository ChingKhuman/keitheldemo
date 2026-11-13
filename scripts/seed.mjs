// Adds sample shops and products so the site is not empty for a demo.
//   npm run db:seed              adds the samples (safe to run twice)
//   npm run db:seed -- --remove  deletes only the samples
// Sample shops have no usable login, so nobody can sign in as them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

// On Render there is no shell on small plans, so the deploy step runs this with --from-env
// and the SEED_DEMO setting decides: "true" adds the samples, "remove" deletes them, anything else does nothing.
let mode = process.argv.includes("--remove") ? "remove" : "add";
if (process.argv.includes("--from-env")) {
  const v = (process.env.SEED_DEMO ?? "").toLowerCase();
  if (v !== "true" && v !== "remove") process.exit(0);
  mode = v === "remove" ? "remove" : "add";
}

const here = path.dirname(fileURLToPath(import.meta.url));
const img = (name) => fs.readFileSync(path.join(here, "..", "db", "seed-images", `${name}.jpg`));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const SHOPS = [
  { key: "ibemhal", name: "Ibemhal Handloom", district: "Imphal West", verified: true,
    about: "A family loom in Imphal weaving cotton phanek, shawls and stoles by hand. Sample shop for the demo." },
  { key: "thoubal", name: "Thoubal Home Kitchen", district: "Thoubal", verified: false,
    about: "Farm and kitchen staples from Thoubal, packed at home. Sample shop for the demo." },
  { key: "ukhrul", name: "Ukhrul Clay and Cane", district: "Ukhrul", verified: true,
    about: "Hand-made pottery and cane work from Ukhrul. Sample shop for the demo." },
];

const note = " Sample listing for the demo.";
const PRODUCTS = [
  ["ibemhal", "Hand-woven phanek, red and black stripe", 2400, "Handloom & textiles", "Cotton phanek woven on a loom, with a traditional red and black stripe. About 2.5 metres. Takes around two weeks to weave.", "phanek"],
  ["ibemhal", "Cotton shawl with woven border", 1200, "Handloom & textiles", "Soft off-white cotton shawl with a red and black woven border at both ends. Machine-washable on a gentle cycle.", "shawl"],
  ["ibemhal", "Cotton stole, green check", 650, "Fashion", "Light everyday stole in a green and white check with gold thread. About 2 metres long.", "stole"],
  ["thoubal", "Chak-hao black rice, 1 kg", 280, "Local food", "Black rice grown in Thoubal, packed in a 1 kg bag. Cooks in about 30 minutes after soaking and is good for kheer.", "rice"],
  ["thoubal", "Home-made mixed pickle, 400 g", 180, "Groceries", "Small-batch pickle made at home with mustard oil and local spices. 400 g glass jar. Lasts six months unopened.", "pickle"],
  ["ukhrul", "Black clay cooking pot with lid", 650, "Crafts & pottery", "Hand-shaped black clay pot with a lid, made without a wheel. Holds about 2 litres. Season it before first use.", "pot"],
  ["ukhrul", "Cane and bamboo storage basket", 750, "Home & kitchen", "Hand-woven cane and bamboo basket with a carry handle. About 30 cm wide. Good for fruit, laundry or toys.", "basket"],
];

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});
await client.connect();
try {
  if (mode === "remove") {
    const r = await client.query("DELETE FROM users WHERE phone LIKE 'demo-%'");
    console.log(`Removed ${r.rowCount} sample shops and their products.`);
  } else {
    let added = 0;
    for (const s of SHOPS) {
      await client.query("BEGIN");
      const u = await client.query(
        `INSERT INTO users (phone, name, password_hash) VALUES ($1, $2, 'disabled')
         ON CONFLICT (phone) DO NOTHING RETURNING id`,
        [`demo-${s.key}`, s.name],
      );
      if (!u.rowCount) {
        await client.query("ROLLBACK");
        continue; // already seeded
      }
      const shop = await client.query(
        `INSERT INTO shops (user_id, name, district, phone, about, verified, is_demo)
         VALUES ($1, $2, $3, '', $4, $5, true) RETURNING id`,
        [u.rows[0].id, s.name, s.district, s.about, s.verified],
      );
      let n = 0;
      for (const [k, title, rupees, cat, desc, image] of PRODUCTS) {
        if (k !== s.key) continue;
        const p = await client.query(
          `INSERT INTO products (shop_id, title, price_paise, category, description, created_at)
           VALUES ($1, $2, $3, $4, $5, now() - ($6 || ' minutes')::interval) RETURNING id`,
          [shop.rows[0].id, title, rupees * 100, cat, desc + note, String(added * 3 + n)],
        );
        await client.query("INSERT INTO product_photos (product_id, position, data) VALUES ($1, 0, $2)", [p.rows[0].id, img(image)]);
        n++;
      }
      await client.query("COMMIT");
      added++;
    }
    console.log(added ? `Added ${added} sample shops.` : "Sample shops are already there.");
  }
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  await client.end();
}
