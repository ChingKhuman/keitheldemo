import { one, query } from "./db";
import { isUuid } from "./format";

export type ProductCard = {
  id: string;
  title: string;
  price_paise: number;
  category: string;
  sold_out: boolean;
  hidden: boolean;
  shop_id: string;
  shop_name: string;
  district: string;
  verified: boolean;
  photo_id: string | null;
  created_at: Date;
};

const CARD_SELECT = `
  SELECT p.id, p.title, p.price_paise, p.category, p.sold_out, p.hidden, p.created_at,
         s.id AS shop_id, s.name AS shop_name, s.district, s.verified,
         (SELECT pp.id FROM product_photos pp WHERE pp.product_id = p.id ORDER BY pp.position LIMIT 1) AS photo_id
    FROM products p
    JOIN shops s ON s.id = p.shop_id`;

export const PAGE_SIZE = 24;

export type ListOptions = {
  q?: string;
  category?: string;
  district?: string;
  sort?: string;
  shopId?: string;
  includeHidden?: boolean;
  page?: number;
};

export async function listProducts(o: ListOptions): Promise<{ items: ProductCard[]; hasMore: boolean }> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (!o.includeHidden) where.push("p.hidden = false");
  if (o.category) where.push(`p.category = ${add(o.category)}`);
  if (o.district) where.push(`s.district = ${add(o.district)}`);
  if (o.shopId && isUuid(o.shopId)) where.push(`p.shop_id = ${add(o.shopId)}`);
  if (o.q) {
    const like = `%${o.q.replace(/[\\%_]/g, "\\$&")}%`;
    const ph = add(like);
    where.push(`(p.title ILIKE ${ph} OR p.description ILIKE ${ph} OR s.name ILIKE ${ph})`);
  }
  const order =
    o.sort === "low" ? "p.price_paise ASC, p.created_at DESC"
    : o.sort === "high" ? "p.price_paise DESC, p.created_at DESC"
    : "p.created_at DESC";
  const page = Math.max(1, Math.floor(o.page ?? 1));
  const limit = add(PAGE_SIZE + 1);
  const offset = add((page - 1) * PAGE_SIZE);
  const rows = await query<ProductCard>(
    `${CARD_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function cardsByIds(ids: string[]): Promise<ProductCard[]> {
  const valid = ids.filter(isUuid).slice(0, 50);
  if (!valid.length) return [];
  return query<ProductCard>(`${CARD_SELECT} WHERE p.id = ANY($1::uuid[]) AND p.hidden = false`, [valid]);
}

export type ProductDetail = ProductCard & {
  description: string;
  photo_ids: string[];
  shop_user_id: string;
  shop_about: string;
  shop_phone: string;
};

export async function getProduct(id: string): Promise<ProductDetail | null> {
  if (!isUuid(id)) return null;
  const row = await one<ProductDetail & { photo_ids: string[] | null }>(
    `SELECT p.id, p.title, p.price_paise, p.category, p.description, p.sold_out, p.hidden, p.created_at,
            s.id AS shop_id, s.name AS shop_name, s.district, s.verified, s.user_id AS shop_user_id,
            s.about AS shop_about, s.phone AS shop_phone,
            (SELECT array_agg(pp.id ORDER BY pp.position) FROM product_photos pp WHERE pp.product_id = p.id) AS photo_ids
       FROM products p JOIN shops s ON s.id = p.shop_id
      WHERE p.id = $1`,
    [id],
  );
  if (!row) return null;
  const photo_ids = row.photo_ids ?? [];
  return { ...row, photo_ids, photo_id: photo_ids[0] ?? null };
}

export type Shop = {
  id: string;
  user_id: string;
  name: string;
  district: string;
  phone: string;
  upi: string;
  about: string;
  verified: boolean;
  is_demo: boolean;
  created_at: Date;
};

export async function getShop(id: string): Promise<Shop | null> {
  if (!isUuid(id)) return null;
  return one<Shop>("SELECT * FROM shops WHERE id = $1", [id]);
}

export async function getShopByUser(userId: string): Promise<Shop | null> {
  return one<Shop>("SELECT * FROM shops WHERE user_id = $1", [userId]);
}

export type OrderRow = {
  id: string;
  buyer_name: string;
  buyer_phone: string;
  address: string;
  payment: "cod" | "upi";
  status: string;
  total_paise: number;
  created_at: Date;
  shop_id: string;
  shop_name: string;
  shop_phone: string;
  shop_upi: string;
  items: { title: string; price_paise: number; qty: number }[];
};

const ORDER_SELECT = `
  SELECT o.id, o.buyer_name, o.buyer_phone, o.address, o.payment, o.status, o.total_paise, o.created_at,
         s.id AS shop_id, s.name AS shop_name, s.phone AS shop_phone, s.upi AS shop_upi,
         COALESCE((SELECT json_agg(json_build_object('title', i.title, 'price_paise', i.price_paise, 'qty', i.qty) ORDER BY i.id)
                     FROM order_items i WHERE i.order_id = o.id), '[]'::json) AS items
    FROM orders o JOIN shops s ON s.id = o.shop_id`;

export function ordersForBuyer(userId: string): Promise<OrderRow[]> {
  return query<OrderRow>(`${ORDER_SELECT} WHERE o.buyer_id = $1 ORDER BY o.created_at DESC LIMIT 100`, [userId]);
}

export function ordersForShop(shopId: string): Promise<OrderRow[]> {
  return query<OrderRow>(`${ORDER_SELECT} WHERE o.shop_id = $1 ORDER BY o.created_at DESC LIMIT 200`, [shopId]);
}
