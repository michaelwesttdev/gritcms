import type { Metadata } from "next";
import { fetchAPI, SITE_URL, ogImage } from "@/lib/seo";

interface ProductData {
  name: string;
  slug: string;
  description?: string;
  images?: string[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchAPI<ProductData>(`/api/p/products/${slug}`);
  if (!product) return {};

  const description = product.description || "";
  const image = product.images?.[0];

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      url: `${SITE_URL}/products/${slug}`,
      images: ogImage(image),
    },
    twitter: {
      title: product.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
