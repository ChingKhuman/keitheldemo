"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearCart, setQty, useCart } from "@/lib/cart";
import { api } from "@/lib/client";
import { rupees } from "@/lib/format";

type Item = { id: string; title: string; price_paise: number; sold_out: boolean; shop_id: string; shop_name: string; photo_id: string | null };
type Viewer = { name: string; phone: string } | null;

export default function CartClient({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const cart = useCart();
  const ids = Object.keys(cart);
  const key = ids.sort().join(",");
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    if (!key) {
      setItems([]);
      return;
    }
    api("/api/cart/quote", "POST", { ids: key.split(",") }).then((r) => {
      if (live) setItems(r.ok ? (r.data.items as Item[]) : []);
    });
    return () => {
      live = false;
    };
  }, [key]);

  const lines = useMemo(() => (items ?? []).filter((i) => cart[i.id]), [items, cart]);
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; items: Item[] }>();
    for (const i of lines) {
      const g = m.get(i.shop_id) ?? { name: i.shop_name, items: [] };
      g.items.push(i);
      m.set(i.shop_id, g);
    }
    return [...m.entries()];
  }, [lines]);
  const orderable = lines.filter((i) => !i.sold_out);
  const total = orderable.reduce((a, i) => a + i.price_paise * (cart[i.id] ?? 0), 0);

  async function place(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const res = await api("/api/orders", "POST", {
      name: f.get("name"),
      phone: f.get("phone"),
      address: f.get("address"),
      payment: f.get("payment"),
      items: orderable.map((i) => ({ id: i.id, qty: cart[i.id] })),
    });
    if (res.ok) {
      clearCart();
      router.push("/orders");
      router.refresh();
      return;
    }
    setError(res.error);
    setBusy(false);
  }

  if (items === null) return <div className="panel empty"><p>Loading your cart.</p></div>;
  if (!lines.length) {
    return (
      <div className="panel empty">
        <h3>Your cart is empty</h3>
        <p>Find something you like and add it here.</p>
        <Link className="btn primary" href="/">Browse products</Link>
      </div>
    );
  }

  return (
    <>
      {groups.map(([shopId, g]) => (
        <div className="panel group" style={{ marginBottom: 16 }} key={shopId}>
          <h3>{g.name}</h3>
          <div className="rows">
            {g.items.map((i) => (
              <div className="line" key={i.id}>
                <div className="thumb">
                  {i.photo_id ? <img src={`/api/photos/${i.photo_id}`} alt="" /> : <div className="ph">{i.title.charAt(0)}</div>}
                </div>
                <div className="n">
                  <Link href={`/product/${i.id}`}>{i.title}</Link>
                  <div className="muted num">{i.sold_out ? "Sold out" : `${rupees(i.price_paise)} each`}</div>
                </div>
                <div className="row">
                  {!i.sold_out && (
                    <div className="qty">
                      <button type="button" aria-label="Fewer" onClick={() => setQty(i.id, (cart[i.id] ?? 1) - 1)}>−</button>
                      <span className="num">{cart[i.id]}</span>
                      <button type="button" aria-label="More" onClick={() => setQty(i.id, (cart[i.id] ?? 1) + 1)}>+</button>
                    </div>
                  )}
                  <button type="button" className="link" onClick={() => setQty(i.id, 0)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="row end" style={{ marginBottom: 16 }}>
        <span className="muted">Total, delivery charges agreed with each seller</span>
        <b className="price num">{rupees(total)}</b>
      </div>

      {!viewer ? (
        <div className="panel empty">
          <h3>Sign in to place your order</h3>
          <p>Your cart is saved on this device. Sign in or create an account to check out.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn primary" href="/login?next=/cart">Sign in</Link>
            <Link className="btn" href="/register?next=/cart">Create an account</Link>
          </div>
        </div>
      ) : (
        <form className="panel form" onSubmit={place}>
          <h2 style={{ fontSize: 18 }}>Delivery details</h2>
          <div className="g2">
            <label htmlFor="c-name">
              Your name
              <input id="c-name" name="name" type="text" maxLength={80} required defaultValue={viewer.name} autoComplete="name" />
            </label>
            <label htmlFor="c-phone">
              Phone number
              <input id="c-phone" name="phone" type="tel" maxLength={16} required defaultValue={viewer.phone} autoComplete="tel" />
            </label>
          </div>
          <label htmlFor="c-addr">
            Delivery address
            <textarea id="c-addr" name="address" maxLength={300} required placeholder="House, locality, landmark, district" />
          </label>
          <div className="pay" role="radiogroup" aria-label="Payment method">
            <label>
              <input type="radio" name="payment" value="cod" defaultChecked />
              <span><b>Cash on delivery</b><br /><span className="muted">Pay the seller when the order arrives.</span></span>
            </label>
            <label>
              <input type="radio" name="payment" value="upi" />
              <span><b>UPI to the seller</b><br /><span className="muted">After you order, pay to the seller&apos;s UPI ID shown on your order.</span></span>
            </label>
          </div>
          <p className="note">Card and UPI checkout through a payment gateway comes in a later version.</p>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="row end">
            <button className="btn primary" type="submit" disabled={busy || !orderable.length}>
              {busy ? "Placing order" : "Place order"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
