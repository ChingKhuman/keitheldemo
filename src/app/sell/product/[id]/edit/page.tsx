import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import { getUser } from "@/lib/auth";
import { getProduct } from "@/lib/queries";

export const metadata: Metadata = { title: "Edit product" };
export const dynamic = "force-dynamic";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?next=/sell/product/${id}/edit`);
  const p = await getProduct(id);
  // A product that is not yours looks the same as one that does not exist.
  if (!p || p.shop_user_id !== user.id) notFound();
  return (
    <>
      <div className="lead"><div><h1>Edit product</h1></div></div>
      <ProductForm
        initial={{
          id: p.id,
          title: p.title,
          price: String(p.price_paise / 100),
          category: p.category,
          description: p.description,
          photoIds: p.photo_ids,
        }}
      />
    </>
  );
}
