import type { Metadata } from "next";
import { fetchAPI, SITE_URL } from "@/lib/seo";

interface FunnelData {
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
  const funnel = await fetchAPI<FunnelData>(`/api/p/funnels/${slug}`);
  if (!funnel) return {};

  return {
    title: funnel.name,
    description: funnel.description || "",
    openGraph: {
      title: funnel.name,
      description: funnel.description || "",
      url: `${SITE_URL}/f/${slug}`,
    },
    twitter: {
      title: funnel.name,
      description: funnel.description || "",
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
