import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import Verified from "@/components/Verified";
import { formatDate } from "@/lib/format";
import { getShop, listProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const s = await getShop(id);
  return s ? { title: s.name, description: s.about.slice(0, 160) || `${s.name} in ${s.district}` } : { title: "Shop not found" };
}

export default async function ShopPage({ params }: Props) {
  const { id } = await params;
  const shop = await getShop(id);
  if (!shop) notFound();
  const { items } = await listProducts({ shopId: shop.id });

  return (
    <>
      <div className="lead">
        <div>
          <h1>{shop.name}</h1>
          <div className="shopline" style={{ marginTop: 6 }}>
            <span>{shop.district}</span>
            {shop.verified && <Verified />}
            {shop.is_demo && <span className="pill" data-s="plain">Sample shop</span>}
          </div>
          {shop.about && <p>{shop.about}</p>}
          <p className="note">On Keithel since {formatDate(shop.created_at)}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="panel empty"><h3>No products yet</h3><p>This shop has not listed anything.</p></div>
      ) : (
        <div className="grid">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </>
  );
}
