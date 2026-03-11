import type { Metadata } from "next";
import { fetchAPI, SITE_URL, ogImage } from "@/lib/seo";

interface GuideData {
  title: string;
  slug: string;
  description?: string;
  cover_image?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await fetchAPI<GuideData>(`/api/p/guides/${slug}`);
  if (!guide) return {};

  return {
    title: guide.title,
    description: guide.description || "",
    openGraph: {
      title: guide.title,
      description: guide.description || "",
      url: `${SITE_URL}/guides/${slug}`,
      images: ogImage(guide.cover_image),
    },
    twitter: {
      title: guide.title,
      description: guide.description || "",
      images: guide.cover_image ? [guide.cover_image] : undefined,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
