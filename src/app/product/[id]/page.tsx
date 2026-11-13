import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/AddToCart";
import Gallery from "@/components/Gallery";
import Verified from "@/components/Verified";
import { getUser } from "@/lib/auth";
import { formatDate, rupees } from "@/lib/format";
import { getProduct } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getProduct(id);
  if (!p || p.hidden) return { title: "Product not found" };
  const desc = p.description.slice(0, 160) || `${p.title} from ${p.shop_name}, ${p.district}.`;
  return {
    title: p.title,
    description: desc,
    openGraph: { title: p.title, description: desc, images: p.photo_id ? [`/api/photos/${p.photo_id}`] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const [p, user] = await Promise.all([getProduct(id), getUser()]);
  if (!p || (p.hidden && !user?.isAdmin)) notFound();
  const mine = user?.id === p.shop_user_id;

  // Structured data helps Google show price and availability for each product.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.description || undefined,
    image: p.photo_id ? [`/api/photos/${p.photo_id}`] : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (p.price_paise / 100).toFixed(2),
      availability: p.sold_out ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
  };

  return (
    <>
      <Link className="btn sm crumb" href="/">Back to all products</Link>
      <div className="detail">
        <Gallery photoIds={p.photo_ids} title={p.title} />
        <div className="info">
          <div className="row">
            <span className="pill" data-s="plain">{p.category}</span>
            {p.hidden && <span className="pill" data-s="hidden">Hidden by admin</span>}
          </div>
          <h1>{p.title}</h1>
          <div className="price num">{rupees(p.price_paise)}</div>
          {p.sold_out ? (
            <button className="btn" disabled>Sold out</button>
          ) : p.hidden ? (
            <button className="btn" disabled>Not available</button>
          ) : mine ? (
            <p className="note">This is your listing. <Link href="/sell">Manage it from the Sell page.</Link></p>
          ) : (
            <AddToCart id={p.id} />
          )}
          {p.description && <p className="desc">{p.description}</p>}
          <div className="box">
            <h3><Link href={`/shop/${p.shop_id}`}>{p.shop_name}</Link></h3>
            <div className="shopline">
              <span>{p.district}</span>
              {p.verified && <Verified />}
            </div>
            {p.shop_about && <p className="note">{p.shop_about}</p>}
            <p className="note">Contact: {p.shop_phone}</p>
            <p className="note">Listed {formatDate(p.created_at)}</p>
          </div>
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
