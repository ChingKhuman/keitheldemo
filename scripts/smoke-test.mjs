// End-to-end check against a running server (default http://localhost:3000).
// It signs up real test users, so run it against a development or CI database, not production.
//   npm run test:smoke
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_PHONE = (process.env.ADMIN_PHONES ?? "9000000001").split(",")[0].trim();
const here = path.dirname(fileURLToPath(import.meta.url));
const photo = fs.readFileSync(path.join(here, "..", "db", "seed-images", "phanek.jpg"));

let failed = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !extra ? "" : "  -> " + extra}`);
  if (!ok) failed++;
}

function session() {
  const jar = new Map();
  const absorb = (res) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const k = pair.slice(0, i);
      const v = pair.slice(i + 1);
      if (/max-age=0|expires=thu, 01 jan 1970/i.test(c) || !v) jar.delete(k);
      else jar.set(k, v);
    }
  };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const send = async (method, url, { json, form, headers = {}, redirect = "manual" } = {}) => {
    const h = { ...headers };
    if (jar.size) h.cookie = cookie();
    let body;
    if (json !== undefined) { h["content-type"] = "application/json"; body = JSON.stringify(json); }
    if (form) body = form;
    const res = await fetch(BASE + url, { method, headers: h, body, redirect });
    absorb(res);
    return res;
  };
  return {
    get: (u, o) => send("GET", u, o),
    post: (u, json, o) => send("POST", u, { json, ...o }),
    patch: (u, json, o) => send("PATCH", u, { json, ...o }),
    patchForm: (u, form) => send("PATCH", u, { form }),
    postForm: (u, form) => send("POST", u, { form }),
    del: (u) => send("DELETE", u),
  };
}

const rand = () => String(Math.floor(100_000_000 + Math.random() * 899_999_999)); // 9 digits, so "9" + rand() is a 10-digit number
const phones = { seller: "9" + rand(), buyer: "9" + rand(), stranger: "9" + rand() };
const PASSWORD = "correct horse battery";

async function signUp(s, name, phone) {
  const r = await s.post("/api/auth/register", { name, phone, password: PASSWORD });
  return r.status;
}

function productForm(title, extra = {}) {
  const f = new FormData();
  f.set("title", title);
  f.set("price", "1250.50");
  f.set("category", "Handloom & textiles");
  f.set("description", "Smoke test product.");
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  return f;
}
const jpegFile = () => new File([photo], "p.jpg", { type: "image/jpeg" });

const seller = session(), buyer = session(), stranger = session(), admin = session(), anon = session();
const TITLE = `Smoke test phanek ${Date.now()}`;

// --- basics
let r = await anon.get("/api/health");
check("health endpoint reports ok", r.status === 200);
r = await anon.get("/");
check("home page renders", r.status === 200 && (await r.text()).includes("Shop from sellers across Manipur"));
r = await anon.get("/orders");
check("orders page sends signed-out visitors to sign in", r.status >= 300 && r.status < 400 && (r.headers.get("location") ?? "").includes("/login"));

// --- accounts
check("seller can register", (await signUp(seller, "Test Seller", phones.seller)) === 200);
check("buyer can register", (await signUp(buyer, "Test Buyer", phones.buyer)) === 200);
check("stranger can register", (await signUp(stranger, "Test Stranger", phones.stranger)) === 200);
check("same number cannot register twice", (await signUp(session(), "Dup", phones.seller)) === 409);
r = await session().post("/api/auth/login", { phone: phones.seller, password: "wrong password" });
check("wrong password is refused", r.status === 401);
r = await session().post("/api/auth/register", { name: "X", phone: "12345", password: "short" });
check("bad sign-up details are refused", r.status === 400);

// --- cross-site protection
r = await seller.post("/api/shop", { name: "Evil" }, { headers: { origin: "https://evil.example" } });
check("cross-site writes are blocked", r.status === 403);

// --- seller flow
r = await anon.post("/api/shop", { name: "Nope", district: "Thoubal", phone: phones.seller });
check("signing in is required to open a shop", r.status === 401);
r = await seller.post("/api/shop", { name: "Test Handloom", district: "Imphal West", phone: phones.seller, upi: "testshop@okbank", about: "Smoke test shop." });
const shopId = (await r.json()).id;
check("seller can open a shop", r.status === 200 && !!shopId);
r = await seller.post("/api/shop", { name: "Bad UPI", district: "Imphal West", phone: phones.seller, upi: "not a upi" });
check("a malformed UPI ID is refused", r.status === 400);

r = await seller.postForm("/api/products", productForm(TITLE, {}));
check("a product needs a photo", r.status === 400);
const bad = productForm(TITLE);
bad.append("photos", new File([Buffer.from("not an image at all")], "x.jpg", { type: "image/jpeg" }));
r = await seller.postForm("/api/products", bad);
check("a file that is not a JPEG is refused", r.status === 400);
const good = productForm(TITLE);
good.append("photos", jpegFile());
r = await seller.postForm("/api/products", good);
const productId = (await r.json()).id;
check("seller can publish a product with a photo", r.status === 200 && !!productId);

r = await buyer.get(`/product/${productId}`);
let html = await r.text();
check("product page renders with title, price and structured data", r.status === 200 && html.includes(TITLE) && html.includes("1,250.50") && html.includes("application/ld+json"));
const photoMatch = html.match(/\/api\/photos\/([0-9a-f-]{36})/);
r = await anon.get(photoMatch ? `/api/photos/${photoMatch[1]}` : "/api/photos/none");
check("product photo is served as a JPEG", r.status === 200 && r.headers.get("content-type") === "image/jpeg");
r = await anon.get(`/?q=${encodeURIComponent("smoke test phanek")}`);
check("search finds the product", (await r.text()).includes(TITLE));

r = await stranger.patch(`/api/products/${productId}`, { soldOut: true });
check("another user cannot edit someone else's product", r.status === 404);
r = await stranger.del(`/api/products/${productId}`);
check("another user cannot delete someone else's product", r.status === 404);
r = await stranger.get(`/sell/product/${productId}/edit`);
check("another user cannot open the edit page", r.status === 404);

// --- ordering
const orderBody = { name: "Test Buyer", phone: phones.buyer, address: "Thangmeiband, Imphal West, Manipur", payment: "upi", items: [{ id: productId, qty: 2 }] };
r = await seller.post("/api/orders", orderBody);
check("a seller cannot order from their own shop", r.status === 409);
r = await buyer.post("/api/orders", { ...orderBody, items: [{ id: productId, qty: 0 }] });
check("a quantity of zero is refused", r.status === 400);
await seller.patch(`/api/products/${productId}`, { soldOut: true });
r = await buyer.post("/api/orders", orderBody);
check("a sold-out product cannot be ordered", r.status === 409);
await seller.patch(`/api/products/${productId}`, { soldOut: false });
r = await buyer.post("/api/orders", orderBody);
const orderId = (await r.json()).orders?.[0];
check("buyer can place an order", r.status === 200 && !!orderId);

r = await buyer.get("/orders");
html = await r.text();
check("buyer sees the order with the server-calculated total", html.includes("Order #") && html.includes("2,501") && html.includes("testshop@okbank"));
r = await seller.get("/sell");
html = await r.text();
check("seller sees the order with the buyer's contact details", html.includes(phones.buyer) && html.includes("Thangmeiband"));
r = await stranger.get("/orders");
check("a stranger does not see other people's orders", !(await r.text()).includes("Thangmeiband"));
r = await stranger.get("/sell");
check("a stranger's seller page does not leak the order", !(await r.text()).includes(phones.buyer));

r = await stranger.patch(`/api/orders/${orderId}`, { status: "delivered" });
check("a stranger cannot change an order", r.status === 404);
r = await buyer.patch(`/api/orders/${orderId}`, { status: "delivered" });
check("a buyer cannot mark their own order delivered", r.status === 403);
r = await seller.patch(`/api/orders/${orderId}`, { status: "confirmed" });
check("seller can confirm the order", r.status === 200);
r = await buyer.patch(`/api/orders/${orderId}`, { status: "cancelled" });
check("buyer cannot cancel after the seller confirms", r.status === 403);

r = await buyer.post("/api/orders", orderBody);
const second = (await r.json()).orders?.[0];
r = await buyer.patch(`/api/orders/${second}`, { status: "cancelled" });
check("buyer can cancel an order the seller has not confirmed", r.status === 200);

// --- admin
r = await seller.patch(`/api/admin/shops/${shopId}`, { verified: true });
check("a normal user cannot verify a shop", r.status === 403);
r = await seller.get("/admin");
check("a normal user cannot open the admin page", r.status === 404);
let adminOk = (await admin.post("/api/auth/register", { name: "Admin", phone: ADMIN_PHONE, password: PASSWORD })).status === 200;
if (!adminOk) adminOk = (await admin.post("/api/auth/login", { phone: ADMIN_PHONE, password: PASSWORD })).status === 200;
if (!adminOk) console.log(`SKIP  admin checks: could not sign in as ${ADMIN_PHONE}. Use a fresh database or the matching password.`);
else {
  r = await admin.patch(`/api/admin/shops/${shopId}`, { verified: true });
  check("an admin can verify a shop", r.status === 200);
  r = await anon.get(`/shop/${shopId}`);
  check("the shop page shows the Verified badge", (await r.text()).includes("Verified"));
  r = await admin.get("/admin");
  check("an admin can open the admin page", r.status === 200 && (await r.text()).includes("Marketplace admin"));
  r = await admin.patch(`/api/admin/products/${productId}`, { hidden: true });
  check("an admin can hide a listing", r.status === 200);
  r = await anon.get(`/product/${productId}`);
  check("a hidden listing disappears for buyers", r.status === 404);
  r = await buyer.post("/api/orders", orderBody);
  check("a hidden listing cannot be ordered", r.status === 409);
  await admin.patch(`/api/admin/products/${productId}`, { hidden: false });
}

// --- edit and delete by the owner
const edit = productForm(TITLE + " (edited)", { price: "999" });
edit.append("keep", photoMatch ? photoMatch[1] : "");
r = await seller.patchForm(`/api/products/${productId}`, edit);
check("seller can edit their product and keep its photo", r.status === 200);
r = await anon.get(`/product/${productId}`);
check("the edit shows on the product page", (await r.text()).includes("(edited)"));
const noPhoto = productForm(TITLE);
r = await seller.patchForm(`/api/products/${productId}`, noPhoto);
check("an edit cannot remove every photo", r.status === 400);
r = await seller.del(`/api/products/${productId}`);
check("seller can remove their product", r.status === 200);
r = await anon.get(`/product/${productId}`);
check("a removed product is gone", r.status === 404);

// --- sign out
r = await buyer.post("/api/auth/logout", {});
r = await buyer.get("/orders");
check("signing out ends the session", r.status >= 300 && r.status < 400);

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
