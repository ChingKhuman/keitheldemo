# Keithel Marketplace

A multi-seller marketplace for Manipur. Anyone can open a shop from home, upload photos and prices from a phone, and sell to buyers across the state. Built with Next.js, TypeScript and PostgreSQL.

## What works today

**Buyers**
- Browse and search products, filter by category and district, sort by price
- Product pages that Google can read (server-rendered, with price and availability data)
- Cart saved on the device, checkout with cash on delivery or UPI paid to the seller
- My orders with live status, and cancel before the seller confirms

**Sellers**
- Open a shop with a phone number, district and optional UPI ID
- Add products with up to 4 photos taken on a phone (photos are shrunk automatically before upload)
- Edit, mark sold out, or remove products
- See incoming orders with the buyer's contact details and move them from New to Delivered

**Admin**
- Verify sellers (shows a Verified badge) and hide listings that break the rules
- Totals for sellers, listings, orders and order value

**Security basics in place**
- Passwords stored with scrypt, sessions in the database with httpOnly cookies
- A seller can only change their own shop, products and orders. Orders are visible only to the buyer, the seller and admins
- Prices are always taken from the database, never from the browser
- Cross-site request blocking, sign-in rate limiting, upload type and size checks

## Not built yet

These are needed before taking real money from real customers:

- **Online payments.** Buyers pay cash on delivery or pay the seller's UPI ID themselves. A payment gateway such as Razorpay needs an account in your business's name.
- **SMS one-time-password login.** Accounts use a mobile number and password today. OTP needs an SMS provider (MSG91, Twilio and similar).
- **Image storage.** Photos live in the database. That is fine for a few hundred products. Move them to Cloudinary or S3 as you grow.
- **Delivery tracking, refunds and disputes, seller payouts, invoices.**
- **Seller KYC.** There is a manual Verified badge, but no document checks.
- **Notifications** (SMS, WhatsApp or email when an order arrives).
- **Shared rate limiting.** The limiter is in memory, which is right for one server. Use Redis if you run several.

Also check with an accountant or lawyer about GST registration for sellers, FSSAI licences for food, and RBI rules once you handle payments.

## Run it on your computer

You need Node.js 20 or newer and a PostgreSQL database.

```bash
npm install
cp .env.example .env        # then edit .env: set DATABASE_URL and ADMIN_PHONES
npm run db:migrate          # creates the tables
npm run db:seed             # optional: adds 3 sample shops with 7 products
npm run dev                 # opens on http://localhost:3000
```

To become an admin, put your mobile number in `ADMIN_PHONES`, restart, then create an account with that number. An **Admin** link appears in the menu.

Remove the sample shops any time with `npm run db:seed -- --remove`. It deletes only the samples.

### Check that everything works

With the app running on a fresh development database:

```bash
npm run typecheck
npm run test:smoke    # about 50 checks: sign-up, selling, ordering, privacy, admin
```

Do not run the smoke test against a live database. It creates test users and products.

## Put it on GitHub

1. Create an empty repository on github.com (no README, no .gitignore).
2. In this folder run:

```bash
git init
git add .
git commit -m "Keithel marketplace"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/keithel-marketplace.git
git push -u origin main
```

`.env` is ignored by git, so your passwords and database address are never uploaded. Check that `.env` does not appear in `git status` before you push.

The included GitHub Actions workflow (`.github/workflows/ci.yml`) then type-checks, builds and runs the smoke test against a fresh database on every push.

## Put it online with Render

`render.yaml` creates the website and its PostgreSQL database in one step.

1. Push the project to GitHub (above).
2. On render.com choose **New > Blueprint** and select the repository.
3. Render asks for two values:
   - `ADMIN_PHONES`: your mobile number, for example `9XXXXXXXXX`
   - `NEXT_PUBLIC_SITE_URL`: the address Render gives the site, for example `https://keithel.onrender.com`. If you do not know it yet, leave a placeholder, then edit it in the service's Environment settings once it is created and redeploy.
4. Press **Apply**. Render builds the site, creates the tables and, because `SEED_DEMO` is `"true"`, adds the sample shops. The first build takes a few minutes.
5. Open the site address. Create an account with your admin number to see the Admin page.

**Before real launch**
- In the Render dashboard set `SEED_DEMO` to `remove`, redeploy to delete the sample shops, then set it to `false`.
- Check Render's current plan terms. Free web services sleep when idle, so the first visit after a quiet period is slow, and free databases have a limited lifetime. Use a paid plan for anything customers depend on.
- Add your own domain in the service's Settings if you want a custom web address.

## How the code is laid out

```
db/schema.sql            all tables (safe to run repeatedly)
db/seed-images/          photos for the sample products
scripts/                 migrate, seed and smoke-test scripts
src/lib/                 database, sign-in, validation, queries
src/app/                 pages (shop, product, cart, sell, orders, admin)
src/app/api/             server endpoints used by the pages
src/components/          interface pieces (forms, cart, order controls)
render.yaml              one-click Render setup
```

## Settings (environment variables)

| Name | What it does |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `DATABASE_SSL` | `true` if your database needs SSL, such as Render's external address |
| `ADMIN_PHONES` | Comma-separated mobile numbers that get the Admin page |
| `NEXT_PUBLIC_SITE_URL` | Public address, used by search engines and link previews |
| `REGISTER_LIMIT_PER_HOUR` | Sign-ups allowed per network address per hour (default 30) |
| `SEED_DEMO` | Render only: `true` adds sample shops on deploy, `remove` deletes them |
"# keithelDemo" 
"# keithelDemo" 
"# keithelDemo" 
