import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES, DISTRICTS } from "@/lib/format";
import { listProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

type SP = { q?: string; category?: string; district?: string; sort?: string; page?: string };

function href(sp: SP, patch: Partial<SP>): string {
  const merged = { ...sp, ...patch };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const category = (CATEGORIES as readonly string[]).includes(sp.category ?? "") ? sp.category : undefined;
  const district = (DISTRICTS as readonly string[]).includes(sp.district ?? "") ? sp.district : undefined;
  const sort = sp.sort === "low" || sp.sort === "high" ? sp.sort : "new";
  const page = Math.max(1, Math.min(500, parseInt(sp.page ?? "1", 10) || 1));
  const { items, hasMore } = await listProducts({ q, category, district, sort, page });
  const filtered = Boolean(q || category || district);
  const base: SP = { q: q || undefined, category, district, sort: sort === "new" ? undefined : sort };

  return (
    <>
      <div className="lead">
        <div>
          <h1>Shop from sellers across Manipur</h1>
          <p>Handloom, local food, crafts and everyday goods, listed by people from their own homes and shops.</p>
        </div>
        <Link className="btn primary" href="/sell">Sell something</Link>
      </div>

      <nav className="chips" aria-label="Categories">
        <Link className="chip" href={href(base, { category: undefined, page: undefined })} aria-current={!category}>All</Link>
        {CATEGORIES.map((c) => (
          <Link key={c} className="chip" href={href(base, { category: c, page: undefined })} aria-current={category === c}>
            {c}
          </Link>
        ))}
      </nav>

      <div className="tools">
        <form action="/" method="get">
          {q && <input type="hidden" name="q" value={q} />}
          {category && <input type="hidden" name="category" value={category} />}
          <select name="district" defaultValue={district ?? ""} aria-label="Filter by district">
            <option value="">All districts</option>
            {DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select name="sort" defaultValue={sort} aria-label="Sort products">
            <option value="new">Newest</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
          <button className="btn sm" type="submit">Apply</button>
        </form>
        {q && <span className="muted">Results for “{q}”</span>}
      </div>

      {items.length === 0 ? (
        <div className="panel empty">
          {filtered ? (
            <>
              <h3>Nothing matches</h3>
              <p>Try a different category, district or search word.</p>
              <Link className="btn" href="/">Clear filters</Link>
            </>
          ) : (
            <>
              <h3>No products yet</h3>
              <p>Keithel is just opening. Be the first seller: add a product with a few photos and a price, and buyers will see it here.</p>
              <Link className="btn primary" href="/sell">Open your shop</Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <div className="pager">
          {page > 1 && <Link className="btn" href={href(base, { page: String(page - 1) })}>Previous</Link>}
          {hasMore && <Link className="btn" href={href(base, { page: String(page + 1) })}>Next</Link>}
        </div>
      )}
    </>
  );
}
