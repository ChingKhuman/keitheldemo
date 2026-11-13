import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel empty">
      <h3>We could not find that page</h3>
      <p>The link may be old, or the product may have been removed.</p>
      <Link className="btn primary" href="/">Back to the shop</Link>
    </div>
  );
}
