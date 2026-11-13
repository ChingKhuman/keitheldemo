-- Keithel marketplace schema. Safe to run more than once.

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         text NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS shops (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  district   text NOT NULL,
  phone      text NOT NULL,
  upi        text NOT NULL DEFAULT '',
  about      text NOT NULL DEFAULT '',
  verified   boolean NOT NULL DEFAULT false,
  is_demo    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title       text NOT NULL,
  price_paise integer NOT NULL CHECK (price_paise > 0),
  category    text NOT NULL,
  description text NOT NULL DEFAULT '',
  sold_out    boolean NOT NULL DEFAULT false,
  hidden      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_created_idx ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS products_shop_idx ON products(shop_id);

-- Photos live in the database for now so the app needs no extra service.
-- Move them to object storage (S3, Cloudinary) when the catalogue grows.
CREATE TABLE IF NOT EXISTS product_photos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position   smallint NOT NULL DEFAULT 0,
  data       bytea NOT NULL
);
CREATE INDEX IF NOT EXISTS photos_product_idx ON product_photos(product_id, position);

CREATE TABLE IF NOT EXISTS orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id     uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  buyer_name  text NOT NULL,
  buyer_phone text NOT NULL,
  address     text NOT NULL,
  payment     text NOT NULL CHECK (payment IN ('cod', 'upi')),
  status      text NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),
  total_paise integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_buyer_idx ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_shop_idx ON orders(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id          bigserial PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES products(id) ON DELETE SET NULL,
  title       text NOT NULL,
  price_paise integer NOT NULL,
  qty         smallint NOT NULL CHECK (qty BETWEEN 1 AND 20)
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
