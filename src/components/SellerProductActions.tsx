"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export default function SellerProductActions({ id, soldOut }: { id: string; soldOut: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");

  async function run(p: Promise<Awaited<ReturnType<typeof api>>>) {
    const res = await p;
    if (res.ok) router.refresh();
    else setError(res.error);
  }

  return (
    <div className="row" style={{ marginTop: 6 }}>
      <a className="link" href={`/sell/product/${id}/edit`}>Edit</a>
      <button type="button" className="link" onClick={() => run(api(`/api/products/${id}`, "PATCH", { soldOut: !soldOut }))}>
        {soldOut ? "Mark available" : "Mark sold out"}
      </button>
      {confirm ? (
        <span className="row">
          <span className="muted">Remove this product?</span>
          <button type="button" className="link danger" onClick={() => run(api(`/api/products/${id}`, "DELETE"))}>Yes, remove</button>
          <button type="button" className="link" onClick={() => setConfirm(false)}>Cancel</button>
        </span>
      ) : (
        <button type="button" className="link danger" onClick={() => setConfirm(true)}>Remove</button>
      )}
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}
