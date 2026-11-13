"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function CartLink() {
  const cart = useCart();
  const n = Object.values(cart).reduce((a, b) => a + b, 0);
  return (
    <Link href="/cart">
      Cart{n > 0 && <span className="badge">{n}</span>}
    </Link>
  );
}
