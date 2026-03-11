import type { Metadata } from "next";
import { fetchAPI, SITE_URL } from "@/lib/seo";

interface SpaceData {
  name: string;
  slug: string;
  description?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const space = await fetchAPI<SpaceData>(`/api/p/community/spaces/${slug}`);
  if (!space) return {};

  return {
    title: space.name,
    description: space.description || `Join the ${space.name} community space`,
    openGraph: {
      title: space.name,
      description: space.description || `Join the ${space.name} community space`,
      url: `${SITE_URL}/community/${slug}`,
    },
    twitter: {
      title: space.name,
      description: space.description || `Join the ${space.name} community space`,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
