import type { Metadata } from "next";
import { fetchAPI, SITE_URL } from "@/lib/seo";

interface EventTypeData {
  name: string;
  slug: string;
  description?: string;
  duration_minutes?: number;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const et = await fetchAPI<EventTypeData>(
    `/api/p/booking/event-types/${slug}`
  );
  if (!et) return {};

  const description =
    et.description || `Book a ${et.duration_minutes || 30}-minute session`;

  return {
    title: `Book: ${et.name}`,
    description,
    openGraph: {
      title: et.name,
      description,
      url: `${SITE_URL}/book/${slug}`,
    },
    twitter: {
      title: et.name,
      description,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
