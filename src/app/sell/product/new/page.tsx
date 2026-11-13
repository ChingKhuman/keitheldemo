import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Add a product" };
export const dynamic = "force-dynamic";

export default async function NewProduct() {
  const user = await getUser();
  if (!user) redirect("/login?next=/sell/product/new");
  if (!user.shopId) redirect("/sell");
  return (
    <>
      <div className="lead"><div><h1>Add a product</h1><p>Photos first, then the name and price. It goes live as soon as you publish.</p></div></div>
      <ProductForm />
    </>
  );
}
