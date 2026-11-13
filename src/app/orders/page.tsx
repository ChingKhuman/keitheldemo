import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import OrderCard from "@/components/OrderCard";
import { getUser } from "@/lib/auth";
import { ordersForBuyer } from "@/lib/queries";

export const metadata: Metadata = { title: "My orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/orders");
  const orders = await ordersForBuyer(user.id);
  return (
    <>
      <div className="lead">
        <div>
          <h1>My orders</h1>
          <p>Orders you have placed, with their current status.</p>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="panel empty">
          <h3>No orders yet</h3>
          <p>Orders you place will appear here with their status.</p>
          <Link className="btn primary" href="/">Browse products</Link>
        </div>
      ) : (
        <div className="panel rows">
          {orders.map((o) => (
            <OrderCard key={o.id} o={o} as="buyer" />
          ))}
        </div>
      )}
    </>
  );
}
