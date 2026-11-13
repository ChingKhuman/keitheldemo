import { formatDate, rupees, statusLabel } from "@/lib/format";
import type { OrderRow } from "@/lib/queries";
import CopyButton from "./CopyButton";
import { BuyerCancel, SellerStatus } from "./OrderControls";

export default function OrderCard({ o, as }: { o: OrderRow; as: "buyer" | "seller" }) {
  const open = o.status !== "cancelled" && o.status !== "delivered";
  return (
    <div className="order">
      <div className="top">
        <b>Order #{o.id.slice(0, 6).toUpperCase()}</b>
        <span className="muted">{formatDate(o.created_at)}</span>
        <span className="pill" data-s={o.status}>{statusLabel(o.status)}</span>
      </div>
      <div className="items">
        {o.items.map((i, n) => (
          <div key={n}>
            {i.qty} × {i.title} <span className="muted num">{rupees(i.price_paise * i.qty)}</span>
          </div>
        ))}
      </div>
      <div>
        <b className="num">Total {rupees(o.total_paise)}</b>
        <span className="muted"> · {o.payment === "upi" ? "UPI to seller" : "Cash on delivery"}</span>
      </div>
      {as === "seller" ? (
        <>
          <div className="who">{o.buyer_name} · {o.buyer_phone} · {o.address}</div>
          <SellerStatus id={o.id} status={o.status} />
        </>
      ) : (
        <>
          <div className="who">Sold by {o.shop_name} · {o.shop_phone}</div>
          {o.payment === "upi" && open &&
            (o.shop_upi ? (
              <div className="row" style={{ marginTop: 8 }}>
                <span className="num">Pay {rupees(o.total_paise)} to UPI ID {o.shop_upi}</span>
                <CopyButton text={o.shop_upi} label="Copy UPI ID" />
              </div>
            ) : (
              <p className="note">This seller has not added a UPI ID. Contact them to arrange payment.</p>
            ))}
          {o.status === "new" && <BuyerCancel id={o.id} />}
        </>
      )}
    </div>
  );
}
