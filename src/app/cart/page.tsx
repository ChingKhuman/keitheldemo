import type { Metadata } from "next";
import CartClient from "@/components/CartClient";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Your cart" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await getUser();
  return (
    <>
      <div className="lead">
        <div>
          <h1>Your cart</h1>
          <p>Items from different sellers become separate orders, one per shop.</p>
        </div>
      </div>
      <CartClient viewer={user ? { name: user.name, phone: user.phone } : null} />
    </>
  );
}
