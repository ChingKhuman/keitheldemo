"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { ORDER_STATUSES } from "@/lib/format";

export function SellerStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div className="row" style={{ marginTop: 10 }}>
      <label htmlFor={`st-${id}`} className="muted">Status</label>
      <select
        id={`st-${id}`}
        value={status}
        onChange={async (e) => {
          const res = await api(`/api/orders/${id}`, "PATCH", { status: e.target.value });
          if (res.ok) router.refresh();
          else setError(res.error);
        }}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </select>
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}

export function BuyerCancel({ id }: { id: string }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [error, setError] = useState("");
  async function cancel() {
    const res = await api(`/api/orders/${id}`, "PATCH", { status: "cancelled" });
    if (res.ok) router.refresh();
    else setError(res.error);
  }
  return (
    <div className="row" style={{ marginTop: 8 }}>
      {ask ? (
        <>
          <span className="muted">Cancel this order?</span>
          <button type="button" className="link danger" onClick={cancel}>Yes, cancel</button>
          <button type="button" className="link" onClick={() => setAsk(false)}>Keep it</button>
        </>
      ) : (
        <button type="button" className="link danger" onClick={() => setAsk(true)}>Cancel order</button>
      )}
      {error && <span className="error" role="alert">{error}</span>}
    </div>
  );
}
