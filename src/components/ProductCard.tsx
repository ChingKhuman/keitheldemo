import Link from "next/link";
import { rupees } from "@/lib/format";
import type { ProductCard as Card } from "@/lib/queries";
import Verified from "./Verified";

export default function ProductCard({ p }: { p: Card }) {
  return (
    <Link className="card" href={`/product/${p.id}`}>
      <div className="img">
        {p.photo_id ? (
          <img src={`/api/photos/${p.photo_id}`} alt="" loading="lazy" />
        ) : (
          <div className="ph" aria-hidden="true">{p.title.charAt(0).toUpperCase()}</div>
        )}
        {p.sold_out ? <span className="tag">Sold out</span> : p.hidden ? <span className="tag">Hidden</span> : null}
      </div>
      <h3>{p.title}</h3>
      <span className="price num">{rupees(p.price_paise)}</span>
      <span className="shopline">
        <span>
          {p.shop_name} · {p.district}
        </span>
        {p.verified && <Verified />}
      </span>
    </Link>
  );
}
