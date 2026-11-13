import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import OrderCard from "@/components/OrderCard";
import SellerProductActions from "@/components/SellerProductActions";
import ShopForm from "@/components/ShopForm";
import { getUser } from "@/lib/auth";
import { rupees } from "@/lib/format";
import { getShopByUser, listProducts, ordersForShop } from "@/lib/queries";

export const metadata: Metadata = { title: "Sell on Keithel" };
export const dynamic = "force-dynamic";

export default async function SellPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/sell");
  const shop = await getShopByUser(user.id);

  if (!shop) {
    return (
      <>
        <div className="lead">
          <div>
            <h1>Open your shop</h1>
            <p>Selling from home is fine. Tell buyers who you are, then add your first product with photos from your phone.</p>
          </div>
        </div>
        <div className="panel"><ShopForm isNew /></div>
      </>
    );
  }

  const [{ items }, orders] = await Promise.all([
    listProducts({ shopId: shop.id, includeHidden: true }),
    ordersForShop(shop.id),
  ]);

  return (
    <>
      <div className="lead">
        <div>
          <h1>{shop.name}</h1>
          <p>Add products with photos from your phone, and manage the orders that come in.</p>
        </div>
        <div className="row">
          <Link className="btn" href={`/shop/${shop.id}`}>View my shop</Link>
          <Link className="btn primary" href="/sell/product/new">Add a product</Link>
        </div>
      </div>

      {!shop.verified && (
        <p className="note">Your shop is not verified yet. Verified shops get a badge that buyers trust. An admin reviews new shops.</p>
      )}

      <details className="edit panel" style={{ marginTop: 12 }}>
        <summary>Edit shop details</summary>
        <ShopForm
          isNew={false}
          initial={{ name: shop.name, district: shop.district, phone: shop.phone, upi: shop.upi, about: shop.about }}
        />
      </details>

      <h2 className="sec">Your products ({items.length})</h2>
      {items.length === 0 ? (
        <div className="panel empty">
          <h3>No products yet</h3>
          <p>Press Add a product, take a photo, set a price, and it goes live straight away.</p>
          <Link className="btn primary" href="/sell/product/new">Add your first product</Link>
        </div>
      ) : (
        <div className="panel rows">
          {items.map((p) => (
            <div className="line" style={{ gridTemplateColumns: "56px minmax(0, 1fr)" }} key={p.id}>
              <div className="thumb">
                {p.photo_id ? <img src={`/api/photos/${p.photo_id}`} alt="" /> : <div className="ph">{p.title.charAt(0)}</div>}
              </div>
              <div className="n">
                <Link href={`/product/${p.id}`}>{p.title}</Link>
                <div className="row">
                  <span className="num">{rupees(p.price_paise)}</span>
                  {p.sold_out && <span className="pill" data-s="cancelled">Sold out</span>}
                  {p.hidden && <span className="pill" data-s="hidden">Hidden by admin</span>}
                </div>
                <SellerProductActions id={p.id} soldOut={p.sold_out} />
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="sec">Orders to fulfil ({orders.length})</h2>
      {orders.length === 0 ? (
        <div className="panel empty">
          <h3>No orders yet</h3>
          <p>When a buyer orders from your shop it appears here, with their contact details and a status you control.</p>
        </div>
      ) : (
        <div className="panel rows">
          {orders.map((o) => (
            <OrderCard key={o.id} o={o} as="seller" />
          ))}
        </div>
      )}
    </>
  );
}
