import type { Metadata } from "next";
import { fetchAPI, SITE_URL, ogImage } from "@/lib/seo";

interface CourseData {
  title: string;
  slug: string;
  short_description?: string;
  description?: string;
  thumbnail?: string;
  instructor?: { first_name: string; last_name: string };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await fetchAPI<CourseData>(`/api/p/courses/${slug}`);
  if (!course) return {};

  const description = course.short_description || course.description || "";

  return {
    title: course.title,
    description,
    openGraph: {
      title: course.title,
      description,
      url: `${SITE_URL}/courses/${slug}`,
      images: ogImage(course.thumbnail),
    },
    twitter: {
      title: course.title,
      description,
      images: course.thumbnail ? [course.thumbnail] : undefined,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
