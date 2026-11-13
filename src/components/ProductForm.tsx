"use client";

import { useState } from "react";
import { api, shrinkPhoto } from "@/lib/client";
import { CATEGORIES } from "@/lib/format";

type Initial = { id: string; title: string; price: string; category: string; description: string; photoIds: string[] };
type NewPhoto = { blob: Blob; url: string };

const MAX = 4;

export default function ProductForm({ initial }: { initial?: Initial }) {
  const [keep, setKeep] = useState<string[]>(initial?.photoIds ?? []);
  const [fresh, setFresh] = useState<NewPhoto[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError("");
    for (const file of files) {
      if (keep.length + fresh.length >= MAX) {
        setError(`You can add up to ${MAX} photos.`);
        break;
      }
      try {
        const blob = await shrinkPhoto(file);
        setFresh((prev) => (prev.length + keep.length >= MAX ? prev : [...prev, { blob, url: URL.createObjectURL(blob) }]));
      } catch {
        setError("One photo could not be read. Try a JPEG or PNG from your phone.");
      }
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (keep.length + fresh.length < 1) return setError("Add at least one photo.");
    const f = new FormData(e.currentTarget);
    const body = new FormData();
    for (const k of ["title", "price", "category", "description"]) body.set(k, String(f.get(k) ?? ""));
    keep.forEach((id) => body.append("keep", id));
    fresh.forEach((p, i) => body.append("photos", p.blob, `photo-${i}.jpg`));
    setBusy(true);
    setError("");
    const res = await api(initial ? `/api/products/${initial.id}` : "/api/products", initial ? "PATCH" : "POST", body);
    if (res.ok) {
      window.location.href = "/sell";
      return;
    }
    setError(res.error);
    setBusy(false);
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <label className="drop" htmlFor="p-file">
        <b>Add photos</b>
        <span>Take a photo or choose up to {MAX} from your phone</span>
        <input id="p-file" type="file" accept="image/*" multiple onChange={pick} />
      </label>
      <div className="strip">
        {keep.map((id) => (
          <div className="ph1" key={id}>
            <img src={`/api/photos/${id}`} alt="Saved photo" />
            <button type="button" aria-label="Remove this photo" onClick={() => setKeep((k) => k.filter((x) => x !== id))}>×</button>
          </div>
        ))}
        {fresh.map((p, i) => (
          <div className="ph1" key={p.url}>
            <img src={p.url} alt={`New photo ${i + 1}`} />
            <button type="button" aria-label="Remove this photo" onClick={() => setFresh((x) => x.filter((_, n) => n !== i))}>×</button>
          </div>
        ))}
      </div>
      <label htmlFor="p-title">
        Product name
        <input id="p-title" name="title" type="text" maxLength={100} required defaultValue={initial?.title} placeholder="For example, Hand-woven Phanek, red and black" />
      </label>
      <div className="g2">
        <label htmlFor="p-price">
          Price in rupees
          <input id="p-price" name="price" type="number" inputMode="decimal" min="1" step="0.01" required defaultValue={initial?.price} placeholder="0" />
        </label>
        <label htmlFor="p-cat">
          Category
          <select id="p-cat" name="category" defaultValue={initial?.category ?? CATEGORIES[0]}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label htmlFor="p-desc">
        Description
        <textarea id="p-desc" name="description" maxLength={1200} defaultValue={initial?.description} placeholder="Size, material, colour, how long it takes to make, anything a buyer should know." />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row end">
        <a className="btn" href="/sell">Cancel</a>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Saving" : initial ? "Save changes" : "Publish product"}
        </button>
      </div>
    </form>
  );
}
