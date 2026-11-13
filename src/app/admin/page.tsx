import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminToggle from "@/components/AdminToggle";
import Verified from "@/components/Verified";
import { getUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { rupees } from "@/lib/format";
import { listProducts } from "@/lib/queries";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

type ShopRow = { id: string; name: string; district: string; phone: string; verified: boolean; is_demo: boolean; products: number };

export default async function AdminPage() {
  const user = await getUser();
  if (!user?.isAdmin) notFound();

  const [shops, listed, stats] = await Promise.all([
    query<ShopRow>(
      `SELECT s.id, s.name, s.district, s.phone, s.verified, s.is_demo,
              (SELECT count(*)::int FROM products p WHERE p.shop_id = s.id) AS products
         FROM shops s ORDER BY s.created_at DESC`,
    ),
    listProducts({ includeHidden: true }),
    query<{ orders: number; value: string }>(
      "SELECT count(*)::int AS orders, COALESCE(sum(total_paise) FILTER (WHERE status <> 'cancelled'), 0)::text AS value FROM orders",
    ),
  ]);
  const totalProducts = await query<{ n: number }>("SELECT count(*)::int AS n FROM products");

  return (
    <>
      <div className="lead">
        <div>
          <h1>Marketplace admin</h1>
          <p>Verify sellers and hide listings that break the rules.</p>
        </div>
      </div>
      <div className="tiles">
        <div><b className="num">{shops.length}</b><span>Sellers</span></div>
        <div><b className="num">{totalProducts[0].n}</b><span>Listings</span></div>
        <div><b className="num">{stats[0].orders}</b><span>Orders</span></div>
        <div><b className="num">{rupees(Number(stats[0].value))}</b><span>Order value</span></div>
      </div>

      <h2 className="sec">Sellers</h2>
      {shops.length === 0 ? (
        <div className="panel empty"><h3>No sellers yet</h3><p>Shops appear here as people open them.</p></div>
      ) : (
        <div className="panel rows">
          {shops.map((s) => (
            <div className="row between" key={s.id}>
              <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <b><Link href={`/shop/${s.id}`}>{s.name}</Link></b> {s.verified && <Verified />} {s.is_demo && <span className="pill" data-s="plain">Sample</span>}
                <div className="muted">{s.district} · {s.phone} · {s.products} {s.products === 1 ? "listing" : "listings"}</div>
              </div>
              <AdminToggle path={`/api/admin/shops/${s.id}`} field="verified" value={s.verified} onLabel="Remove verification" offLabel="Verify seller" />
            </div>
          ))}
        </div>
      )}

      <h2 className="sec">Latest listings</h2>
      {listed.items.length === 0 ? (
        <div className="panel empty"><h3>No listings yet</h3><p>Products appear here as sellers add them.</p></div>
      ) : (
        <div className="panel rows">
          {listed.items.map((p) => (
            <div className="line" key={p.id}>
              <div className="thumb">{p.photo_id ? <img src={`/api/photos/${p.photo_id}`} alt="" /> : <div className="ph">{p.title.charAt(0)}</div>}</div>
              <div className="n">
                <Link href={`/product/${p.id}`}>{p.title}</Link>
                <div className="muted">{p.shop_name} · {rupees(p.price_paise)}</div>
              </div>
              <AdminToggle path={`/api/admin/products/${p.id}`} field="hidden" value={p.hidden} onLabel="Show" offLabel="Hide" />
            </div>
          ))}
        </div>
      )}
      <p className="note">Showing the {listed.items.length} newest listings.{listed.hasMore ? " Older listings are not shown here yet." : ""}</p>
    </>
  );
}
