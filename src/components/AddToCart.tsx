"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart";

export default function AddToCart({ id }: { id: string }) {
  const [added, setAdded] = useState(false);
  return (
    <div className="row">
      <button
        type="button"
        className="btn primary"
        onClick={() => {
          addToCart(id);
          setAdded(true);
        }}
      >
        Add to cart
      </button>
      {added && (
        <span role="status" className="muted">
          Added. <a href="/cart">View cart</a>
        </span>
      )}
    </div>
  );
}
