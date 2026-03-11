import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${name} — Blog`,
    description: `Browse blog posts in the ${name} category.`,
    openGraph: {
      title: `${name} — Blog`,
      description: `Browse blog posts in the ${name} category.`,
      url: `${SITE_URL}/blog/category/${slug}`,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
