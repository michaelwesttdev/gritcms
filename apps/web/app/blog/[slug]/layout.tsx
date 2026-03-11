import type { Metadata } from "next";
import { fetchAPI, SITE_URL, ogImage } from "@/lib/seo";

interface BlogPost {
  title: string;
  slug: string;
  excerpt?: string;
  meta_description?: string;
  featured_image?: string;
  og_image?: string;
  published_at?: string;
  author?: { first_name: string; last_name: string };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchAPI<BlogPost>(`/api/p/posts/${slug}`);
  if (!post) return {};

  const description = post.meta_description || post.excerpt || "";
  const image = post.og_image || post.featured_image;
  const author = post.author
    ? `${post.author.first_name} ${post.author.last_name}`.trim()
    : undefined;

  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      url: `${SITE_URL}/blog/${slug}`,
      type: "article",
      publishedTime: post.published_at,
      authors: author ? [author] : undefined,
      images: ogImage(image),
    },
    twitter: {
      title: post.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
