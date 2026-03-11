import type { Metadata } from "next";
import { fetchAPI, SITE_URL, ogImage } from "@/lib/seo";

interface PageData {
  title: string;
  slug: string;
  excerpt?: string;
  meta_description?: string;
  featured_image?: string;
  og_image?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchAPI<PageData>(`/api/p/pages/${slug}`);
  if (!page) return {};

  const description = page.meta_description || page.excerpt || "";
  const image = page.og_image || page.featured_image;

  return {
    title: page.title,
    description,
    openGraph: {
      title: page.title,
      description,
      url: `${SITE_URL}/${slug}`,
      images: ogImage(image),
    },
    twitter: {
      title: page.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
