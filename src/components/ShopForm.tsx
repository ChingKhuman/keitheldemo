"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { DISTRICTS } from "@/lib/format";

type Initial = { name: string; district: string; phone: string; upi: string; about: string };

export default function ShopForm({ initial, isNew }: { initial?: Initial; isNew: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const res = await api("/api/shop", "POST", Object.fromEntries(f.entries()));
    if (res.ok) {
      window.location.href = isNew ? "/sell/product/new" : "/sell";
      return;
    }
    setError(res.error);
    setBusy(false);
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="g2">
        <label htmlFor="s-name">
          Shop name
          <input id="s-name" name="name" type="text" maxLength={60} required defaultValue={initial?.name} placeholder="For example, Ibemhal Handloom" />
        </label>
        <label htmlFor="s-district">
          District
          <select id="s-district" name="district" defaultValue={initial?.district ?? DISTRICTS[0]}>
            {DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="g2">
        <label htmlFor="s-phone">
          Phone number buyers can reach
          <input id="s-phone" name="phone" type="tel" maxLength={16} required defaultValue={initial?.phone} placeholder="10-digit mobile number" />
        </label>
        <label htmlFor="s-upi">
          UPI ID (optional)
          <input id="s-upi" name="upi" type="text" maxLength={60} defaultValue={initial?.upi} placeholder="name@bank" />
        </label>
      </div>
      <label htmlFor="s-about">
        About your shop
        <textarea id="s-about" name="about" maxLength={400} defaultValue={initial?.about} placeholder="What you make or sell, and how long you have been doing it." />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row end">
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Saving" : isNew ? "Open my shop" : "Save shop"}
        </button>
      </div>
    </form>
  );
}
